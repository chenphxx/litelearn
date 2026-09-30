import { actions, state } from "./state.js";
import { show_dialog, ui } from "./ui.js";

/** 搜索历史存储键 */
const SEARCH_KEY = "litelearn-search-history";

/** 最近打开存储键 */
const RECENT_KEY = "litelearn-recent-snippets";

/** 最多保存的记录数量 */
const MAX_ITEMS = 12;

/**
 * @brief 读取本地记录
 *
 * @param key 存储键
 * @return 记录列表
 */
function read_list(key)
{
    try
    {
        const value = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(value) ? value : [];
    }
    catch (error)
    {
        return [];
    }
}

/**
 * @brief 写入本地记录
 *
 * @param key 存储键
 * @param value 记录列表
 * @return 无
 */
function write_list(key, value)
{
    localStorage.setItem(key, JSON.stringify(value.slice(0, MAX_ITEMS)));
}

/**
 * @brief 记录一次搜索关键词
 *
 * @param keyword 关键词
 * @return 无
 */
export function push_search_history(keyword)
{
    const text = String(keyword ?? "").trim();
    if (!text)
    {
        return;
    }
    const list = read_list(SEARCH_KEY).filter((item) => item !== text);
    list.unshift(text);
    write_list(SEARCH_KEY, list);
}

/**
 * @brief 记录最近打开的文章
 *
 * @param row 文章数据
 * @return 无
 */
export function push_recent_snippet(row)
{
    if (!row || row.id === undefined)
    {
        return;
    }
    const stack = state.stacks.find((item) => item.id === row.stack_id);
    const item = {
        id: row.id,
        zh_index: row.zh_index,
        en_index: row.en_index,
        stack_id: row.stack_id,
        stack_name: stack ? stack.name : "",
        time: new Date().toLocaleString(),
    };
    const list = read_list(RECENT_KEY).filter((entry) => entry.id !== item.id);
    list.unshift(item);
    write_list(RECENT_KEY, list);
}

/**
 * @brief 打开最近记录弹窗
 *
 * @return 无
 */
export function open_history_dialog()
{
    render_search_history();
    render_recent_snippets();
    show_dialog(ui.historyDialog);
}

/**
 * @brief 渲染搜索历史列表
 *
 * @return 无
 */
function render_search_history()
{
    const list = read_list(SEARCH_KEY);
    ui.historySearchList.innerHTML = "";
    ui.historySearchEmpty.hidden = list.length > 0;
    for (const keyword of list)
    {
        const item = document.createElement("button");
        item.className = "history-item";
        item.type = "button";
        item.textContent = keyword;
        item.addEventListener("click", async () =>
        {
            ui.historyDialog.close();
            state.keyword = keyword;
            ui.searchInput.value = keyword;
            await actions.reload_results();
        });
        ui.historySearchList.appendChild(item);
    }
}

/**
 * @brief 渲染最近打开列表
 *
 * @return 无
 */
function render_recent_snippets()
{
    const list = read_list(RECENT_KEY);
    ui.historySnippetList.innerHTML = "";
    ui.historySnippetEmpty.hidden = list.length > 0;
    for (const item of list)
    {
        const button = document.createElement("button");
        button.className = "history-item";
        button.type = "button";
        const title = document.createElement("span");
        title.className = "history-item-title";
        title.textContent = `#${item.id} ${item.zh_index || item.en_index || "未命名"}`;
        const meta = document.createElement("span");
        meta.className = "history-item-meta";
        meta.textContent = `${item.stack_name} · ${item.time}`;
        button.appendChild(title);
        button.appendChild(meta);
        button.addEventListener("click", async () =>
        {
            ui.historyDialog.close();
            if (item.stack_id !== state.currentStackId)
            {
                state.currentStackId = item.stack_id;
                await actions.reload_stacks();
            }
            state.keyword = String(item.id);
            ui.searchInput.value = state.keyword;
            await actions.reload_results();
            await actions.open_snippet(item.id);
        });
        ui.historySnippetList.appendChild(button);
    }
}

/**
 * @brief 清空本地记录
 *
 * @return 无
 */
function clear_history()
{
    localStorage.removeItem(SEARCH_KEY);
    localStorage.removeItem(RECENT_KEY);
    render_search_history();
    render_recent_snippets();
}

/**
 * @brief 绑定最近记录弹窗事件
 *
 * @return 无
 */
export function init_history()
{
    ui.btnHistory.addEventListener("click", open_history_dialog);
    ui.btnHistoryClear.addEventListener("click", clear_history);
    ui.btnHistoryClose.addEventListener("click", () => ui.historyDialog.close());
}
