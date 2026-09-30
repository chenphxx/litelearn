import * as api from "./api.js";
import {
    content_line_count,
    fence_for_stack,
    get_content,
    set_content,
    set_stack_language,
} from "./editor.js";
import { find_row, mark_selected, update_row } from "./results.js";
import { push_recent_snippet } from "./history.js";
import { current_stack_name } from "./stacks.js";
import { actions, state } from "./state.js";
import {
    copy_text,
    show_choice,
    show_confirm,
    toast,
    ui,
} from "./ui.js";

/**
 * @brief 读取编辑区当前内容
 *
 * @return 文章内容
 */
function current_content()
{
    return get_content();
}

/**
 * @brief 判断是否存在未保存修改
 *
 * @return 是否存在修改
 */
export function is_dirty()
{
    if (state.currentSnippetId === null)
    {
        return false;
    }
    return (
        current_content() !== state.snapshot.content ||
        indexes.zh !== state.snapshot.zhIndex ||
        indexes.en !== state.snapshot.enIndex
    );
}

/**
 * @brief 刷新未保存状态提示
 *
 * @return 无
 */
export function update_dirty_indicator()
{
    const dirty = is_dirty();
    ui.codeId.classList.toggle("dirty", dirty);
    ui.detailLines.textContent = `${content_line_count()} 行`;
    ui.btnCodeSave.disabled = state.currentSnippetId === null;
}

/**
 * @brief 编辑器内容变化回调
 *
 * @return 无
 */
export function on_editor_change()
{
    update_dirty_indicator();
}

/**
 * @brief 打开指定文章
 *
 * @param id 文章编号
 * @return 无
 */
export async function open_snippet(id)
{
    if (id === state.currentSnippetId)
    {
        return;
    }
    if (!(await actions.confirm_leave()))
    {
        return;
    }
    const row = find_row(id);
    if (!row)
    {
        return;
    }
    state.currentSnippetId = id;
    state.snapshot = {
        zhIndex: row.zh_index,
        enIndex: row.en_index,
        content: row.content,
    };

    const stack_name = current_stack_name_for(row.stack_id);
    await set_stack_language(stack_name);
    set_content(row.content);

    ui.detailEmpty.hidden = true;
    ui.detailBody.hidden = false;
    ui.codeId.textContent = `#${row.id}`;
    ui.detailStack.textContent = stack_name || "未知技术栈";
    ui.detailCreated.textContent = row.created_at;
    ui.detailUpdated.textContent = row.updated_at;
    update_dirty_indicator();
    mark_selected(id);
    push_recent_snippet(row);
}

/**
 * @brief 查询文章所属技术栈名称
 *
 * @param stack_id 技术栈编号
 * @return 技术栈名称
 */
function current_stack_name_for(stack_id)
{
    const stack = state.stacks.find((item) => item.id === stack_id);
    return stack ? stack.name : current_stack_name();
}

/**
 * @brief 保存当前文章
 *
 * @return 是否保存成功
 */
export async function save_current()
{
    if (state.currentSnippetId === null)
    {
        return false;
    }
    const content = current_content();
    if (!indexes.zh && !indexes.en)
    {
        toast("中文索引与英文索引至少填写一项", { type: "error" });
        return false;
    }
    try
    {
        await api.update_snippet({
            id: state.currentSnippetId,
            zhIndex: indexes.zh,
            enIndex: indexes.en,
            content: content,
        });
        state.snapshot = { zhIndex: indexes.zh, enIndex: indexes.en, content };
        update_row(state.currentSnippetId, { zh_index: indexes.zh, en_index: indexes.en, content });
        update_dirty_indicator();
        toast("已保存", { type: "success" });
        await actions.reload_results();
        mark_selected(state.currentSnippetId);
        return true;
    }
    catch (error)
    {
        toast(`保存失败: ${error}`, { type: "error", timeout: 5000 });
        return false;
    }
}

/**
 * @brief 存在未保存修改时确认是否继续
 *
 * @return 是否继续
 */
export async function confirm_leave()
{
    if (!is_dirty())
    {
        return true;
    }
    const choice = await show_choice(
        "当前文章有未保存的修改, 请选择处理方式",
        [
            { label: "保存并继续", value: "save", className: "primary" },
            { label: "放弃修改", value: "discard", className: "danger" },
            { label: "取消", value: "cancel" },
        ],
        { title: "未保存的修改", cancelValue: "cancel" },
    );
    if (choice === "save")
    {
        return save_current();
    }
    return choice === "discard";
}

/**
 * @brief 删除当前文章
 *
 * @return 无
 */
export async function delete_current()
{
    if (state.currentSnippetId === null)
    {
        return;
    }
    const id = state.currentSnippetId;
    const ok = await show_confirm("该文章将移入回收站, 是否继续?", {
        title: "删除文章",
        okText: "移入回收站",
        danger: true,
    });
    if (!ok)
    {
        return;
    }
    try
    {
        await api.delete_snippet(id);
        state.currentSnippetId = null;
        state.snapshot = { zhIndex: "", enIndex: "", content: "" };
        set_content("");
        ui.detailBody.hidden = true;
        ui.detailEmpty.hidden = false;
        toast("已移入回收站", {
            type: "success",
            action: {
                label: "撤销",
                run: async () =>
                {
                    try
                    {
                        await api.restore_snippet(id);
                        toast("已恢复", { type: "success" });
                        await actions.reload_results();
                    }
                    catch (error)
                    {
                        toast(`恢复失败: ${error}`, { type: "error" });
                    }
                },
            },
        });
        await actions.reload_results();
    }
    catch (error)
    {
        toast(`删除失败: ${error}`, { type: "error", timeout: 5000 });
    }
}

/**
 * @brief 复制正文内容
 *
 * @return 无
 */
export async function copy_content()
{
    const text = get_content();
    if (!text)
    {
        toast("没有可复制的内容", { type: "info" });
        return;
    }
    await copy_text(text);
    toast("正文已复制", { type: "success" });
}

/**
 * @brief 复制为 Markdown 内容
 *
 * @return 无
 */
export async function copy_content_as_markdown()
{
    const text = get_content();
    if (!text)
    {
        toast("没有可复制的内容", { type: "info" });
        return;
    }
    const fence = fence_for_stack(ui.detailStack.textContent);
    const content = `\`\`\`${fence}\n${text}\n\`\`\``;
    await copy_text(content);
    toast("Markdown 内容已复制", { type: "success" });
}

/**
 * @brief 另存当前文章为 Markdown 文件
 *
 * @return 无
 */
export async function export_current()
{
    if (state.currentSnippetId === null)
    {
        return;
    }
    const row = find_row(state.currentSnippetId);
    const title = row ? row.zh_index || row.en_index || `snippet-${row.id}` : "snippet";
    const path = await api.pick_save_path({
        title: "导出文章",
        defaultPath: `${title}.md`,
        filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!path)
    {
        return;
    }
    try
    {
        const fence = fence_for_stack(ui.detailStack.textContent);
        await api.export_snippet(state.currentSnippetId, path, fence);
        toast("已导出 Markdown 文件", { type: "success" });
    }
    catch (error)
    {
        toast(`导出失败: ${error}`, { type: "error", timeout: 5000 });
    }
}

/**
 * @brief 绑定详情区事件
 *
 * @return 无
 */
export function init_detail()
{
    ui.btnCodeSave.addEventListener("click", save_current);
    ui.btnCodeCopy.addEventListener("click", copy_content);
    ui.btnCodeCopyMd.addEventListener("click", copy_content_as_markdown);
    ui.btnCodeExport.addEventListener("click", export_current);
    ui.btnCodeClone.addEventListener("click", () =>
    {
        const row = state.currentSnippetId === null ? null : find_row(state.currentSnippetId);
        if (!row)
        {
            return;
        }
        actions.open_new_snippet({
            stack_id: row.stack_id,
            zh_index: indexes.zh,
            en_index: indexes.en,
            content: get_content(),
        });
    });
    {
        input.addEventListener("input", update_dirty_indicator);
    }
    ui.btnDelete.addEventListener("click", delete_current);
}
