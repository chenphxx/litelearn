import * as api from "./api.js";
import { state } from "./state.js";
import { escape_html, show_confirm, show_dialog, toast, ui } from "./ui.js";

/** SQL 历史记录存储键 */
const HISTORY_KEY = "litelearn-sql-history";

/** 最多保存的历史条数 */
const MAX_HISTORY = 10;

/** 结果表格最多渲染的行数 */
const MAX_ROWS = 200;

/**
 * @brief 打开 SQL 控制台
 *
 * @return 无
 */
export function open_sql_dialog()
{
    ui.sqlReadonly.checked = state.sqlReadonly;
    render_history();
    show_dialog(ui.sqlDialog);
    ui.sqlInput.focus();
}

/**
 * @brief 执行 SQL 语句
 *
 * @return 无
 */
async function run_sql()
{
    const sql = ui.sqlInput.value.trim();
    if (!sql)
    {
        toast("请输入要执行的 SQL 语句", { type: "info" });
        return;
    }
    try
    {
        const analysis = await api.analyze_sql(sql);
        if (analysis.dangerous)
        {
            const ok = await show_confirm(
                `该语句可能修改或删除数据结构, 是否继续执行?\n\n${sql.slice(0, 200)}`,
                { title: "危险操作", okText: "继续执行", danger: true },
            );
            if (!ok)
            {
                return;
            }
        }
        ui.sqlResult.innerHTML = '<span class="sql-hint">正在执行...</span>';
        const result = await api.execute_sql(sql, ui.sqlReadonly.checked);
        push_history(sql);
        render_result(result);
    }
    catch (error)
    {
        ui.sqlResult.innerHTML = `<span class="sql-error">执行失败: ${escape_html(error)}</span>`;
    }
}

/**
 * @brief 渲染执行结果
 *
 * @param result 执行结果
 * @return 无
 */
function render_result(result)
{
    if (!result.columns || result.columns.length === 0)
    {
        ui.sqlResult.innerHTML = `<span class="sql-hint">执行成功, 影响 ${result.affected} 行</span>`;
        return;
    }
    const rows = result.rows.slice(0, MAX_ROWS);
    const head = result.columns.map((name) => `<th>${escape_html(name)}</th>`).join("");
    const body = rows
        .map(
            (row) =>
                `<tr>${row.map((value) => `<td>${escape_html(value)}</td>`).join("")}</tr>`,
        )
        .join("");
    const more =
        result.rows.length > MAX_ROWS
            ? `<div class="sql-hint">仅显示前 ${MAX_ROWS} 行, 共 ${result.rows.length} 行</div>`
            : "";
    ui.sqlResult.innerHTML =
        `<div class="sql-table-wrap"><table class="sql-table"><thead><tr>${head}</tr></thead>` +
        `<tbody>${body}</tbody></table></div>` +
        `<div class="sql-hint">共 ${result.rows.length} 行</div>${more}`;
}

/**
 * @brief 保存 SQL 历史
 *
 * @param sql SQL 语句
 * @return 无
 */
function push_history(sql)
{
    const list = read_history().filter((item) => item !== sql);
    list.unshift(sql);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
    render_history();
}

/**
 * @brief 读取 SQL 历史
 *
 * @return 历史列表
 */
function read_history()
{
    try
    {
        const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
        return Array.isArray(value) ? value : [];
    }
    catch (error)
    {
        return [];
    }
}

/**
 * @brief 渲染 SQL 历史
 *
 * @return 无
 */
function render_history()
{
    const list = read_history();
    ui.sqlHistory.innerHTML = "";
    ui.sqlHistoryBar.hidden = list.length === 0;
    for (const sql of list)
    {
        const entry = document.createElement("span");
        entry.className = "sql-history-entry";
        const item = document.createElement("button");
        item.className = "history-item";
        item.type = "button";
        item.title = sql;
        item.textContent = sql.replace(/\s+/g, " ").slice(0, 80);
        item.addEventListener("click", () =>
        {
            ui.sqlInput.value = sql;
            ui.sqlInput.focus();
        });
        const remove = document.createElement("button");
        remove.className = "history-remove";
        remove.type = "button";
        remove.title = "删除该记录";
        remove.textContent = "×";
        remove.addEventListener("click", () => remove_history(sql));
        entry.appendChild(item);
        entry.appendChild(remove);
        ui.sqlHistory.appendChild(entry);
    }
}

/**
 * @brief 删除单条 SQL 历史
 *
 * @param sql 待删除的 SQL 语句
 * @return 无
 */
function remove_history(sql)
{
    const list = read_history().filter((item) => item !== sql);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    render_history();
}

/**
 * @brief 清空 SQL 历史
 *
 * @return 无
 */
function clear_history()
{
    localStorage.removeItem(HISTORY_KEY);
    render_history();
}

/**
 * @brief 绑定 SQL 控制台事件
 *
 * @return 无
 */
export function init_sql()
{
    ui.btnSqlRun.addEventListener("click", run_sql);
    ui.btnSqlHistoryClear.addEventListener("click", clear_history);
    ui.btnSqlClear.addEventListener("click", () =>
    {
        ui.sqlInput.value = "";
        ui.sqlResult.innerHTML = "";
    });
    ui.btnSqlClose.addEventListener("click", () => ui.sqlDialog.close());
    ui.sqlReadonly.addEventListener("change", () =>
    {
        state.sqlReadonly = ui.sqlReadonly.checked;
        localStorage.setItem("litelearn-sql-readonly", state.sqlReadonly ? "1" : "0");
    });
    ui.sqlInput.addEventListener("keydown", (event) =>
    {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey))
        {
            event.preventDefault();
            run_sql();
        }
    });
    state.sqlReadonly = localStorage.getItem("litelearn-sql-readonly") !== "0";
}
