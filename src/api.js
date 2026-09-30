import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

/**
 * @brief 查询技术栈列表
 *
 * @return 技术栈列表
 */
export function list_stacks()
{
    return invoke("list_stacks");
}

/**
 * @brief 检索文章
 *
 * @param payload 检索参数, 包含 stackId / keyword / sort / offset / limit
 * @return 检索结果与总数
 */
export function search_snippets(payload)
{
    return invoke("search_snippets", payload);
}

/**
 * @brief 新建技术栈
 *
 * @param name 技术栈名称
 * @param description 技术栈描述
 * @return 新技术栈编号
 */
export function create_stack(name, description)
{
    return invoke("create_stack", { name, description });
}

/**
 * @brief 修改技术栈
 *
 * @param id 技术栈编号
 * @param name 技术栈名称
 * @param description 技术栈描述
 * @return 受影响行数
 */
export function update_stack(id, name, description)
{
    return invoke("update_stack", { id, name, description });
}

/**
 * @brief 删除技术栈
 *
 * @param id 技术栈编号
 * @return 受影响行数
 */
export function delete_stack(id)
{
    return invoke("delete_stack", { id });
}

/**
 * @brief 导出备份
 *
 * @param format 导出格式
 * @param path 保存路径
 * @return 导出统计
 */
export function export_backup(format, path)
{
    return invoke("export_backup", { format, path });
}

/**
 * @brief 导出单篇文章为 Markdown
 *
 * @param id 片段编号
 * @param path 保存路径
 * @param language 代码块语言标记
 * @return 无
 */
export function preview_import(format, path, overwrite)
{
    return invoke("preview_import", { format, path, overwrite });
}

/**
 * @brief 导入备份
 *
 * @param format 备份格式
 * @param path 备份文件路径
 * @param overwrite 是否覆盖已有片段
 * @return 导入统计
 */
export function import_backup(format, path, overwrite)
{
    return invoke("import_backup", { format, path, overwrite });
}

/**
 * @brief 读取数据库配置
 *
 * @return 数据库配置
 */
export function get_config()
{
    return invoke("get_config");
}

/**
 * @brief 保存数据库配置
 *
 * @param config 数据库配置
 * @return 无
 */
export function save_config(config)
{
    return invoke("save_config", { config });
}

/**
 * @brief 测试连接
 *
 * @param config 数据库配置
 * @return MySQL 版本号
 */
export function test_connection(config)
{
    return invoke("test_connection", { config });
}

/**
 * @brief 检查当前连接
 *
 * @return MySQL 版本号
 */
export function check_connection()
{
    return invoke("check_connection");
}

/**
 * @brief 分析 SQL 语句
 *
 * @param sql SQL 语句
 * @return 分析结果
 */
/**
 * @brief 选择保存路径
 *
 * @param options 对话框参数
 * @return 路径或空值
 */
export function pick_save_path(options)
{
    return save(options);
}

/**
 * @brief 选择打开文件路径
 *
 * @param options 对话框参数
 * @return 路径或空值
 */
export function pick_open_path(options)
{
    return open(options);
}
