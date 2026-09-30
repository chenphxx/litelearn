import * as api from "./api.js";
import { actions, state } from "./state.js";
import { escape_html, icons, show_confirm, show_dialog, toast, ui } from "./ui.js";

/** 当前正在编辑的技术栈编号, null 表示新建 */
let editing_stack_id = null;

/**
 * @brief 加载技术栈列表并刷新界面
 *
 * @return 无
 */
export async function load_stacks()
{
    try
    {
        state.stacks = await api.list_stacks();
    }
    catch (error)
    {
        state.stacks = [];
        toast(`加载技术栈失败: ${error}`, { type: "error", timeout: 5000 });
    }
    if (state.currentStackId !== null && !state.stacks.some((item) => item.id === state.currentStackId))
    {
        state.currentStackId = null;
    }
    render_sidebar();
    fill_stack_select();
}

/**
 * @brief 渲染侧边栏技术栈列表
 *
 * @return 无
 */
export function render_sidebar()
{
    const total = state.stacks.reduce((sum, item) => sum + Number(item.count || 0), 0);
    ui.sidebarTotal.textContent = String(total);
    ui.sidebarList.innerHTML = "";

    ui.sidebarList.appendChild(
        create_stack_item(
            { id: null, name: "全部技术栈", description: "检索全部技术栈", count: total },
            state.currentStackId === null,
        ),
    );
    for (const stack of state.stacks)
    {
        ui.sidebarList.appendChild(create_stack_item(stack, state.currentStackId === stack.id));
    }
}

/**
 * @brief 创建单个技术栈条目
 *
 * @param stack 技术栈数据
 * @param active 是否为当前选中项
 * @return 条目元素
 */
function create_stack_item(stack, active)
{
    const item = document.createElement("div");
    item.className = "stack-item" + (active ? " active" : "");
    item.dataset.id = stack.id === null ? "" : String(stack.id);
    item.title = stack.description || stack.name;

    const name = document.createElement("span");
    name.className = "stack-item-name";
    name.textContent = stack.name;
    item.appendChild(name);

    const count = document.createElement("span");
    count.className = "stack-item-count";
    count.textContent = String(stack.count ?? 0);
    item.appendChild(count);

    if (stack.id !== null)
    {
        const edit = document.createElement("button");
        edit.className = "stack-item-edit";
        edit.type = "button";
        edit.title = "编辑技术栈";
        edit.innerHTML = icons.edit;
        edit.addEventListener("click", (event) =>
        {
            event.stopPropagation();
            open_edit_dialog(stack.id);
        });
        item.appendChild(edit);
    }

    item.addEventListener("click", () => select_stack(stack.id));
    return item;
}

/**
 * @brief 切换当前技术栈
 *
 * @param id 技术栈编号, null 表示全部技术栈
 * @return 无
 */
export async function select_stack(id)
{
    if (id === state.currentStackId)
    {
        return;
    }
    if (actions.confirm_leave && !(await actions.confirm_leave()))
    {
        return;
    }
    state.currentStackId = id;
    render_sidebar();
    await actions.reload_results();
}

/**
 * @brief 同步新增数据弹窗的技术栈下拉框
 *
 * @return 无
 */
export function fill_stack_select()
{
    const previous = ui.newDataStack.value;
    ui.newDataStack.innerHTML = "";
    for (const stack of state.stacks)
    {
        const option = document.createElement("option");
        option.value = String(stack.id);
        option.textContent = stack.name;
        ui.newDataStack.appendChild(option);
    }
    if (state.currentStackId !== null)
    {
        ui.newDataStack.value = String(state.currentStackId);
    }
    else if (previous)
    {
        ui.newDataStack.value = previous;
    }
}

/**
 * @brief 打开新建技术栈弹窗
 *
 * @return 无
 */
export function open_create_dialog()
{
    editing_stack_id = null;
    ui.stackDialogTitle.textContent = "新建技术栈";
    ui.stackName.value = "";
    ui.stackDescription.value = "";
    ui.stackStatus.textContent = "";
    ui.btnStackDelete.hidden = true;
    show_dialog(ui.stackDialog);
    ui.stackName.focus();
}

/**
 * @brief 打开编辑技术栈弹窗
 *
 * @param id 技术栈编号
 * @return 无
 */
export function open_edit_dialog(id)
{
    const stack = state.stacks.find((item) => item.id === id);
    if (!stack)
    {
        return;
    }
    editing_stack_id = id;
    ui.stackDialogTitle.textContent = "编辑技术栈";
    ui.stackName.value = stack.name;
    ui.stackDescription.value = stack.description;
    ui.stackStatus.textContent = `当前包含 ${stack.count} 篇文章`;
    ui.btnStackDelete.hidden = false;
    show_dialog(ui.stackDialog);
    ui.stackName.focus();
}

/**
 * @brief 保存技术栈
 *
 * @return 无
 */
async function save_stack()
{
    const name = ui.stackName.value.trim();
    const description = ui.stackDescription.value.trim();
    if (!name)
    {
        ui.stackStatus.classList.add("error");
        ui.stackStatus.textContent = "技术栈名称不能为空";
        return;
    }
    try
    {
        if (editing_stack_id === null)
        {
            const id = await api.create_stack(name, description);
            state.currentStackId = id;
        }
        else
        {
            await api.update_stack(editing_stack_id, name, description);
        }
        ui.stackDialog.close();
        toast(editing_stack_id === null ? "技术栈已创建" : "技术栈已更新", { type: "success" });
        await actions.reload_stacks();
        await actions.reload_results();
    }
    catch (error)
    {
        ui.stackStatus.classList.add("error");
        ui.stackStatus.textContent = String(error);
    }
}

/**
 * @brief 删除当前技术栈
 *
 * @return 无
 */
async function delete_stack()
{
    const stack = state.stacks.find((item) => item.id === editing_stack_id);
    if (!stack)
    {
        return;
    }
    const ok = await show_confirm(
        `删除技术栈「${stack.name}」会同时删除其下 ${stack.count} 篇文章, 且无法恢复, 是否继续?`,
        { title: "删除技术栈", okText: "删除", danger: true },
    );
    if (!ok)
    {
        return;
    }
    try
    {
        await api.delete_stack(stack.id);
        ui.stackDialog.close();
        state.currentStackId = null;
        toast("技术栈已删除", { type: "success" });
        await actions.reload_stacks();
        await actions.reload_results();
    }
    catch (error)
    {
        ui.stackStatus.classList.add("error");
        ui.stackStatus.textContent = String(error);
    }
}

/**
 * @brief 绑定技术栈相关事件
 *
 * @return 无
 */
export function init_stacks()
{
    ui.btnNewStack.addEventListener("click", open_create_dialog);
    ui.btnStackSave.addEventListener("click", save_stack);
    ui.btnStackCancel.addEventListener("click", () => ui.stackDialog.close());
    ui.btnStackDelete.addEventListener("click", delete_stack);
    ui.stackName.addEventListener("keydown", (event) =>
    {
        if (event.key === "Enter")
        {
            save_stack();
        }
    });
}

/**
 * @brief 当前技术栈名称
 *
 * @return 技术栈名称, 全部技术栈时返回空字符串
 */
export function current_stack_name()
{
    const stack = state.stacks.find((item) => item.id === state.currentStackId);
    return stack ? stack.name : "";
}
