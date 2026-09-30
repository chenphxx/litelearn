import * as api from "./api.js";
import { actions, state } from "./state.js";
import { show_dialog, toast, ui } from "./ui.js";

/**
 * @brief 打开新增数据弹窗
 *
 * @param prefill 预填内容, 用于从现有文章克隆
 * @return 无
 */
export function open_new_snippet(prefill = null)
{
    if (state.stacks.length === 0)
    {
        toast("请先创建技术栈", { type: "info" });
        return;
    }
    const data = prefill || {};
    const stack_id = data.stack_id ?? state.currentStackId ?? state.stacks[0].id;
    ui.newDataTitle.textContent = prefill ? "克隆文章" : "新增数据";
    ui.newDataStack.value = String(stack_id);
    ui.newDataZh.value = data.zh_index ?? "";
    ui.newDataEn.value = data.en_index ?? "";
    ui.newDataCode.value = data.content ?? "";
    show_dialog(ui.newDataDialog);
    ui.newDataZh.focus();
}

/**
 * @brief 保存新增文章
 *
 * @return 无
 */
export async function save_new_snippet()
{
    const stack_id = Number(ui.newDataStack.value);
    const zh_index = ui.newDataZh.value.trim();
    const en_index = ui.newDataEn.value.trim();
    const content = ui.newDataCode.value;
    if (!stack_id)
    {
        toast("请选择技术栈", { type: "error" });
        return;
    }
    if (!content.trim())
    {
        toast("正文不能为空", { type: "error" });
        return;
    }
    if (!zh_index && !en_index)
    {
        toast("中文索引与英文索引至少填写一项", { type: "error" });
        return;
    }
    try
    {
        const id = await api.add_snippet({
            stackId: stack_id,
            zhIndex: zh_index,
            enIndex: en_index,
            content: content,
        });
        ui.newDataDialog.close();
        toast("保存成功", { type: "success" });
        if (stack_id !== state.currentStackId)
        {
            state.currentStackId = stack_id;
            await actions.reload_stacks();
        }
        await actions.reload_results();
        await actions.open_snippet(id);
    }
    catch (error)
    {
        toast(`保存失败: ${error}`, { type: "error", timeout: 5000 });
    }
}

/**
 * @brief 绑定新增数据弹窗事件
 *
 * @return 无
 */
export function init_snippet_form()
{
    ui.btnNewData.addEventListener("click", () => open_new_snippet());
    ui.btnNewDataSave.addEventListener("click", save_new_snippet);
    ui.btnNewDataCancel.addEventListener("click", () => ui.newDataDialog.close());
}
