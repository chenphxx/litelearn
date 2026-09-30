use serde::{Deserialize, Serialize};

/**
 * @brief 技术栈信息
 */
#[derive(Serialize, Clone)]
pub struct StackInfo
{
    /** 技术栈编号 */
    pub id: u32,
    /** 技术栈名称 */
    pub name: String,
    /** 技术栈描述 */
    pub description: String,
    /** 片段数量 */
    pub count: u64,
}

/**
 * @brief 检索结果
 */
#[derive(Serialize)]
pub struct SearchResult
{
    /** 当前页片段列表 */
    pub items: Vec<Snippet>,
    /** 符合条件的结果总数 */
    pub total: u64,
}

/**
 * @brief 回收站中的文章
 */
#[derive(Serialize)]
pub struct DeletedSnippet
{
    /** 片段编号 */
    pub id: u64,
    /** 所属技术栈名称 */
    pub stack_name: String,
    /** 中文索引 */
    pub zh_index: String,
    /** 英文索引 */
    pub en_index: String,
    /** 删除时间 */
    pub deleted_at: String,
}

/**
 * @brief 备份导出结果统计
 */
#[derive(Serialize)]
pub struct ExportSummary
{
    /** 技术栈数量 */
    pub stacks: usize,
    /** 片段数量 */
    pub snippets: usize,
}

/**
 * @brief 备份导入统计, 预览与执行共用
 */
#[derive(Serialize, Default)]
pub struct ImportSummary
{
    /** 新建技术栈数量 */
    pub stacks_created: usize,
    /** 已存在的技术栈数量 */
    pub stacks_existed: usize,
    /** 导入片段数量 */
    pub snippets_imported: usize,
    /** 覆盖更新的片段数量 */
    pub snippets_updated: usize,
    /** 跳过的片段数量(编号冲突且未开启覆盖, 或缺少技术栈) */
    pub snippets_skipped: usize,
}

/** @brief JSON 备份中的技术栈数据 */
#[derive(Serialize, Deserialize)]
pub struct BackupStack
{
    /** 技术栈编号 */
    #[serde(default)]
    pub id: u32,
    /** 技术栈名称 */
    #[serde(default)]
    pub name: String,
    /** 技术栈描述 */
    #[serde(default)]
    pub description: String,
}

/**
 * @brief JSON 备份数据
 */
#[derive(Serialize)]
pub struct BackupData
{
    /** 导出时间 */
    pub exported_at: String,
    /** 技术栈列表 */
    pub stacks: Vec<StackInfo>,
    /** 片段列表 */
    pub snippets: Vec<Snippet>,
}
