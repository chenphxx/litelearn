use crate::backup;
use crate::config::{self, DbConfig};
use crate::db::{self, AppState};
use crate::models::{
    DeletedSnippet, ExportSummary, ImportSummary, SearchResult, Snippet, SqlAnalysis, SqlResult, StackInfo,
};
use mysql::prelude::Queryable;
use mysql::{QueryResult, Text, Value};
use tauri::{AppHandle, State};

/** 默认分页大小 */
const DEFAULT_PAGE_SIZE: u32 = 50;

/** 最大分页大小 */
const MAX_PAGE_SIZE: u32 = 200;

/** 片段查询字段 */
const SNIPPET_FIELDS: &str = concat!(
    "p.id, p.stack_id, p.zh_index, p.en_index, p.content, ",
    "DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at, ",
    "DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at"
);

/** 片段查询行数据类型 */
type SnippetRow = (u64, u32, String, String, String, String, String);

/** @brief 关键词限定的检索字段 */
enum SearchField
{
    /** 全部字段 */
    All,
    /** 中文索引 */
    Chinese,
    /** 英文索引 */
    English,
    /** 正文 */
    Content,
}

/**
 * @brief 将数据行映射为片段结构
 *
 * @param row 数据行
 * @return 片段结构
 */
fn map_snippet(row: SnippetRow) -> Snippet
{
    let (id, stack_id, zh_index, en_index, content, created_at, updated_at) = row;
    Snippet
    {
        id,
        stack_id,
        zh_index,
        en_index,
        content,
        created_at,
        updated_at,
    }
}

/**
 * @brief 解析关键词的字段限定前缀
 *
 * 支持 zh: / en: / content: 三种前缀, 其中 code: 为兼容旧用法的别名, 无前缀时检索全部字段
 *
 * @param keyword 原始关键词
 * @return 限定字段与去掉前缀后的关键词
 */
fn split_keyword(keyword: &str) -> (SearchField, String)
{
    let keyword = keyword.trim();
    let lowered = keyword.to_lowercase();
    let prefixes = [
        ("zh:", SearchField::Chinese),
        ("en:", SearchField::English),
        ("content:", SearchField::Content),
        ("code:", SearchField::Content),
    ];
    for (prefix, field) in prefixes
    {
        if lowered.starts_with(prefix)
        {
            return (field, keyword[prefix.len()..].trim().to_string());
        }
    }
    (SearchField::All, keyword.to_string())
}

/**
 * @brief 校验技术栈名称
 *
 * @param name 技术栈名称
 * @return 去空格后的名称
 */
fn validate_stack_name(name: &str) -> Result<String, String>
{
    let name = name.trim().to_string();
    if name.is_empty()
    {
        return Err(String::from("技术栈名称不能为空"));
    }
    if name.chars().count() > 64
    {
        return Err(String::from("技术栈名称过长, 最多 64 个字符"));
    }
    Ok(name)
}

/**
 * @brief 校验数据库配置合法性
 *
 * @param config 数据库配置
 * @return 无
 */
fn validate_config(config: &DbConfig) -> Result<(), String>
{
    if config.host.trim().is_empty()
    {
        return Err(String::from("数据库地址不能为空"));
    }
    if config.port == 0
    {
        return Err(String::from("端口号无效"));
    }
    if config.user.trim().is_empty()
    {
        return Err(String::from("用户名不能为空"));
    }
    let database = config.database.trim();
    if database.is_empty()
    {
        return Err(String::from("数据库名不能为空"));
    }
    if database.contains('`') || database.contains(';') || database.contains('"') || database.contains('\'')
    {
        return Err(String::from("数据库名包含非法字符"));
    }
    Ok(())
}

/**
 * @brief 查询技术栈列表
 *
 * @param state 应用状态
 * @return 技术栈列表
 */
#[tauri::command]
pub async fn list_stacks(state: State<'_, AppState>) -> Result<Vec<StackInfo>, String>
{
    let mut conn = db::get_conn(&state)?;
    conn.exec_map(
        "SELECT s.id, s.name, s.description, COUNT(p.id) AS count \
         FROM stacks s LEFT JOIN snippets p ON p.stack_id = s.id AND p.deleted_at IS NULL \
         GROUP BY s.id, s.name, s.description ORDER BY s.name",
        (),
        |(id, name, description, count)| StackInfo
        {
            id,
            name,
            description,
            count,
        },
    )
    .map_err(|error| error.to_string())
}

/**
 * @brief 根据技术栈与关键词检索代码片段
 *
 * stack_id 为空时检索全部技术栈; 关键词支持 zh: / en: / content: 前缀限定字段;
 * 关键词为空或为 000 时查询全部数据; 纯数字关键词会额外匹配片段编号
 *
 * @param state 应用状态
 * @param stack_id 技术栈编号, 为空表示全部技术栈
 * @param keyword 搜索关键词
 * @param sort 排序方式, 支持 id_asc / id_desc / updated_asc / updated_desc
 * @param offset 起始位置
 * @param limit 每页数量, 0 表示使用默认值
 * @return 检索结果与总数
 */
#[tauri::command]
pub async fn search_snippets(
    state: State<'_, AppState>,
    stack_id: Option<u32>,
    keyword: String,
    sort: String,
    offset: u32,
    limit: u32,
) -> Result<SearchResult, String>
{
    let (field, keyword) = split_keyword(&keyword);
    let mut where_sql = String::from(" WHERE p.deleted_at IS NULL");
    let mut params: Vec<Value> = Vec::new();

    if let Some(id) = stack_id
    {
        where_sql.push_str(" AND p.stack_id = ?");
        params.push(Value::from(id));
    }

    if !keyword.is_empty() && keyword != "000"
    {
        let like = format!("%{}%", keyword);
        match field
        {
            SearchField::Chinese =>
            {
                where_sql.push_str(" AND p.zh_index LIKE ?");
                params.push(Value::from(like));
            }
            SearchField::English =>
            {
                where_sql.push_str(" AND p.en_index LIKE ?");
                params.push(Value::from(like));
            }
            SearchField::Content =>
            {
                where_sql.push_str(" AND p.content LIKE ?");
                params.push(Value::from(like));
            }
            SearchField::All =>
            {
                where_sql.push_str(
                    " AND (p.zh_index LIKE ? OR p.en_index LIKE ? OR p.content LIKE ?",
                );
                for _ in 0..3
                {
                    params.push(Value::from(like.clone()));
                }
                if let Ok(number) = keyword.parse::<u64>()
                {
                    where_sql.push_str(" OR p.id = ?");
                    params.push(Value::from(number));
                }
                where_sql.push(')');
            }
        }
    }

    let order_sql = match sort.as_str()
    {
        "id_desc" => " ORDER BY p.id DESC",
        "updated_asc" => " ORDER BY p.updated_at ASC, p.id ASC",
        "updated_desc" => " ORDER BY p.updated_at DESC, p.id DESC",
        _ => " ORDER BY p.id ASC",
    };

    let mut conn = db::get_conn(&state)?;
    let total: u64 = conn
        .exec_first(
            format!("SELECT COUNT(*) FROM snippets p{}", where_sql),
            params.clone(),
        )
        .map_err(|error| error.to_string())?
        .unwrap_or(0);

    let page_size = if limit == 0 { DEFAULT_PAGE_SIZE } else { limit.min(MAX_PAGE_SIZE) };
    let mut page_params = params;
    page_params.push(Value::from(page_size));
    page_params.push(Value::from(offset));
    let items = conn
        .exec_map(
            format!(
                "SELECT {} FROM snippets p{}{} LIMIT ? OFFSET ?",
                SNIPPET_FIELDS, where_sql, order_sql
            ),
            page_params,
            map_snippet,
        )
        .map_err(|error| error.to_string())?;

    Ok(SearchResult { items, total })
}

/**
 * @brief 新建技术栈
 *
 * @param state 应用状态
 * @param name 技术栈名称
 * @param description 技术栈描述
 * @return 新技术栈编号
 */
#[tauri::command]
pub async fn create_stack(
    state: State<'_, AppState>,
    name: String,
    description: String,
) -> Result<u64, String>
{
    let name = validate_stack_name(&name)?;
    let mut conn = db::get_conn(&state)?;
    conn.exec_drop(
        "INSERT INTO stacks (name, description) VALUES (?, ?)",
        (name, description.trim().to_string()),
    )
    .map_err(|error| map_duplicate_stack_error(error.to_string()))?;
    Ok(conn.last_insert_id())
}

/**
 * @brief 修改技术栈名称与描述
 *
 * @param state 应用状态
 * @param id 技术栈编号
 * @param name 技术栈名称
 * @param description 技术栈描述
 * @return 受影响行数
 */
#[tauri::command]
pub async fn update_stack(
    state: State<'_, AppState>,
    id: u32,
    name: String,
    description: String,
) -> Result<u64, String>
{
    let name = validate_stack_name(&name)?;
    let mut conn = db::get_conn(&state)?;
    conn.exec_drop(
        "UPDATE stacks SET name = ?, description = ? WHERE id = ?",
        (name, description.trim().to_string(), id),
    )
    .map_err(|error| map_duplicate_stack_error(error.to_string()))?;
    Ok(conn.affected_rows())
}

/**
 * @brief 删除技术栈, 其下片段由外键级联删除
 *
 * @param state 应用状态
 * @param id 技术栈编号
 * @return 受影响行数
 */
#[tauri::command]
pub async fn delete_stack(state: State<'_, AppState>, id: u32) -> Result<u64, String>
{
    let mut conn = db::get_conn(&state)?;
    conn.exec_drop("DELETE FROM stacks WHERE id = ?", (id,))
        .map_err(|error| error.to_string())?;
    Ok(conn.affected_rows())
}

/**
 * @brief 将数据库重复名称错误转换为可读提示
 *
 * @param message 原始错误信息
 * @return 提示信息
 */
fn map_duplicate_stack_error(message: String) -> String
{
    if message.contains("Duplicate entry")
    {
        String::from("技术栈已存在")
    }
    else
    {
        message
    }
}

/**
 * @brief 新增文章
 *
 * @param state 应用状态
 * @param stack_id 技术栈编号
 * @param zh_index 中文索引
 * @param en_index 英文索引
 * @param content 正文
 * @return 新片段编号
 */
#[tauri::command]
pub async fn add_snippet(
    state: State<'_, AppState>,
    stack_id: u32,
    zh_index: String,
    en_index: String,
    content: String,
) -> Result<u64, String>
{
    if content.trim().is_empty()
    {
        return Err(String::from("正文不能为空"));
    }
    if zh_index.trim().is_empty() && en_index.trim().is_empty()
    {
        return Err(String::from("中文索引与英文索引至少填写一项"));
    }

    let mut conn = db::get_conn(&state)?;
    conn.exec_drop(
        concat!(
            "INSERT INTO snippets (stack_id, zh_index, en_index, content) ",
            "VALUES (?, ?, ?, ?)"
        ),
        (
            stack_id,
            zh_index.trim().to_string(),
            en_index.trim().to_string(),
            content,
        ),
    )
    .map_err(|error| error.to_string())?;
    Ok(conn.last_insert_id())
}

/**
 * @brief 更新文章
 *
 * @param state 应用状态
 * @param id 片段编号
 * @param zh_index 中文索引
 * @param en_index 英文索引
 * @param content 正文
 * @return 受影响行数
 */
#[tauri::command]
pub async fn update_snippet(
    state: State<'_, AppState>,
    id: u64,
    zh_index: String,
    en_index: String,
    content: String,
) -> Result<u64, String>
{
    let mut conn = db::get_conn(&state)?;
    conn.exec_drop(
        concat!(
            "UPDATE snippets SET zh_index = ?, en_index = ?, content = ? ",
            "WHERE id = ? AND deleted_at IS NULL"
        ),
        (
            zh_index.trim().to_string(),
            en_index.trim().to_string(),
            content,
            id,
        ),
    )
    .map_err(|error| error.to_string())?;
    Ok(conn.affected_rows())
}

/**
 * @brief 将文章移入回收站
 *
 * @param state 应用状态
 * @param id 片段编号
 * @return 受影响行数
 */
#[tauri::command]
pub async fn delete_snippet(state: State<'_, AppState>, id: u64) -> Result<u64, String>
{
    let mut conn = db::get_conn(&state)?;
    conn.exec_drop(
        "UPDATE snippets SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
        (id,),
    )
    .map_err(|error| error.to_string())?;
    Ok(conn.affected_rows())
}

/**
 * @brief 查询回收站中的文章
 *
 * @param state 应用状态
 * @return 回收站片段列表
 */
#[tauri::command]
pub async fn list_deleted_snippets(state: State<'_, AppState>) -> Result<Vec<DeletedSnippet>, String>
{
    let mut conn = db::get_conn(&state)?;
    conn.exec_map(
        "SELECT p.id, k.name, p.zh_index, p.en_index, \
         DATE_FORMAT(p.deleted_at, '%Y-%m-%d %H:%i:%s') AS deleted_at \
         FROM snippets p JOIN stacks k ON k.id = p.stack_id \
         WHERE p.deleted_at IS NOT NULL ORDER BY p.deleted_at DESC",
        (),
        |(id, stack_name, zh_index, en_index, deleted_at)| DeletedSnippet
        {
            id,
            stack_name,
            zh_index,
            en_index,
            deleted_at,
        },
    )
    .map_err(|error| error.to_string())
}

/**
 * @brief 从回收站还原文章
 *
 * @param state 应用状态
 * @param id 片段编号
 * @return 受影响行数
 */
#[tauri::command]
pub async fn restore_snippet(state: State<'_, AppState>, id: u64) -> Result<u64, String>
{
    let mut conn = db::get_conn(&state)?;
    conn.exec_drop(
        "UPDATE snippets SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL",
        (id,),
    )
    .map_err(|error| error.to_string())?;
    Ok(conn.affected_rows())
}

/**
 * @brief 彻底删除单个片段
 *
 * @param state 应用状态
 * @param id 片段编号
 * @return 受影响行数
 */
#[tauri::command]
pub async fn purge_snippet(state: State<'_, AppState>, id: u64) -> Result<u64, String>
{
    let mut conn = db::get_conn(&state)?;
    conn.exec_drop("DELETE FROM snippets WHERE id = ?", (id,))
        .map_err(|error| error.to_string())?;
    Ok(conn.affected_rows())
}

/**
 * @brief 清空回收站
 *
 * @param state 应用状态
 * @return 受影响行数
 */
#[tauri::command]
pub async fn purge_all_deleted(state: State<'_, AppState>) -> Result<u64, String>
{
    let mut conn = db::get_conn(&state)?;
    conn.exec_drop("DELETE FROM snippets WHERE deleted_at IS NOT NULL", ())
        .map_err(|error| error.to_string())?;
    Ok(conn.affected_rows())
}

/**
 * @brief 导出备份文件
 *
 * @param state 应用状态
 * @param format 导出格式, json 或 csv
 * @param path 保存路径
 * @return 导出统计
 */
#[tauri::command]
pub async fn export_backup(
    state: State<'_, AppState>,
    format: String,
    path: String,
) -> Result<ExportSummary, String>
{
    let format = format.trim().to_lowercase();
    if format != "json" && format != "csv"
    {
        return Err(String::from("不支持的导出格式, 仅支持 json / csv"));
    }
    let path = path.trim().to_string();
    if path.is_empty()
    {
        return Err(String::from("保存路径不能为空"));
    }

    let mut conn = db::get_conn(&state)?;
    let output = backup::export(&mut conn, &format)?;
    std::fs::write(&path, output.content).map_err(|error| format!("写入文件失败: {}", error))?;
    Ok(ExportSummary
    {
        stacks: output.stacks,
        snippets: output.snippets,
    })
}

/**
 * @brief 导出单个片段为 Markdown 文件
 *
 * @param state 应用状态
 * @param id 片段编号
 * @param path 保存路径
 * @param language 代码块语言标记
 * @return 无
 */
#[tauri::command]
pub async fn export_snippet(
    state: State<'_, AppState>,
    id: u64,
    path: String,
    language: String,
) -> Result<(), String>
{
    let path = path.trim().to_string();
    if path.is_empty()
    {
        return Err(String::from("保存路径不能为空"));
    }
    let mut conn = db::get_conn(&state)?;
    let content = backup::export_snippet_markdown(&mut conn, id, &language)?;
    std::fs::write(&path, content).map_err(|error| format!("写入文件失败: {}", error))
}

/**
 * @brief 预览备份导入结果, 不修改数据库
 *
 * @param state 应用状态
 * @param format 备份格式
 * @param path 备份文件路径
 * @param overwrite 编号冲突时是否覆盖
 * @return 导入统计
 */
#[tauri::command]
pub async fn preview_import(
    state: State<'_, AppState>,
    format: String,
    path: String,
    overwrite: bool,
) -> Result<ImportSummary, String>
{
    let (format, content) = read_backup_file(&format, &path)?;
    let mut conn = db::get_conn(&state)?;
    backup::preview(&mut conn, &format, &content, overwrite)
}

/**
 * @brief 导入备份文件
 *
 * @param state 应用状态
 * @param format 备份格式
 * @param path 备份文件路径
 * @param overwrite 编号冲突时是否覆盖
 * @return 导入统计
 */
#[tauri::command]
pub async fn import_backup(
    state: State<'_, AppState>,
    format: String,
    path: String,
    overwrite: bool,
) -> Result<ImportSummary, String>
{
    let (format, content) = read_backup_file(&format, &path)?;
    let mut conn = db::get_conn(&state)?;
    backup::apply(&mut conn, &format, &content, overwrite)
}

/**
 * @brief 校验备份格式并读取文件内容
 *
 * @param format 备份格式
 * @param path 备份文件路径
 * @return 格式与文件内容
 */
fn read_backup_file(format: &str, path: &str) -> Result<(String, String), String>
{
    let format = format.trim().to_lowercase();
    if format != "json" && format != "csv"
    {
        return Err(String::from("不支持的导入格式, 仅支持 json / csv"));
    }
    let path = path.trim();
    if path.is_empty()
    {
        return Err(String::from("文件路径不能为空"));
    }
    let content = std::fs::read_to_string(path).map_err(|error| format!("读取文件失败: {}", error))?;
    Ok((format, content))
}

/**
 * @brief 获取当前数据库配置
 *
 * @param state 应用状态
 * @return 数据库配置
 */
#[tauri::command]
pub async fn get_config(state: State<'_, AppState>) -> Result<DbConfig, String>
{
    state
        .config
        .lock()
        .map(|guard| guard.clone())
        .map_err(|_| String::from("配置状态异常"))
}

/**
 * @brief 检查当前连接是否可用
 *
 * @param state 应用状态
 * @return MySQL 版本号
 */
#[tauri::command]
pub async fn check_connection(state: State<'_, AppState>) -> Result<String, String>
{
    let mut conn = db::get_conn(&state)?;
    let version: String = conn
        .query_first("SELECT VERSION()")
        .map_err(|error| error.to_string())?
        .unwrap_or_else(|| String::from("未知版本"));
    Ok(version)
}

/**
 * @brief 测试数据库连接
 *
 * @param state 应用状态
 * @param config 数据库配置
 * @return MySQL 版本号
 */
#[tauri::command]
pub async fn test_connection(
    state: State<'_, AppState>,
    config: DbConfig,
) -> Result<String, String>
{
    validate_config(&config)?;
    let _ = &state;
    let pool = db::create_pool(&config)?;
    let mut conn = pool.get_conn().map_err(|error| error.to_string())?;
    let version: String = conn
        .query_first("SELECT VERSION()")
        .map_err(|error| error.to_string())?
        .unwrap_or_else(|| String::from("未知版本"));
    Ok(version)
}

/**
 * @brief 保存数据库配置并重新连接
 *
 * @param app 应用句柄
 * @param state 应用状态
 * @param config 数据库配置
 * @return 无
 */
#[tauri::command]
pub async fn save_config(
    app: AppHandle,
    state: State<'_, AppState>,
    config: DbConfig,
) -> Result<(), String>
{
    validate_config(&config)?;
    // 先测试连接, 成功后才允许保存
    let _pool = db::create_pool(&config)?;
    config::save(&app, &config)?;
    *state
        .config
        .lock()
        .map_err(|_| String::from("配置状态异常"))? = config;
    state.reset_pool();
    Ok(())
}

/**
 * @brief 分析 SQL 语句类型
 *
 * 供前端判断是否需要二次确认, 以及只读模式下是否允许执行
 *
 * @param sql SQL 语句
 * @return 分析结果
 */
#[tauri::command]
pub async fn analyze_sql(sql: String) -> Result<SqlAnalysis, String>
{
    let sql = sql.trim().to_string();
    if sql.is_empty()
    {
        return Err(String::from("SQL 语句不能为空"));
    }
    Ok(SqlAnalysis
    {
        readonly: is_readonly_statement(&sql),
        dangerous: is_dangerous_statement(&sql),
    })
}
/**
 * @brief 执行 SQL 语句
 *
 * @param state 应用状态
 * @param sql SQL 语句
 * @param readonly 只读模式, 仅允许查询语句
 * @return 执行结果
 */
#[tauri::command]
pub async fn execute_sql(
    state: State<'_, AppState>,
    sql: String,
    readonly: bool,
) -> Result<SqlResult, String>
{
    let sql = sql.trim().to_string();
    if sql.is_empty()
    {
        return Err(String::from("SQL 语句不能为空"));
    }
    if readonly && !is_readonly_statement(&sql)
    {
        return Err(String::from("只读模式下仅允许执行 SELECT / SHOW / DESC / EXPLAIN 语句"));
    }

    let mut conn = db::get_conn(&state)?;
    let mut result: QueryResult<Text> = conn.query_iter(&sql).map_err(|error| error.to_string())?;
    let columns: Vec<String> = result
        .columns()
        .as_ref()
        .iter()
        .map(|column| column.name_str().to_string())
        .collect();
    let mut rows: Vec<Vec<String>> = Vec::new();
    for row in result.by_ref()
    {
        let row = row.map_err(|error| error.to_string())?;
        let values: Vec<String> = row
            .unwrap()
            .iter()
            .map(|value| value.as_sql(false))
            .collect();
        rows.push(values);
    }
    let affected = result.affected_rows();
    Ok(SqlResult
    {
        columns,
        rows,
        affected,
    })
}

/**
 * @brief 判断是否为只读语句
 *
 * @param sql SQL 语句
 * @return 是否为只读语句
 */
fn is_readonly_statement(sql: &str) -> bool
{
    let first = sql.split_whitespace().next().unwrap_or("").to_uppercase();
    ["SELECT", "SHOW", "DESC", "DESCRIBE", "EXPLAIN", "WITH"].contains(&first.as_str())
}

/**
 * @brief 判断 SQL 是否属于需要二次确认的危险操作
 *
 * @param sql SQL 语句
 * @return 是否需要确认
 */
fn is_dangerous_statement(sql: &str) -> bool
{
    let upper = sql.to_uppercase();
    let first = upper.split_whitespace().next().unwrap_or("");
    if ["DROP", "TRUNCATE", "ALTER", "RENAME", "GRANT", "REVOKE"].contains(&first)
    {
        return true;
    }
    if (first == "DELETE" || first == "UPDATE") && !upper.contains(" WHERE ")
    {
        return true;
    }
    false
}

#[cfg(test)]
mod tests
{
    use super::*;
    use crate::db::create_pool;

    /**
     * @brief 构造测试数据库配置
     *
     * 连接参数与 db 模块测试保持一致, 均取自环境变量, 避免误连其它数据库
     *
     * @return 测试数据库配置
     */
    fn test_config() -> DbConfig
    {
        let password = std::env::var("LITELEARN_DB_PASSWORD").unwrap_or_default();
        DbConfig
        {
            host: std::env::var("LITELEARN_DB_HOST").unwrap_or_else(|_| String::from("127.0.0.1")),
            port: std::env::var("LITELEARN_DB_PORT")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(3306),
            user: std::env::var("LITELEARN_DB_USER").unwrap_or_else(|_| String::from("root")),
            password,
            database: String::from("litelearn_test"),
        }
    }

    /**
     * @brief 备份导入往返测试
     *
     * 需要本机 MySQL 服务, 通过环境变量 LITELEARN_RUN_DB_TEST=1 触发;
     * 测试在独立的 litelearn_test 数据库中进行, 结束后自动删除
     */
    #[test]
    fn test_import_round_trip()
    {
        if std::env::var("LITELEARN_RUN_DB_TEST").is_err()
            || std::env::var("LITELEARN_DB_PASSWORD").is_err()
        {
            return;
        }
        let config = test_config();
        let pool = create_pool(&config).expect("连接测试数据库失败");
        let mut conn = pool.get_conn().expect("获取连接失败");

        // 清空测试数据
        conn.query_drop("DELETE FROM snippets").expect("清空片段失败");
        conn.query_drop("DELETE FROM stacks").expect("清空技术栈失败");

        // JSON 导入: 与导出格式保持一致
        let json = r#"{
            "exported_at": "2026-08-11 10:00:00",
            "stacks": [
                { "id": 1, "name": "TestStack", "description": "测试技术栈" }
            ],
            "snippets": [
                {
                    "id": 100,
                    "stack_id": 1,
                    "zh_index": "测试索引",
                    "en_index": "test",
                    "code_snippet": "println!(\"hello\");",
                    "zh_comment": "中文说明",
                    "created_at": "2024-09-20 12:34:56",
                    "updated_at": "2024-09-20 12:34:56"
                }
            ]
        }"#;

        // 预览不应写入数据
        let preview = backup::preview(&mut conn, "json", json, false).expect("预览失败");
        assert_eq!(preview.stacks_created, 1);
        assert_eq!(preview.snippets_imported, 1);
        let count: u64 = conn
            .query_first("SELECT COUNT(*) FROM snippets")
            .expect("统计片段失败")
            .unwrap_or(0);
        assert_eq!(count, 0);

        let summary = backup::apply(&mut conn, "json", json, false).expect("JSON 导入失败");
        assert_eq!(summary.stacks_created, 1);
        assert_eq!(summary.snippets_imported, 1);

        // 重复导入应全部跳过(幂等)
        let summary2 = backup::apply(&mut conn, "json", json, false).expect("JSON 重复导入失败");
        assert_eq!(summary2.stacks_existed, 1);
        assert_eq!(summary2.snippets_skipped, 1);
        assert_eq!(summary2.snippets_imported, 0);

        // 覆盖导入应更新已有片段
        let summary3 = backup::apply(&mut conn, "json", json, true).expect("JSON 覆盖导入失败");
        assert_eq!(summary3.snippets_updated, 1);

        // 旧版 JSON 中的中文说明应合并到正文
        let content: String = conn
            .query_first("SELECT content FROM snippets WHERE id = 100")
            .expect("查询内容失败")
            .expect("片段不存在");
        assert_eq!(content, "println!(\"hello\");\n\n中文说明");

        // 验证描述与时间已还原
        let description: String = conn
            .query_first("SELECT description FROM stacks WHERE name = 'TestStack'")
            .expect("查询描述失败")
            .expect("技术栈不存在");
        assert_eq!(description, "测试技术栈");
        let created: String = conn
            .query_first(
                "SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') FROM snippets WHERE id = 100",
            )
            .expect("查询时间失败")
            .expect("片段不存在");
        assert_eq!(created, "2024-09-20 12:34:56");

        // 软删除后检索不到, 还原后重新可见
        conn.query_drop("UPDATE snippets SET deleted_at = NOW() WHERE id = 100")
            .expect("移入回收站失败");
        let total: u64 = conn
            .query_first("SELECT COUNT(*) FROM snippets WHERE deleted_at IS NULL")
            .expect("统计失败")
            .unwrap_or(0);
        assert_eq!(total, 0);
        conn.query_drop("UPDATE snippets SET deleted_at = NULL WHERE id = 100")
            .expect("还原失败");

        // CSV 导入: 验证引号包裹与逗号字段
        let csv = "stack_name,id,zh_index,en_index,content,created_at,updated_at\n\
                   TestStackCsv,200,中文,en2,\"code, with comma\",2024-09-20 12:34:56,2024-09-20 12:34:56\n";
        let summary_csv = backup::apply(&mut conn, "csv", csv, false).expect("CSV 导入失败");
        assert_eq!(summary_csv.stacks_created, 1);
        assert_eq!(summary_csv.snippets_imported, 1);
        let code: String = conn
            .query_first("SELECT content FROM snippets WHERE id = 200")
            .expect("查询代码失败")
            .expect("片段不存在");
        assert_eq!(code, "code, with comma");

        // 旧版 CSV (code_snippet 与 zh_comment 两列) 应合并为正文导入
        let legacy_csv = "stack_name,id,zh_index,en_index,code_snippet,zh_comment,created_at,updated_at\n\
                          TestStackLegacy,300,旧索引,legacy,old code,旧说明,2024-09-20 12:34:56,2024-09-20 12:34:56\n";
        let summary_legacy = backup::apply(&mut conn, "csv", legacy_csv, false).expect("旧版 CSV 导入失败");
        assert_eq!(summary_legacy.stacks_created, 1);
        assert_eq!(summary_legacy.snippets_imported, 1);
        let merged: String = conn
            .query_first("SELECT content FROM snippets WHERE id = 300")
            .expect("查询合并内容失败")
            .expect("片段不存在");
        assert_eq!(merged, "old code\n\n旧说明");

        // 关键词与字段限定解析
        assert!(matches!(split_keyword("zh:索引").0, SearchField::Chinese));
        assert!(matches!(split_keyword("content:fn").0, SearchField::Content));
        assert!(matches!(split_keyword("code:fn").0, SearchField::Content));
        assert!(matches!(split_keyword("普通关键词").0, SearchField::All));
        assert!(is_readonly_statement("select * from snippets"));
        assert!(!is_readonly_statement("delete from snippets"));
        assert!(is_dangerous_statement("DROP TABLE snippets"));
        assert!(is_dangerous_statement("DELETE FROM snippets"));

        // 清理测试数据库: 使用不指定数据库的连接, 避免触碰其它数据库
        drop(conn);
        drop(pool);
        let cleanup_pool = mysql::Pool::new(db::build_opts(&config, false))
            .expect("连接数据库服务失败");
        let mut cleanup_conn = cleanup_pool.get_conn().expect("获取清理连接失败");
        cleanup_conn
            .query_drop("DROP DATABASE IF EXISTS litelearn_test")
            .expect("删除测试数据库失败");
    }
}
