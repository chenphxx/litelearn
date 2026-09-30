use crate::models::{BackupData, BackupStack, ImportSummary, Snippet, StackInfo};
use mysql::prelude::Queryable;
use mysql::{PooledConn, Value};
use serde::Deserialize;
use std::collections::HashMap;

/** CSV 表头 */
const CSV_HEADER: &str = "stack_name,id,zh_index,en_index,content,created_at,updated_at";

/** @brief 备份导出结果 */
pub struct ExportOutput
{
    /** 导出内容 */
    pub content: String,
    /** 技术栈数量 */
    pub stacks: usize,
    /** 片段数量 */
    pub snippets: usize,
}

/** @brief 解析后的技术栈数据 */
struct ParsedStack
{
    /** 技术栈名称 */
    name: String,
    /** 技术栈描述 */
    description: String,
}

/** @brief 解析后的片段数据 */
#[derive(Clone)]
struct ParsedSnippet
{
    /** 片段编号, 0 表示由数据库分配 */
    id: u64,
    /** 所属技术栈名称 */
    stack_name: String,
    /** 中文索引 */
    zh_index: String,
    /** 英文索引 */
    en_index: String,
    /** 正文 */
    content: String,
    /** 创建时间 */
    created_at: String,
    /** 更新时间 */
    updated_at: String,
}

/** @brief 导入计划, 预览与执行共用同一份匹配结果 */
#[derive(Default)]
struct ImportPlan
{
    /** 需要新建的技术栈 */
    stacks_to_create: Vec<ParsedStack>,
    /** 需要插入的片段 */
    snippets_to_insert: Vec<ParsedSnippet>,
    /** 需要覆盖更新的片段 */
    snippets_to_update: Vec<ParsedSnippet>,
    /** 已存在的技术栈数量 */
    stacks_existed: usize,
    /** 跳过的片段数量 */
    snippets_skipped: usize,
}

/** @brief JSON 备份中的片段数据 */
#[derive(Deserialize)]
struct ImportSnippet
{
    /** 片段编号 */
    #[serde(default)]
    id: u64,
    /** 所属技术栈编号 */
    #[serde(default)]
    stack_id: u32,
    /** 所属技术栈名称, 可选, 优先于编号 */
    #[serde(default)]
    stack_name: Option<String>,
    /** 中文索引 */
    #[serde(default)]
    zh_index: String,
    /** 英文索引 */
    #[serde(default)]
    en_index: String,
    /** 正文, 兼容旧版备份的 code_snippet 字段 */
    #[serde(default, alias = "code_snippet")]
    content: String,
    /** 中文说明, 旧版备份字段, 导入时合并进正文 */
    #[serde(default)]
    zh_comment: Option<String>,
    /** 创建时间 */
    #[serde(default)]
    created_at: Option<String>,
    /** 更新时间 */
    #[serde(default)]
    updated_at: Option<String>,
}

/** @brief JSON 备份数据, 导入用 */
#[derive(Deserialize)]
struct ImportBackupData
{
    /** 技术栈列表 */
    #[serde(default)]
    stacks: Vec<BackupStack>,
    /** 片段列表 */
    #[serde(default)]
    snippets: Vec<ImportSnippet>,
}

/**
 * @brief CSV 字段转义
 *
 * 字段包含逗号, 引号或换行时, 使用双引号包裹并转义内部引号
 *
 * @param value 字段值
 * @return 转义后的字段值
 */
fn csv_escape(value: &str) -> String
{
    if value.contains(',') || value.contains('"') || value.contains('\n') || value.contains('\r')
    {
        format!("\"{}\"", value.replace('"', "\"\""))
    }
    else
    {
        value.to_string()
    }
}

/**
 * @brief 合并旧版备份中的正文与中文说明
 *
 * 旧版备份将内容拆分为两个字段, 新版合并为一个字段, 导入旧备份时拼接为同一段内容
 *
 * @param content 正文
 * @param comment 中文说明
 * @return 合并后的内容
 */
fn merge_legacy_comment(content: String, comment: String) -> String
{
    let comment = comment.trim();
    if comment.is_empty()
    {
        return content;
    }
    if content.trim().is_empty()
    {
        return comment.to_string();
    }
    format!("{}\n\n{}", content.trim_end(), comment)
}

/**
 * @brief 生成 CSV 备份内容
 *
 * @param stacks 技术栈列表
 * @param snippets 片段列表
 * @return CSV 文本
 */
fn build_csv(stacks: &[StackInfo], snippets: &[Snippet]) -> String
{
    let name_of: HashMap<u32, &str> = stacks.iter().map(|stack| (stack.id, stack.name.as_str())).collect();
    let mut lines = vec![CSV_HEADER.to_string()];
    for snippet in snippets
    {
        let stack_name = name_of.get(&snippet.stack_id).copied().unwrap_or("");
        lines.push(format!(
            "{},{},{},{},{},{},{}",
            csv_escape(stack_name),
            snippet.id,
            csv_escape(&snippet.zh_index),
            csv_escape(&snippet.en_index),
            csv_escape(&snippet.content),
            csv_escape(&snippet.created_at),
            csv_escape(&snippet.updated_at),
        ));
    }
    lines.join("\r\n")
}

/**
 * @brief 解析 "YYYY-MM-DD HH:MM:SS" 格式时间为数据库时间值
 *
 * 解析失败或为空时返回 NULL, 由数据库填充默认时间
 *
 * @param value 时间字符串
 * @return 数据库时间值
 */
fn parse_datetime(value: &str) -> Value
{
    let value = value.trim();
    if value.is_empty()
    {
        return Value::NULL;
    }
    let mut parts = value.splitn(2, ' ');
    let date_part = parts.next().unwrap_or("");
    let time_part = parts.next().unwrap_or("00:00:00");
    let date_nums: Vec<u32> = date_part
        .split('-')
        .filter_map(|part| part.parse().ok())
        .collect();
    let time_nums: Vec<u32> = time_part
        .split(':')
        .filter_map(|part| part.parse().ok())
        .collect();
    if date_nums.len() != 3
    {
        return Value::NULL;
    }
    Value::Date(
        date_nums[0] as u16,
        date_nums[1] as u8,
        date_nums[2] as u8,
        time_nums.first().copied().unwrap_or(0) as u8,
        time_nums.get(1).copied().unwrap_or(0) as u8,
        time_nums.get(2).copied().unwrap_or(0) as u8,
        0,
    )
}

/**
 * @brief 解析 CSV 单行, 支持引号包裹与双引号转义
 *
 * @param line CSV 行文本
 * @return 字段列表
 */
fn parse_csv_line(line: &str) -> Vec<String>
{
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();
    while let Some(ch) = chars.next()
    {
        match ch
        {
            '"' if in_quotes && chars.peek() == Some(&'"') =>
            {
                current.push('"');
                chars.next();
            }
            '"' => in_quotes = !in_quotes,
            ',' if !in_quotes =>
            {
                fields.push(current.clone());
                current.clear();
            }
            _ => current.push(ch),
        }
    }
    fields.push(current);
    fields
}

/**
 * @brief 解析备份文件内容
 *
 * JSON 与 CSV 两种格式统一解析为技术栈与片段列表
 *
 * @param format 备份格式, json 或 csv
 * @param content 文件内容
 * @return 技术栈列表与片段列表
 */
fn parse_backup(format: &str, content: &str) -> Result<(Vec<ParsedStack>, Vec<ParsedSnippet>), String>
{
    if format == "json"
    {
        let data: ImportBackupData =
            serde_json::from_str(content).map_err(|error| format!("JSON 解析失败: {}", error))?;
        let mut stack_names: HashMap<u32, String> = HashMap::new();
        let mut stacks = Vec::new();
        for stack in &data.stacks
        {
            let name = stack.name.trim().to_string();
            if name.is_empty()
            {
                continue;
            }
            stack_names.insert(stack.id, name.clone());
            stacks.push(ParsedStack
            {
                name,
                description: stack.description.trim().to_string(),
            });
        }
        let snippets = data
            .snippets
            .into_iter()
            .map(|item| ParsedSnippet
            {
                id: item.id,
                stack_name: item
                    .stack_name
                    .map(|name| name.trim().to_string())
                    .unwrap_or_else(|| stack_names.get(&item.stack_id).cloned().unwrap_or_default()),
                zh_index: item.zh_index.trim().to_string(),
                en_index: item.en_index.trim().to_string(),
                content: merge_legacy_comment(
                    item.content,
                    item.zh_comment.unwrap_or_default(),
                ),
                created_at: item.created_at.unwrap_or_default(),
                updated_at: item.updated_at.unwrap_or_default(),
            })
            .collect();
        return Ok((stacks, snippets));
    }

    let mut stacks: Vec<ParsedStack> = Vec::new();
    let mut snippets = Vec::new();
    let mut lines = content.lines();
    let header = lines.next().unwrap_or("");
    // 旧版 CSV 将内容拆分为 code_snippet 与 zh_comment 两列, 导入时合并为一列
    let has_comment = header.contains("zh_comment");
    let time_offset = if has_comment { 1 } else { 0 };
    for (index, line) in lines.enumerate()
    {
        let line = line.trim_end_matches('\r');
        if line.trim().is_empty()
        {
            continue;
        }
        let fields = parse_csv_line(line);
        if fields.len() < 5 + time_offset
        {
            return Err(format!("CSV 第 {} 行字段数不足", index + 2));
        }
        let stack_name = fields[0].trim().to_string();
        if stack_name.is_empty()
        {
            continue;
        }
        if !stacks.iter().any(|stack| stack.name == stack_name)
        {
            stacks.push(ParsedStack
            {
                name: stack_name.clone(),
                description: String::new(),
            });
        }
        snippets.push(ParsedSnippet
        {
            id: fields[1].trim().parse().unwrap_or(0),
            stack_name,
            zh_index: fields[2].trim().to_string(),
            en_index: fields[3].trim().to_string(),
            content: merge_legacy_comment(
                fields[4].clone(),
                if has_comment { fields[5].clone() } else { String::new() },
            ),
            created_at: fields.get(5 + time_offset).cloned().unwrap_or_default(),
            updated_at: fields.get(6 + time_offset).cloned().unwrap_or_default(),
        });
    }
    Ok((stacks, snippets))
}

/**
 * @brief 生成导入计划, 不修改数据库
 *
 * @param conn 数据库连接
 * @param stacks 备份中的技术栈
 * @param snippets 备份中的片段
 * @param overwrite 片段编号冲突时是否覆盖
 * @return 导入计划
 */
fn plan_import(
    conn: &mut PooledConn,
    stacks: &[ParsedStack],
    snippets: &[ParsedSnippet],
    overwrite: bool,
) -> Result<ImportPlan, String>
{
    let mut plan = ImportPlan::default();
    let mut stack_exists: HashMap<String, bool> = HashMap::new();

    for stack in stacks
    {
        let name = stack.name.trim().to_string();
        if name.is_empty()
        {
            continue;
        }
        if stack_exists.contains_key(&name)
        {
            continue;
        }
        let exists: u64 = conn
            .exec_first("SELECT COUNT(*) FROM stacks WHERE name = ?", (&name,))
            .map_err(|error| error.to_string())?
            .unwrap_or(0);
        if exists > 0
        {
            stack_exists.insert(name, true);
            plan.stacks_existed += 1;
        }
        else
        {
            stack_exists.insert(name.clone(), false);
            plan.stacks_to_create.push(ParsedStack
            {
                name,
                description: stack.description.trim().to_string(),
            });
        }
    }

    for snippet in snippets
    {
        let name = snippet.stack_name.trim().to_string();
        if name.is_empty()
        {
            plan.snippets_skipped += 1;
            continue;
        }
        if !stack_exists.contains_key(&name)
        {
            let exists: u64 = conn
                .exec_first("SELECT COUNT(*) FROM stacks WHERE name = ?", (&name,))
                .map_err(|error| error.to_string())?
                .unwrap_or(0);
            if exists > 0
            {
                stack_exists.insert(name.clone(), true);
                plan.stacks_existed += 1;
            }
            else
            {
                stack_exists.insert(name.clone(), false);
                plan.stacks_to_create.push(ParsedStack
                {
                    name: name.clone(),
                    description: String::new(),
                });
            }
        }
        let mut item = snippet.clone();
        item.stack_name = name;
        if item.id != 0
        {
            let exists: u64 = conn
                .exec_first("SELECT COUNT(*) FROM snippets WHERE id = ?", (item.id,))
                .map_err(|error| error.to_string())?
                .unwrap_or(0);
            if exists > 0
            {
                if overwrite
                {
                    plan.snippets_to_update.push(item);
                }
                else
                {
                    plan.snippets_skipped += 1;
                }
                continue;
            }
        }
        plan.snippets_to_insert.push(item);
    }
    Ok(plan)
}

/**
 * @brief 查询技术栈编号, 不存在时创建
 *
 * @param conn 数据库连接
 * @param name 技术栈名称
 * @param cache 名称到编号的缓存
 * @return 技术栈编号
 */
fn resolve_stack_id(
    conn: &mut PooledConn,
    name: &str,
    cache: &mut HashMap<String, u32>,
) -> Result<u32, String>
{
    if let Some(id) = cache.get(name)
    {
        return Ok(*id);
    }
    if let Some(id) = conn
        .exec_first("SELECT id FROM stacks WHERE name = ?", (name,))
        .map_err(|error| error.to_string())?
    {
        cache.insert(name.to_string(), id);
        return Ok(id);
    }
    conn.exec_drop("INSERT INTO stacks (name, description) VALUES (?, ?)", (name, ""))
        .map_err(|error| error.to_string())?;
    let id = conn.last_insert_id() as u32;
    cache.insert(name.to_string(), id);
    Ok(id)
}

/**
 * @brief 执行导入计划
 *
 * @param conn 数据库连接
 * @param plan 导入计划
 * @return 导入统计
 */
fn apply_plan(conn: &mut PooledConn, plan: &ImportPlan) -> Result<ImportSummary, String>
{
    for stack in &plan.stacks_to_create
    {
        conn.exec_drop(
            "INSERT INTO stacks (name, description) VALUES (?, ?)",
            (stack.name.trim(), stack.description.trim()),
        )
        .map_err(|error| error.to_string())?;
    }

    let mut cache: HashMap<String, u32> = HashMap::new();
    for snippet in &plan.snippets_to_insert
    {
        let stack_id = resolve_stack_id(conn, snippet.stack_name.trim(), &mut cache)?;
        conn.exec_drop(
            concat!(
            "INSERT INTO snippets ",
            "(id, stack_id, zh_index, en_index, content, created_at, updated_at) ",
            "VALUES (?, ?, ?, ?, ?, ?, ?)"
        ),
            (
                if snippet.id == 0 { None } else { Some(snippet.id) },
                stack_id,
                snippet.zh_index.clone(),
                snippet.en_index.clone(),
                snippet.content.clone(),
                parse_datetime(&snippet.created_at),
                parse_datetime(&snippet.updated_at),
            ),
        )
        .map_err(|error| error.to_string())?;
    }

    for snippet in &plan.snippets_to_update
    {
        let stack_id = resolve_stack_id(conn, snippet.stack_name.trim(), &mut cache)?;
        conn.exec_drop(
            concat!(
                "UPDATE snippets SET stack_id = ?, zh_index = ?, en_index = ?, content = ?, ",
                "created_at = COALESCE(?, created_at), updated_at = COALESCE(?, updated_at) ",
                "WHERE id = ?"
            ),
            (
                stack_id,
                snippet.zh_index.clone(),
                snippet.en_index.clone(),
                snippet.content.clone(),
                parse_datetime(&snippet.created_at),
                parse_datetime(&snippet.updated_at),
                snippet.id,
            ),
        )
        .map_err(|error| error.to_string())?;
    }

    Ok(ImportSummary
    {
        stacks_created: plan.stacks_to_create.len(),
        stacks_existed: plan.stacks_existed,
        snippets_imported: plan.snippets_to_insert.len(),
        snippets_updated: plan.snippets_to_update.len(),
        snippets_skipped: plan.snippets_skipped,
    })
}

/**
 * @brief 导出备份内容
 *
 * @param conn 数据库连接
 * @param format 导出格式, json 或 csv
 * @return 导出内容与统计
 */
pub fn export(conn: &mut PooledConn, format: &str) -> Result<ExportOutput, String>
{
    let stacks: Vec<StackInfo> = conn
        .exec_map(
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
        .map_err(|error| error.to_string())?;

    let snippets: Vec<Snippet> = conn
        .exec_map(
            concat!(
                "SELECT p.id, p.stack_id, p.zh_index, p.en_index, p.content, ",
                "DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS created_at, ",
                "DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at ",
                "FROM snippets p WHERE p.deleted_at IS NULL ORDER BY p.stack_id, p.id"
            ),
            (),
            |(id, stack_id, zh_index, en_index, content, created_at, updated_at)| Snippet
            {
                id,
                stack_id,
                zh_index,
                en_index,
                content,
                created_at,
                updated_at,
            },
        )
        .map_err(|error| error.to_string())?;

    let content = if format == "json"
    {
        // 导出时间取自数据库服务器时间, 避免额外引入时间库
        let exported_at: String = conn
            .query_first("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s')")
            .map_err(|error| error.to_string())?
            .unwrap_or_default();
        serde_json::to_string_pretty(&BackupData
        {
            exported_at,
            stacks: stacks.clone(),
            snippets: snippets.clone(),
        })
        .map_err(|error| error.to_string())?
    }
    else
    {
        build_csv(&stacks, &snippets)
    };

    Ok(ExportOutput
    {
        content,
        stacks: stacks.len(),
        snippets: snippets.len(),
    })
}

/**
 * @brief 预览导入结果, 不修改数据库
 *
 * @param conn 数据库连接
 * @param format 备份格式
 * @param content 文件内容
 * @param overwrite 编号冲突时是否覆盖
 * @return 导入统计
 */
pub fn preview(
    conn: &mut PooledConn,
    format: &str,
    content: &str,
    overwrite: bool,
) -> Result<ImportSummary, String>
{
    let (stacks, snippets) = parse_backup(format, content)?;
    let plan = plan_import(conn, &stacks, &snippets, overwrite)?;
    Ok(ImportSummary
    {
        stacks_created: plan.stacks_to_create.len(),
        stacks_existed: plan.stacks_existed,
        snippets_imported: plan.snippets_to_insert.len(),
        snippets_updated: plan.snippets_to_update.len(),
        snippets_skipped: plan.snippets_skipped,
    })
}

/**
 * @brief 执行导入
 *
 * 采用合并导入方式: 技术栈按名称匹配, 不存在时自动创建, 片段编号冲突时按 overwrite 决定覆盖或跳过
 *
 * @param conn 数据库连接
 * @param format 备份格式
 * @param content 文件内容
 * @param overwrite 编号冲突时是否覆盖
 * @return 导入统计
 */
pub fn apply(
    conn: &mut PooledConn,
    format: &str,
    content: &str,
    overwrite: bool,
) -> Result<ImportSummary, String>
{
    let (stacks, snippets) = parse_backup(format, content)?;
    let plan = plan_import(conn, &stacks, &snippets, overwrite)?;
    apply_plan(conn, &plan)
}
