import * as api from "./api.js";
import { actions } from "./state.js";
import { escape_html, show_confirm, show_dialog, toast, ui } from "./ui.js";

/**
 * @brief 打开回收站弹窗
 *
 * @return 无
 */
export async function open_recycle_dialog()
{
    show_dialog(ui.recycleDialog);
    await load_deleted();
}

/**
 * @brief 加载回收站列表
 *
 * @return 无
 */
async function load_deleted()
{
    try
    {
        const list = await api.list_deleted_snippets();
        render(list);
    }
    catch (error)
    {
        ui.recycleStatus.classList.add("error");
        ui.recycleStatus.textContent = `加载失败: ${error}`;
    }
}

/**
 * @brief 渲染回收站列表
 *
 * @param list 已删除文章列表
 * @return 无
 */
function render(list)
{
    ui.recycleBody.innerHTML = "";
    ui.recycleEmpty.hidden = list.length > 0;
    ui.btnRecycleClear.disabled = list.length === 0;
    ui.recycleStatus.classList.remove("error");
    ui.recycleStatus.textContent = list.length > 0 ? `共 ${list.length} 条已删除记录` : "";
    for (const item of list)
    {
        const tr = document.createElement("tr");
        tr.innerHTML =
            `<td class="col-id">${item.id}</td>` +
            `<td>${escape_html(item.stack_name)}</td>` +
            `<td>${escape_html(item.zh_index)}</td>` +
            `<td>${escape_html(item.en_index)}</td>` +
            `<td class="col-time">${escape_html(item.deleted_at)}</td>`;
        const actions_cell = document.createElement("td");
        actions_cell.className = "col-actions";
        const restore = document.createElement("button");
        restore.className = "btn small";
        restore.textContent = "恢复";
        restore.addEventListener("click", () => restore_item(item.id));
        const purge = document.createElement("button");
        purge.className = "btn small danger";
        purge.textContent = "彻底删除";
        purge.addEventListener("click", () => purge_item(item.id));
        actions_cell.appendChild(restore);
        actions_cell.appendChild(purge);
        tr.appendChild(actions_cell);
        ui.recycleBody.appendChild(tr);
    }
}

/**
 * @brief 还原文章
 *
 * @param id 片段编号
 * @return 无
 */
async function restore_item(id)
{
    try
    {
        await api.restore_snippet(id);
        toast("已恢复", { type: "success" });
        await load_deleted();
        await actions.reload_results();
    }
    catch (error)
    {
        toast(`恢复失败: ${error}`, { type: "error" });
    }
}

/**
 * @brief 彻底删除文章
 *
 * @param id 片段编号
 * @return 无
 */
async function purge_item(id)
{
    const ok = await show_confirm(`文章 #${id} 将被永久删除且无法恢复, 是否继续?`, {
        title: "彻底删除",
        okText: "永久删除",
        danger: true,
    });
    if (!ok)
    {
        return;
    }
    try
    {
        await api.purge_snippet(id);
        toast("已永久删除", { type: "success" });
        await load_deleted();
    }
    catch (error)
    {
        toast(`删除失败: ${error}`, { type: "error" });
    }
}

/**
 * @brief 清空回收站
 *
 * @return 无
 */
async function clear_recycle()
{
    const ok = await show_confirm("回收站中的全部文章将被永久删除且无法恢复, 是否继续?", {
        title: "清空回收站",
        okText: "清空",
        danger: true,
    });
    if (!ok)
    {
        return;
    }
    try
    {
        const affected = await api.purge_all_deleted();
        toast(`已永久删除 ${affected} 条记录`, { type: "success" });
        await load_deleted();
    }
    catch (error)
    {
        toast(`清空失败: ${error}`, { type: "error" });
    }
}

/**
 * @brief 绑定回收站弹窗事件
 *
 * @return 无
 */
export function init_recycle()
{
    ui.btnRecycleClear.addEventListener("click", clear_recycle);
    ui.btnRecycleClose.addEventListener("click", () => ui.recycleDialog.close());
}
