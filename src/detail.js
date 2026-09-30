
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
    if (!(await actions.confirm_leave()))
    state.snapshot = {
    update_dirty_indicator();
        state.snapshot = { zhIndex: indexes.zh, enIndex: indexes.en, content };
        update_dirty_indicator();
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
        state.snapshot = { zhIndex: "", enIndex: "", content: "" };
        input.addEventListener("input", update_dirty_indicator);