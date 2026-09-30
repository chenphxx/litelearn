use crate::config::DbConfig;
use mysql::prelude::Queryable;
use mysql::{Opts, OptsBuilder, Pool, PooledConn};
use std::sync::Mutex;

/** 技术栈表建表语句 */
const CREATE_STACKS_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS stacks (
    id          INT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '技术栈编号',
    name        VARCHAR(64)   NOT NULL                COMMENT '技术栈名称, 唯一',
    description VARCHAR(255)  NOT NULL DEFAULT ''     COMMENT '技术栈描述',
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_stacks_name (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '技术栈表'"#;

/** 文章表建表语句 */
const CREATE_SNIPPETS_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS snippets (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '文章编号, 兼容旧版 number_index',
    stack_id     INT UNSIGNED    NOT NULL                COMMENT '所属技术栈, 外键',
    zh_index     VARCHAR(128)    NOT NULL DEFAULT ''     COMMENT '中文索引',
    en_index     VARCHAR(128)    NOT NULL DEFAULT ''     COMMENT '英文索引',
    content      MEDIUMTEXT      NOT NULL                COMMENT '正文, 以文章形式记录知识点',
    created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at   DATETIME        NULL DEFAULT NULL       COMMENT '删除时间, 非空表示已移入回收站',
    PRIMARY KEY (id),
    KEY idx_snippets_stack_zh (stack_id, zh_index),
    KEY idx_snippets_stack_en (stack_id, en_index),
    KEY idx_snippets_stack_deleted (stack_id, deleted_at),
    CONSTRAINT fk_snippets_stack
        FOREIGN KEY (stack_id) REFERENCES stacks (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '文章表'"#;

/**
 * @brief 应用全局状态
 */
pub struct AppState
{
    /** 数据库连接配置 */
    pub config: Mutex<DbConfig>,
    /** 数据库连接池, 懒加载 */
    pub pool: Mutex<Option<Pool>>,
}

impl AppState
{
    /**
     * @brief 创建应用状态
     *
     * @param config 数据库连接配置
     * @return 应用状态
     */
    pub fn new(config: DbConfig) -> Self
    {
        AppState
        {
            config: Mutex::new(config),
            pool: Mutex::new(None),
        }
    }

    /**
     * @brief 获取数据库连接池, 不存在时按当前配置创建
     *
     * @return 数据库连接池
     */
    pub fn get_pool(&self) -> Result<Pool, String>
    {
        let mut guard = self.pool.lock().map_err(|_| String::from("连接池状态异常"))?;
        if let Some(pool) = guard.as_ref()
        {
            return Ok(pool.clone());
        }
        let config = self
            .config
            .lock()
            .map_err(|_| String::from("配置状态异常"))?
            .clone();
        let pool = create_pool(&config)?;
        *guard = Some(pool.clone());
        Ok(pool)
    }

    /**
     * @brief 重置连接池, 使下次操作按新配置重新连接
     *
     * @return 无
     */
    pub fn reset_pool(&self)
    {
        if let Ok(mut guard) = self.pool.lock()
        {
            *guard = None;
        }
    }
}

/**
 * @brief 根据配置构建连接参数
 *
 * @param config 数据库配置
 * @param with_db 是否指定数据库
 * @return 连接参数
 */
pub(crate) fn build_opts(config: &DbConfig, with_db: bool) -> Opts
{
    let mut builder = OptsBuilder::new()
        .ip_or_hostname(Some(config.host.clone()))
        .tcp_port(config.port)
        .user(Some(config.user.clone()))
        .pass(Some(config.password.clone()));
    if with_db
    {
        builder = builder.db_name(Some(config.database.clone()));
    }
    builder.into()
}

/**
 * @brief 查询数据表字段的数据类型
 *
 * @param conn 数据库连接
 * @param table 表名
 * @param column 字段名
 * @return 字段类型, 字段不存在时为空
 */
fn column_type(conn: &mut PooledConn, table: &str, column: &str) -> Result<Option<String>, String>
{
    conn.exec_first(
        concat!(
            "SELECT DATA_TYPE FROM information_schema.columns ",
            "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?"
        ),
        (table, column),
    )
    .map_err(|error| error.to_string())
}

/**
 * @brief 判断数据表字段是否存在
 *
 * @param conn 数据库连接
 * @param table 表名
 * @param column 字段名
 * @return 是否存在
 */
fn column_exists(conn: &mut PooledConn, table: &str, column: &str) -> Result<bool, String>
{
    let count: u64 = conn
        .exec_first(
            concat!(
                "SELECT COUNT(*) FROM information_schema.columns ",
                "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?"
            ),
            (table, column),
        )
        .map_err(|error| error.to_string())?
        .unwrap_or(0);
    Ok(count > 0)
}

/**
 * @brief 判断数据表索引是否存在
 *
 * @param conn 数据库连接
 * @param table 表名
 * @param index 索引名
 * @return 是否存在
 */
fn index_exists(conn: &mut PooledConn, table: &str, index: &str) -> Result<bool, String>
{
    let count: u64 = conn
        .exec_first(
            concat!(
                "SELECT COUNT(*) FROM information_schema.statistics ",
                "WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?"
            ),
            (table, index),
        )
        .map_err(|error| error.to_string())?
        .unwrap_or(0);
    Ok(count > 0)
}

/**
 * @brief 补齐旧版本数据库缺失的字段与索引
 *
 * 旧版本正文列名为 code_snippet, 首次运行改名为 content, 正文类型统一为 MEDIUMTEXT;
 * 旧版本将中文说明单独存放, 首次运行并入正文后删除该列;
 * 旧版本没有 deleted_at 字段, 首次运行自动补充, 保证数据不丢失
 *
 * @param conn 数据库连接
 * @return 无
 */
fn ensure_schema(conn: &mut PooledConn) -> Result<(), String>
{
    if column_exists(conn, "snippets", "code_snippet")? && !column_exists(conn, "snippets", "content")?
    {
        conn.query_drop(concat!(
            "ALTER TABLE snippets CHANGE COLUMN code_snippet content ",
            "MEDIUMTEXT NOT NULL COMMENT '正文, 以文章形式记录知识点'"
        ))
        .map_err(|error| error.to_string())?;
    }
    else if let Some(data_type) = column_type(conn, "snippets", "content")?
    {
        if data_type != "mediumtext"
        {
            conn.query_drop(concat!(
                "ALTER TABLE snippets MODIFY COLUMN content ",
                "MEDIUMTEXT NOT NULL COMMENT '正文, 以文章形式记录知识点'"
            ))
            .map_err(|error| error.to_string())?;
        }
    }
    if column_exists(conn, "snippets", "zh_comment")?
    {
        conn.query_drop(concat!(
            "UPDATE snippets SET content = ",
            "CONCAT(content, IF(content = '', '', '\\n\\n'), zh_comment) ",
            "WHERE zh_comment <> ''"
        ))
        .map_err(|error| error.to_string())?;
        conn.query_drop("ALTER TABLE snippets DROP COLUMN zh_comment")
            .map_err(|error| error.to_string())?;
    }
    if !column_exists(conn, "snippets", "deleted_at")?
    {
        conn.query_drop(concat!(
            "ALTER TABLE snippets ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL ",
            "COMMENT '删除时间, 非空表示已移入回收站' AFTER updated_at"
        ))
        .map_err(|error| error.to_string())?;
    }
    if !index_exists(conn, "snippets", "idx_snippets_stack_deleted")?
    {
        conn.query_drop("ALTER TABLE snippets ADD INDEX idx_snippets_stack_deleted (stack_id, deleted_at)")
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

/**
 * @brief 根据配置创建连接池, 并初始化数据库与表结构
 *
 * @param config 数据库配置
 * @return 数据库连接池
 */
pub fn create_pool(config: &DbConfig) -> Result<Pool, String>
{
    // 1. 先连接服务器(不指定数据库), 确保目标数据库存在
    let bootstrap_pool = Pool::new(build_opts(config, false)).map_err(|error| error.to_string())?;
    let mut bootstrap_conn = bootstrap_pool
        .get_conn()
        .map_err(|error| error.to_string())?;
    bootstrap_conn
        .query_drop(format!(
            "CREATE DATABASE IF NOT EXISTS `{}` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci",
            config.database
        ))
        .map_err(|error| error.to_string())?;
    drop(bootstrap_conn);

    // 2. 连接目标数据库, 初始化表结构并补齐旧版本缺失的字段
    let pool = Pool::new(build_opts(config, true)).map_err(|error| error.to_string())?;
    let mut conn = pool.get_conn().map_err(|error| error.to_string())?;
    conn.query_drop(CREATE_STACKS_SQL)
        .map_err(|error| error.to_string())?;
    conn.query_drop(CREATE_SNIPPETS_SQL)
        .map_err(|error| error.to_string())?;
    ensure_schema(&mut conn)?;
    Ok(pool)
}

/**
 * @brief 获取一条数据库连接
 *
 * @param state 应用状态
 * @return 数据库连接
 */
pub fn get_conn(state: &AppState) -> Result<PooledConn, String>
{
    let pool = state.get_pool()?;
    pool.get_conn().map_err(|error| error.to_string())
}


#[cfg(test)]
mod tests
{
    use super::*;

    /**
     * @brief 读取数据库测试配置
     *
     * 测试需要本机 MySQL 服务, 通过环境变量 LITELEARN_RUN_DB_TEST 与 LITELEARN_DB_PASSWORD 触发
     *
     * @return 测试数据库配置
     */
    fn test_config() -> DbConfig
    {
        DbConfig
        {
            host: std::env::var("LITELEARN_DB_HOST").unwrap_or_else(|_| String::from("127.0.0.1")),
            port: std::env::var("LITELEARN_DB_PORT")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(3306),
            user: std::env::var("LITELEARN_DB_USER").unwrap_or_else(|_| String::from("root")),
            password: std::env::var("LITELEARN_DB_PASSWORD").unwrap_or_default(),
            database: String::from("litelearn_migration_test"),
        }
    }

    /**
     * @brief 旧版表结构迁移测试
     *
     * 构造含 code_snippet 与 zh_comment 且没有 deleted_at 的旧表, 首次连接时应自动补齐结构并合并正文
     */
    #[test]
    fn test_legacy_schema_migration()
    {
        if std::env::var("LITELEARN_RUN_DB_TEST").is_err()
            || std::env::var("LITELEARN_DB_PASSWORD").is_err()
        {
            return;
        }
        let config = test_config();

        // 1. 重建测试数据库
        let bootstrap_pool = Pool::new(build_opts(&config, false)).expect("连接数据库服务失败");
        let mut bootstrap_conn = bootstrap_pool.get_conn().expect("获取连接失败");
        bootstrap_conn
            .query_drop("DROP DATABASE IF EXISTS `litelearn_migration_test`")
            .expect("清理测试库失败");
        bootstrap_conn
            .query_drop("CREATE DATABASE `litelearn_migration_test` DEFAULT CHARACTER SET utf8mb4")
            .expect("创建测试库失败");
        drop(bootstrap_conn);

        // 2. 构造旧版表结构与旧数据
        let legacy_pool = Pool::new(build_opts(&config, true)).expect("连接测试库失败");
        let mut legacy_conn = legacy_pool.get_conn().expect("获取连接失败");
        legacy_conn
            .query_drop(concat!(
                "CREATE TABLE stacks (",
                "id INT UNSIGNED NOT NULL AUTO_INCREMENT,",
                "name VARCHAR(64) NOT NULL,",
                "description VARCHAR(255) NOT NULL DEFAULT '',",
                "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,",
                "PRIMARY KEY (id), UNIQUE KEY uk_stacks_name (name)",
                ") ENGINE = InnoDB DEFAULT CHARSET = utf8mb4"
            ))
            .expect("创建旧版技术栈表失败");
        legacy_conn
            .query_drop(concat!(
                "CREATE TABLE snippets (",
                "id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,",
                "stack_id INT UNSIGNED NOT NULL,",
                "zh_index VARCHAR(128) NOT NULL DEFAULT '',",
                "en_index VARCHAR(128) NOT NULL DEFAULT '',",
                "code_snippet MEDIUMTEXT NOT NULL,",
                "zh_comment MEDIUMTEXT NOT NULL,",
                "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,",
                "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,",
                "PRIMARY KEY (id)",
                ") ENGINE = InnoDB DEFAULT CHARSET = utf8mb4"
            ))
            .expect("创建旧版文章表失败");
        legacy_conn
            .exec_drop(
                "INSERT INTO stacks (id, name, description) VALUES (1, 'C', '')",
                (),
            )
            .expect("写入技术栈失败");
        legacy_conn
            .exec_drop(
                concat!(
                    "INSERT INTO snippets ",
                    "(id, stack_id, zh_index, en_index, code_snippet, zh_comment) ",
                    "VALUES (1, 1, '字符类型', 'char', 'char val = 0;', '占用一个字节')"
                ),
                (),
            )
            .expect("写入旧版内容失败");
        drop(legacy_conn);
        drop(legacy_pool);

        // 3. 首次连接触发建表与迁移
        let pool = create_pool(&config).expect("初始化数据库失败");
        let mut conn = pool.get_conn().expect("获取连接失败");
        let content: String = conn
            .query_first("SELECT content FROM snippets WHERE id = 1")
            .expect("查询正文失败")
            .expect("旧数据丢失");
        assert_eq!(content, "char val = 0;\n\n占用一个字节");
        let legacy_columns: u64 = conn
            .exec_first(
                concat!(
                    "SELECT COUNT(*) FROM information_schema.columns ",
                    "WHERE table_schema = DATABASE() AND table_name = 'snippets' ",
                    "AND column_name IN ('code_snippet', 'zh_comment')"
                ),
                (),
            )
            .expect("查询字段失败")
            .unwrap_or(0);
        assert_eq!(legacy_columns, 0);
        let deleted_column: u64 = conn
            .exec_first(
                concat!(
                    "SELECT COUNT(*) FROM information_schema.columns ",
                    "WHERE table_schema = DATABASE() AND table_name = 'snippets' ",
                    "AND column_name = 'deleted_at'"
                ),
                (),
            )
            .expect("查询字段失败")
            .unwrap_or(0);
        assert_eq!(deleted_column, 1);
        let deleted_index: u64 = conn
            .exec_first(
                concat!(
                    "SELECT COUNT(DISTINCT index_name) FROM information_schema.statistics ",
                    "WHERE table_schema = DATABASE() AND table_name = 'snippets' ",
                    "AND index_name = 'idx_snippets_stack_deleted'"
                ),
                (),
            )
            .expect("查询索引失败")
            .unwrap_or(0);
        assert_eq!(deleted_index, 1);
        let content_type: String = conn
            .exec_first(
                concat!(
                    "SELECT DATA_TYPE FROM information_schema.columns ",
                    "WHERE table_schema = DATABASE() AND table_name = 'snippets' ",
                    "AND column_name = 'content'"
                ),
                (),
            )
            .expect("查询字段类型失败")
            .expect("正文字段不存在");
        assert_eq!(content_type, "mediumtext");

        // 4. 清理测试数据库
        drop(conn);
        drop(pool);
        let cleanup_pool = Pool::new(build_opts(&config, false)).expect("连接数据库服务失败");
        let mut cleanup_conn = cleanup_pool.get_conn().expect("获取连接失败");
        cleanup_conn
            .query_drop("DROP DATABASE IF EXISTS `litelearn_migration_test`")
            .expect("清理测试库失败");
    }
}
