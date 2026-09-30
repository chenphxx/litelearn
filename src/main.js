import { init_backup, open_export_dialog, open_import_dialog } from "./backup.js";
import { init_connection, open_settings, refresh_connection } from "./connection.js";
import {
    confirm_leave,
    init_detail,
    on_editor_change,
    open_snippet,
    save_current,
} from "./detail.js";
import { init_editors, init_font_size } from "./editor.js";
import { init_history, open_history_dialog, push_search_history } from "./history.js";
import { init_recycle, open_recycle_dialog } from "./recycle.js";
import { init_results, refresh as refresh_results } from "./results.js";
import { init_snippet_form, open_new_snippet } from "./snippet-form.js";
import { init_sql, open_sql_dialog } from "./sql.js";
import { init_stacks, load_stacks, open_create_dialog, select_stack } from "./stacks.js";
import { actions, state } from "./state.js";
import {
    bind_dialog_layout,
    close_menu,
    cycle_theme,
    init_icons,
    init_menu,
    init_theme,
    init_window_size,
    show_status,
    toast,
    ui,
    watch_window_size,
} from "./ui.js";

/**
 * @brief 执行一次搜索
 *
 * @return 无
 */
async function do_search()
{
    state.keyword = ui.searchInput.value;
    push_search_history(state.keyword.trim());
    await refresh_results();
}

/**
 * @brief 装配模块之间的动作
 *
 * @return 无
 */
function wire_actions()
{
    actions.open_snippet = open_snippet;
    actions.save_current = save_current;
    actions.confirm_leave = confirm_leave;
    actions.reload_results = refresh_results;
    actions.reload_stacks = load_stacks;
    actions.select_stack = select_stack;
    actions.open_new_snippet = open_new_snippet;
    actions.refresh_connection = refresh_connection;
}

/**
 * @brief 绑定更多菜单中的动作
 *
 * @return 无
 */
function init_menu_actions()
{
    const handlers = {
        "new-stack": open_create_dialog,
        export: open_export_dialog,
        import: () => open_import_dialog(),
        sql: open_sql_dialog,
        recycle: open_recycle_dialog,
        history: open_history_dialog,
        settings: () => open_settings(),
    };
    for (const button of ui.moreMenu.querySelectorAll("[data-action]"))
    {
        button.addEventListener("click", async () =>
        {
            close_menu();
            const handler = handlers[button.dataset.action];
            if (handler)
            {
                await handler();
            }
        });
    }
}

/**
 * @brief 初始化侧边栏折叠
 *
 * @return 无
 */
function init_sidebar_toggle()
{
    state.sidebarCollapsed = localStorage.getItem("litelearn-sidebar-collapsed") === "1";
    ui.sidebar.classList.toggle("collapsed", state.sidebarCollapsed);
    ui.btnSidebarToggle.addEventListener("click", () =>
    {
        state.sidebarCollapsed = !state.sidebarCollapsed;
        ui.sidebar.classList.toggle("collapsed", state.sidebarCollapsed);
        localStorage.setItem("litelearn-sidebar-collapsed", state.sidebarCollapsed ? "1" : "0");
    });
}

/**
 * @brief 初始化详情区宽度分隔条
 *
 * 拖动分隔条调整详情区宽度, 并将结果记忆到本地
 *
 * @return 无
 */

/**
 * @brief 初始化快捷键
 *
 * @return 无
 */
function init_shortcuts()
{
    document.addEventListener("keydown", (event) =>
    {
        if (!(event.ctrlKey || event.metaKey))
        {
            return;
        }
        const key = event.key.toLowerCase();
        if (key === "s")
        {
            event.preventDefault();
            save_current();
        }
        else if (key === "f")
        {
            event.preventDefault();
            ui.searchInput.focus();
            ui.searchInput.select();
        }
        else if (key === "n")
        {
            event.preventDefault();
            open_new_snippet();
        }
        else if (key === "k")
        {
            event.preventDefault();
            close_menu();
            open_sql_dialog();
        }
    });
}

/**
 * @brief 应用初始化入口
 *
 * @return 无
 */
async function init()
{
    init_theme();
    bind_dialog_layout();
    init_menu();
    init_stacks();
    init_results();
    init_detail();
    init_snippet_form();
    init_backup();
    init_recycle();
    init_history();
    init_connection();
    wire_actions();
    init_menu_actions();
    init_sidebar_toggle();
    init_icons();
    init_shortcuts();

    ui.btnSearch.addEventListener("click", do_search);
    ui.searchInput.addEventListener("keydown", (event) =>
    {
        if (event.key === "Enter")
        {
            do_search();
        }
    });

    await load_stacks();

    const connected = await refresh_connection();
    if (connected)
    {
        await refresh_results();
        show_status("就绪", 0);
    }
    else
    {
        show_status("数据库未连接, 请检查设置", 0);
        toast("数据库未连接, 请先完成连接设置", { type: "error", timeout: 5000 });
        await open_settings("数据库连接失败, 请检查连接信息");
    }
}

init();
