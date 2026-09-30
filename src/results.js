import * as api from "./api.js";
import { actions, state } from "./state.js";
import { escape_html, ui } from "./ui.js";

/** 检索请求序号, 用于丢弃过期响应 */
let search_token = 0;

/**
 * @brief 执行检索
 *
 * @param options 检索参数, append 为真时在现有结果后追加
 * @return 无
 */
export async function run_search(options = {})
{
    const { append = false } = options;
    const token = ++search_token;
    state.loading = true;
    render_loading();

    const offset = append ? state.rows.length : 0;
    try
    {
        const result = await api.search_snippets({
            stackId: state.currentStackId,
            keyword: state.keyword,
            sort: state.sort,
            offset,
            limit: state.limit,
        });
        if (token !== search_token)
        {
            return;
        }
        state.rows = append ? state.rows.concat(result.items) : result.items;
        state.total = Number(result.total || 0);
        state.loading = false;
        render_results();
    }
    catch (error)
    {
        if (token !== search_token)
        {
            return;
        }
        state.loading = false;
        state.rows = [];
        state.total = 0;
        render_results();
        render_state("error", `检索失败: ${error}`, "重试", () => run_search());
    }
}

/**
 * @brief 渲染加载中的占位行
 *
 * @return 无
 */
function render_loading()
{
    ui.resultBody.innerHTML = "";
    ui.resultState.hidden = true;
    ui.btnLoadMore.hidden = true;
    for (let index = 0; index < 3; index += 1)
    {
        const tr = document.createElement("tr");
        tr.className = "skeleton-row";
        tr.innerHTML = '<td colspan="6"><span class="skeleton"></span></td>';
        ui.resultBody.appendChild(tr);
    }
    ui.resultMeta.textContent = "正在检索...";
}

/**
 * @brief 渲染检索结果
 *
 * @return 无
 */
export function render_results()
{
    const show_stack_column = state.currentStackId === null;
    ui.resultTable.classList.toggle("show-stack", show_stack_column);
    ui.resultBody.innerHTML = "";

    if (state.rows.length === 0)
    {
        ui.btnLoadMore.hidden = true;
        ui.resultMeta.textContent = "";
        if (state.keyword.trim())
        {
            render_state(
                "empty",
                `未找到与「${state.keyword.trim()}」匹配的数据`,
                "清除搜索条件",
                () =>
                {
                    state.keyword = "";
                    ui.searchInput.value = "";
                    run_search();
                },
            );
        }
        else
        {
            render_state("empty", "当前范围暂无数据, 点击「新增数据」开始记录", null, null);
        }
        return;
    }

    ui.resultState.hidden = true;
    const stack_names = new Map(state.stacks.map((item) => [item.id, item.name]));
    for (const row of state.rows)
    {
        const tr = document.createElement("tr");
        tr.dataset.id = String(row.id);
        tr.classList.toggle("selected", row.id === state.currentSnippetId);
        tr.innerHTML =
            `<td class="col-id">${row.id}</td>` +
            `<td class="col-stack" title="${escape_html(stack_names.get(row.stack_id) || "-")}">${escape_html(stack_names.get(row.stack_id) || "-")}</td>` +
            `<td title="${escape_html(row.zh_index)}">${highlight(row.zh_index)}</td>` +
            `<td title="${escape_html(row.en_index)}">${highlight(row.en_index)}</td>` +
            `<td class="col-time" title="${escape_html(row.updated_at)}">${escape_html(short_time(row.updated_at))}</td>`;
        tr.addEventListener("click", () => actions.open_snippet(row.id));
        ui.resultBody.appendChild(tr);
    }

    ui.resultMeta.textContent = `共 ${state.total} 条 · 已显示 ${state.rows.length} 条`;
    ui.btnLoadMore.hidden = state.rows.length >= state.total;
    ui.btnLoadMore.textContent = `加载更多 (${state.rows.length} / ${state.total})`;
}

/**
 * @brief 显示结果区状态提示
 *
 * @param kind 状态类型, 支持 empty 与 error
 * @param message 提示内容
 * @param action_label 操作按钮文本, 为空时不显示
 * @param action 操作回调
 * @return 无
 */
export function render_state(kind, message, action_label, action)
{
    ui.resultState.hidden = false;
    ui.resultState.className = `result-state result-state--${kind}`;
    ui.resultStateText.textContent = message;
    ui.btnResultAction.hidden = !action_label;
    ui.btnResultAction.textContent = action_label || "";
    ui.btnResultAction.onclick = action ? () => action() : null;
}

/**
 * @brief 截取列表展示用的时间, 只保留到分钟
 *
 * @param value 完整时间文本
 * @return 截取后的时间文本
 */
function short_time(value)
{
    const text = String(value ?? "");
    return text.length > 16 ? text.slice(0, 16) : text;
}

/**
 * @brief 高亮关键词
 *
 * @param text 原始文本
 * @return 转义并高亮后的 HTML
 */
function highlight(text)
{
    const escaped = escape_html(text);
    const keyword = highlight_keyword();
    if (!keyword)
    {
        return escaped;
    }
    const pattern = new RegExp(escape_regExp(keyword), "gi");
    return escaped.replace(pattern, (match) => `<mark>${match}</mark>`);
}

/**
 * @brief 提取用于高亮的关键词
 *
 * @return 关键词, 无关键词时为空
 */
function highlight_keyword()
{
    const keyword = state.keyword.trim().replace(/^(zh|en|code|note):/i, "").trim();
    if (!keyword || keyword === "000")
    {
        return "";
    }
    return keyword;
}

/**
 * @brief 转义正则表达式特殊字符
 *
 * @param text 原始文本
 * @return 转义后的文本
 */
function escape_regExp(text)
{
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @brief 切换排序方式
 *
 * @param field 排序字段, 支持 id 与 updated
 * @return 无
 */
export function toggle_sort(field)
{
    if (field === "id")
    {
        state.sort = state.sort === "id_asc" ? "id_desc" : "id_asc";
    }
    else
    {
        state.sort = state.sort === "updated_desc" ? "updated_asc" : "updated_desc";
    }
    render_sort_indicator();
    run_search();
}

/**
 * @brief 渲染表头排序指示
 *
 * @return 无
 */
function render_sort_indicator()
{
    for (const th of ui.resultTable.querySelectorAll("th[data-sort]"))
    {
        const field = th.dataset.sort;
        const active =
            (field === "id" && state.sort.startsWith("id")) ||
            (field === "updated" && state.sort.startsWith("updated"));
        th.classList.toggle("sorted", active);
        th.dataset.order = active ? (state.sort.endsWith("asc") ? "asc" : "desc") : "";
    }
}

/**
 * @brief 加载下一页
 *
 * @return 无
 */
export function load_more()
{
    run_search({ append: true });
}

/**
 * @brief 按当前条件刷新结果
 *
 * @return 无
 */
export function refresh()
{
    render_sort_indicator();
    return run_search();
}

/**
 * @brief 标记当前选中行
 *
 * @param id 片段编号
 * @return 无
 */
export function mark_selected(id)
{
    for (const tr of ui.resultBody.children)
    {
        tr.classList.toggle("selected", Number(tr.dataset.id) === id);
    }
}

/**
 * @brief 从当前结果缓存中查找片段
 *
 * @param id 片段编号
 * @return 片段数据或空值
 */
export function find_row(id)
{
    return state.rows.find((item) => item.id === id) || null;
}

/**
 * @brief 用最新数据更新结果缓存中的片段
 *
 * @param id 片段编号
 * @param payload 片段字段
 * @return 无
 */
export function update_row(id, payload)
{
    const row = state.rows.find((item) => item.id === id);
    if (!row)
    {
        return;
    }
    Object.assign(row, payload);
}

/**
 * @brief 绑定结果区事件
 *
 * @return 无
 */
export function init_results()
{
    ui.btnLoadMore.addEventListener("click", load_more);
    for (const th of ui.resultTable.querySelectorAll("th[data-sort]"))
    {
        th.addEventListener("click", () => toggle_sort(th.dataset.sort));
    }
    render_sort_indicator();
}
