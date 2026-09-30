import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";

/**
 * @brief 线性图标集合
 *
 * 统一使用 currentColor 描边, 通过 CSS 控制尺寸与颜色
 */
export const icons = {
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 6.2A9.9 9.9 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-2.4 3.1M6.3 7.9A16.6 16.6 0 0 0 2 12s3.6 6 10 6a9.7 9.7 0 0 0 4-.8"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4Z"/><path d="m14 6 4 4"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h11l3 3v15H5z"/><path d="M9 3v6h6V3M9 15h6"/></svg>',
    clone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="12" height="12" rx="2"/><path d="M8 20h10a2 2 0 0 0 2-2V8"/><path d="M10 10h-1M14 10h-1M10 14h-1M14 14h-1"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V9M7 13l5-5 5 5M5 4h14"/></svg>',
    database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m9 8-4 4 4 4M15 8l4 4-4 4"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></svg>',
    stack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 14 9 5 9-5"/></svg>',
};

/**
 * @brief 界面元素引用
 */
export const ui = {
    // 顶部工具栏
    btnSidebarToggle: document.getElementById("btn-sidebar-toggle"),
    connStatus: document.getElementById("conn-status"),
    connDot: document.getElementById("conn-dot"),
    connText: document.getElementById("conn-text"),
    searchInput: document.getElementById("search-input"),
    btnSearch: document.getElementById("btn-search"),
    btnNewData: document.getElementById("btn-new-data"),
    btnHistory: document.getElementById("btn-history"),
    btnTheme: document.getElementById("btn-theme"),
    btnMore: document.getElementById("btn-more"),
    moreMenu: document.getElementById("more-menu"),

    // 侧边栏
    sidebar: document.getElementById("sidebar"),
    sidebarList: document.getElementById("sidebar-list"),
    sidebarTotal: document.getElementById("sidebar-total"),
    btnNewStack: document.getElementById("btn-new-stack"),

    // 结果区
    resultTable: document.getElementById("result-table"),
    resultBody: document.getElementById("result-body"),
    resultState: document.getElementById("result-state"),
    resultStateText: document.getElementById("result-state-text"),
    btnResultAction: document.getElementById("btn-result-action"),
    btnLoadMore: document.getElementById("btn-load-more"),
    resultMeta: document.getElementById("result-meta"),

    // 详情区
    detailPanel: document.getElementById("detail-panel"),
    detailEmpty: document.getElementById("detail-empty"),
    detailBody: document.getElementById("detail-body"),
    codeId: document.getElementById("code-id"),
    detailStack: document.getElementById("detail-stack"),
    detailCreated: document.getElementById("detail-created"),
    detailUpdated: document.getElementById("detail-updated"),
    detailLines: document.getElementById("detail-lines"),
    contentEditor: document.getElementById("content-editor"),
    btnCodeCopy: document.getElementById("btn-code-copy"),
    btnCodeCopyMd: document.getElementById("btn-code-copy-md"),
    btnCodeExport: document.getElementById("btn-code-export"),
    btnCodeClone: document.getElementById("btn-code-clone"),
    btnCodeSave: document.getElementById("btn-code-save"),
    btnDelete: document.getElementById("btn-delete"),

    // 弹窗
    newDataDialog: document.getElementById("new-data-dialog"),
    newDataTitle: document.getElementById("new-data-title"),
    newDataStack: document.getElementById("new-data-stack"),
    newDataZh: document.getElementById("new-data-zh-index"),
    newDataEn: document.getElementById("new-data-en-index"),
    newDataCode: document.getElementById("new-data-code"),
    btnNewDataSave: document.getElementById("btn-new-data-save"),
    btnNewDataCancel: document.getElementById("btn-new-data-cancel"),

    stackDialog: document.getElementById("stack-dialog"),
    stackDialogTitle: document.getElementById("stack-dialog-title"),
    stackName: document.getElementById("stack-name"),
    stackDescription: document.getElementById("stack-description"),
    stackStatus: document.getElementById("stack-status"),
    btnStackSave: document.getElementById("btn-stack-save"),
    btnStackCancel: document.getElementById("btn-stack-cancel"),
    btnStackDelete: document.getElementById("btn-stack-delete"),

    settingsDialog: document.getElementById("settings-dialog"),
    settingHost: document.getElementById("setting-host"),
    settingPort: document.getElementById("setting-port"),
    settingUser: document.getElementById("setting-user"),
    settingPassword: document.getElementById("setting-password"),
    settingDatabase: document.getElementById("setting-database"),
    settingStatus: document.getElementById("setting-status"),
    btnSettingTest: document.getElementById("btn-setting-test"),
    btnSettingSave: document.getElementById("btn-setting-save"),
    btnSettingCancel: document.getElementById("btn-setting-cancel"),
    btnTogglePassword: document.getElementById("btn-toggle-password"),

    exportDialog: document.getElementById("export-dialog"),
    exportFormat: document.getElementById("export-format"),
    exportPath: document.getElementById("export-path"),
    exportStatus: document.getElementById("export-status"),
    btnExportBrowse: document.getElementById("btn-export-browse"),
    btnExportSave: document.getElementById("btn-export-save"),
    btnExportCancel: document.getElementById("btn-export-cancel"),

    importDialog: document.getElementById("import-dialog"),
    importPath: document.getElementById("import-path"),
    importStatus: document.getElementById("import-status"),
    importPreview: document.getElementById("import-preview"),
    importOverwrite: document.getElementById("import-overwrite"),
    btnImportBrowse: document.getElementById("btn-import-browse"),
    btnImportSave: document.getElementById("btn-import-save"),
    btnImportCancel: document.getElementById("btn-import-cancel"),

    sqlDialog: document.getElementById("sql-dialog"),
    sqlInput: document.getElementById("sql-input"),
    sqlReadonly: document.getElementById("sql-readonly"),
    sqlResult: document.getElementById("sql-result"),
    sqlHistory: document.getElementById("sql-history"),
    sqlHistoryBar: document.getElementById("sql-history-bar"),
    btnSqlRun: document.getElementById("btn-sql-run"),
    btnSqlClear: document.getElementById("btn-sql-clear"),
    btnSqlHistoryClear: document.getElementById("btn-sql-history-clear"),
    btnSqlClose: document.getElementById("btn-sql-close"),

    recycleDialog: document.getElementById("recycle-dialog"),
    recycleBody: document.getElementById("recycle-body"),
    recycleEmpty: document.getElementById("recycle-empty"),
    recycleStatus: document.getElementById("recycle-status"),
    btnRecycleClear: document.getElementById("btn-recycle-clear"),
    btnRecycleClose: document.getElementById("btn-recycle-close"),

    historyDialog: document.getElementById("history-dialog"),
    historySearchList: document.getElementById("history-search-list"),
    historySnippetList: document.getElementById("history-snippet-list"),
    historySearchEmpty: document.getElementById("history-search-empty"),
    historySnippetEmpty: document.getElementById("history-snippet-empty"),
    btnHistoryClear: document.getElementById("btn-history-clear"),
    btnHistoryClose: document.getElementById("btn-history-close"),

    confirmDialog: document.getElementById("confirm-dialog"),
    confirmTitle: document.getElementById("confirm-title"),
    confirmMessage: document.getElementById("confirm-message"),
    confirmButtons: document.getElementById("confirm-buttons"),

    statusbar: document.getElementById("statusbar"),
    toastLayer: document.getElementById("toast-layer"),
    dropHint: document.getElementById("drop-hint"),
    splitter: document.getElementById("splitter"),
};

/**
 * @brief 转义 HTML 特殊字符
 *
 * @param text 原始文本
 * @return 转义后的文本
 */
export function escape_html(text)
{
    return String(text ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

/**
 * @brief 复制文本到剪贴板
 *
 * WebView2 环境下剪贴板 API 可能不可用, 失败时使用隐藏文本框兜底
 *
 * @param text 文本内容
 * @return 是否复制成功
 */
export async function copy_text(text)
{
    try
    {
        await navigator.clipboard.writeText(text);
        return true;
    }
    catch (error)
    {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        textarea.remove();
        return ok;
    }
}

/**
 * @brief 显示轻量提示
 *
 * @param message 提示内容
 * @param options 提示参数, 支持 type / timeout / action
 * @return 无
 */
export function toast(message, options = {})
{
    const { type = "info", timeout = 2600, action = null } = options;
    const item = document.createElement("div");
    item.className = `toast toast--${type}`;
    const text = document.createElement("span");
    text.className = "toast-text";
    text.textContent = message;
    item.appendChild(text);
    if (action)
    {
        const button = document.createElement("button");
        button.className = "toast-action";
        button.textContent = action.label;
        button.addEventListener("click", () =>
        {
            action.run();
            item.remove();
        });
        item.appendChild(button);
    }
    ui.toastLayer.appendChild(item);
    setTimeout(() =>
    {
        item.classList.add("toast--out");
        setTimeout(() => item.remove(), 200);
    }, timeout);
}

/**
 * @brief 在状态栏显示临时消息
 *
 * @param message 消息内容
 * @param timeout 显示时长(毫秒), 默认 3000
 * @return 无
 */
export function show_status(message, timeout = 3000)
{
    ui.statusbar.textContent = message;
    clearTimeout(show_status.timer);
    if (timeout > 0)
    {
        show_status.timer = setTimeout(() => set_status_default(), timeout);
    }
}

/**
 * @brief 恢复状态栏默认内容
 *
 * @return 无
 */
export function set_status_default()
{
    ui.statusbar.textContent = "就绪";
}

/**
 * @brief 关闭其它已打开的弹窗并展示目标弹窗
 *
 * 浏览器不允许同时存在多个模态弹窗, 统一在此处理
 *
 * @param dialog 目标弹窗
 * @return 无
 */
export function show_dialog(dialog)
{
    for (const item of document.querySelectorAll("dialog[open]"))
    {
        if (item !== dialog)
        {
            item.close();
        }
    }
    restore_dialog_bounds(dialog);
    dialog.showModal();
}

/**
 * @brief 读取弹窗位置与尺寸记录
 *
 * @return 弹窗记录
 */
function load_dialog_bounds()
{
    try
    {
        return JSON.parse(localStorage.getItem("litelearn-dialog-bounds") || "{}");
    }
    catch (error)
    {
        return {};
    }
}

/**
 * @brief 恢复弹窗上次的位置与尺寸
 *
 * @param dialog 弹窗元素
 * @return 无
 */
export function restore_dialog_bounds(dialog)
{
    const bounds = load_dialog_bounds()[dialog.id];
    if (!is_valid_bounds(bounds))
    {
        return;
    }
    const width = Math.min(bounds.width, window.innerWidth);
    const height = Math.min(bounds.height, window.innerHeight);
    const max_left = Math.max(0, window.innerWidth - width);
    const max_top = Math.max(0, window.innerHeight - height);
    dialog.style.width = `${width}px`;
    dialog.style.height = `${height}px`;
    dialog.style.position = "fixed";
    dialog.style.margin = "0";
    dialog.style.left = `${Math.min(Math.max(0, bounds.left), max_left)}px`;
    dialog.style.top = `${Math.min(Math.max(0, bounds.top), max_top)}px`;
}

/**
 * @brief 判断弹窗位置与尺寸记录是否有效
 *
 * 弹窗关闭后元素不再渲染, 此时读取到的尺寸为 0, 这类记录不能用于恢复位置与尺寸
 *
 * @param bounds 弹窗位置与尺寸记录
 * @return 记录是否有效
 */
function is_valid_bounds(bounds)
{
    return (
        typeof bounds === "object" &&
        bounds !== null &&
        Number.isFinite(bounds.width) &&
        Number.isFinite(bounds.height) &&
        Number.isFinite(bounds.left) &&
        Number.isFinite(bounds.top) &&
        bounds.width > 0 &&
        bounds.height > 0
    );
}

/**
 * @brief 保存弹窗位置与尺寸
 *
 * @param dialog 弹窗元素
 * @return 无
 */
function save_dialog_bounds(dialog)
{
    if (!dialog.open || dialog.offsetWidth <= 0 || dialog.offsetHeight <= 0)
    {
        return;
    }
    const bounds = load_dialog_bounds();
    const rect = dialog.getBoundingClientRect();
    bounds[dialog.id] = {
        width: dialog.offsetWidth,
        height: dialog.offsetHeight,
        left: rect.left,
        top: rect.top,
    };
    localStorage.setItem("litelearn-dialog-bounds", JSON.stringify(bounds));
}

/**
 * @brief 使弹窗可通过指定手柄拖动
 *
 * @param dialog 弹窗元素
 * @param handle 拖动手柄
 * @return 无
 */
export function enable_drag(dialog, handle)
{
    handle.addEventListener("pointerdown", (event) =>
    {
        if (event.button !== 0)
        {
            return;
        }
        event.preventDefault();
        const rect = dialog.getBoundingClientRect();
        const startX = event.clientX;
        const startY = event.clientY;
        const originLeft = rect.left;
        const originTop = rect.top;
        try
        {
            handle.setPointerCapture(event.pointerId);
        }
        catch (error)
        {
            // 忽略指针捕获失败
        }
        const on_move = (move_event) =>
        {
            dialog.style.position = "fixed";
            dialog.style.margin = "0";
            dialog.style.left = `${originLeft + move_event.clientX - startX}px`;
            dialog.style.top = `${originTop + move_event.clientY - startY}px`;
        };
        const on_end = () =>
        {
            handle.removeEventListener("pointermove", on_move);
            handle.removeEventListener("pointerup", on_end);
            handle.removeEventListener("pointercancel", on_end);
            save_dialog_bounds(dialog);
        };
        handle.addEventListener("pointermove", on_move);
        handle.addEventListener("pointerup", on_end);
        handle.addEventListener("pointercancel", on_end);
    });
}

/**
 * @brief 使弹窗可通过右下角手柄调整大小
 *
 * @param dialog 弹窗元素
 * @param handle 缩放手柄
 * @param minWidth 最小宽度
 * @param minHeight 最小高度
 * @return 无
 */
export function enable_resize(dialog, handle, minWidth, minHeight)
{
    handle.addEventListener("pointerdown", (event) =>
    {
        if (event.button !== 0)
        {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = dialog.offsetWidth;
        const startHeight = dialog.offsetHeight;
        try
        {
            handle.setPointerCapture(event.pointerId);
        }
        catch (error)
        {
            // 忽略指针捕获失败
        }
        const on_move = (move_event) =>
        {
            const width = Math.max(minWidth, startWidth + move_event.clientX - startX);
            const height = Math.max(minHeight, startHeight + move_event.clientY - startY);
            dialog.style.width = `${width}px`;
            dialog.style.height = `${height}px`;
        };
        const on_end = () =>
        {
            handle.removeEventListener("pointermove", on_move);
            handle.removeEventListener("pointerup", on_end);
            handle.removeEventListener("pointercancel", on_end);
            save_dialog_bounds(dialog);
        };
        handle.addEventListener("pointermove", on_move);
        handle.addEventListener("pointerup", on_end);
        handle.addEventListener("pointercancel", on_end);
    });
}

/**
 * @brief 为全部弹窗绑定拖动, 缩放与尺寸记忆
 *
 * @return 无
 */
export function bind_dialog_layout()
{
    for (const dialog of document.querySelectorAll("dialog.resizable-dialog"))
    {
        for (const handle of dialog.querySelectorAll(".drag-handle"))
        {
            enable_drag(dialog, handle);
        }
        for (const handle of dialog.querySelectorAll(".resize-handle"))
        {
            enable_resize(dialog, handle, 320, 200);
        }
    }
}

/**
 * @brief 弹出多按钮确认框
 *
 * @param message 提示内容
 * @param buttons 按钮定义列表
 * @param options 其它参数, 支持 title 与 cancelValue
 * @return Promise, 解析为被点击按钮的值
 */
export function show_choice(message, buttons, options = {})
{
    return new Promise((resolve) =>
    {
        const { title = "确认", cancelValue = false } = options;
        for (const dialog of document.querySelectorAll("dialog[open]"))
        {
            if (dialog !== ui.confirmDialog)
            {
                dialog.close();
            }
        }
        ui.confirmTitle.textContent = title;
        ui.confirmMessage.textContent = message;
        ui.confirmButtons.innerHTML = "";
        let settled = false;
        const finish = (value) =>
        {
            if (settled)
            {
                return;
            }
            settled = true;
            ui.confirmDialog.close();
            resolve(value);
        };
        for (const item of buttons)
        {
            const button = document.createElement("button");
            button.className = `btn ${item.className || ""}`.trim();
            button.textContent = item.label;
            button.addEventListener("click", () => finish(item.value));
            ui.confirmButtons.appendChild(button);
        }
        ui.confirmDialog.addEventListener("close", () => finish(cancelValue), { once: true });
        ui.confirmDialog.showModal();
    });
}

/**
 * @brief 弹出确认框
 *
 * @param message 提示内容
 * @param options 参数, 支持 title / okText / danger
 * @return Promise, 解析为用户是否确认
 */
export function show_confirm(message, options = {})
{
    return show_choice(
        message,
        [
            {
                label: options.okText || "确定",
                value: true,
                className: options.danger ? "danger" : "primary",
            },
            { label: "取消", value: false },
        ],
        { title: options.title || "确认", cancelValue: false },
    );
}

/**
 * @brief 填充工具栏与侧边栏的固定图标
 *
 * @return 无
 */
export function init_icons()
{
    ui.btnSidebarToggle.innerHTML = icons.stack;
    ui.btnSearch.innerHTML = icons.search + "<span>搜索</span>";
    ui.btnNewData.innerHTML = icons.plus + "<span>新增数据</span>";
    ui.btnHistory.innerHTML = icons.clock;
    ui.btnMore.innerHTML = icons.more;
    ui.btnNewStack.innerHTML = icons.plus;
}

/**
 * @brief 初始化更多菜单
 *
 * @return 无
 */
export function init_menu()
{
    ui.btnMore.addEventListener("click", (event) =>
    {
        event.stopPropagation();
        ui.moreMenu.hidden = !ui.moreMenu.hidden;
        ui.btnMore.classList.toggle("active", !ui.moreMenu.hidden);
    });
    document.addEventListener("click", () => close_menu());
    ui.moreMenu.addEventListener("click", (event) => event.stopPropagation());
}

/**
 * @brief 关闭更多菜单
 *
 * @return 无
 */
export function close_menu()
{
    ui.moreMenu.hidden = true;
    ui.btnMore.classList.remove("active");
}

/**
 * @brief 依次切换主题模式
 *
 * @return 无
 */
export function cycle_theme()
{
    const order = ["system", "light", "dark"];
    const current = current_theme();
    const next = order[(order.indexOf(current) + 1) % order.length];
    apply_theme(next);
    toast(`主题已切换为${theme_label(next)}`);
}

/**
 * @brief 读取当前主题模式
 *
 * @return 主题模式
 */
export function current_theme()
{
    const saved = localStorage.getItem("litelearn-theme");
    return ["system", "light", "dark"].includes(saved) ? saved : "system";
}

/**
 * @brief 主题模式的中文名称
 *
 * @param mode 主题模式
 * @return 中文名称
 */
export function theme_label(mode)
{
    if (mode === "dark")
    {
        return "深色";
    }
    if (mode === "light")
    {
        return "浅色";
    }
    return "跟随系统";
}

/**
 * @brief 应用主题
 *
 * @param mode 主题模式, 支持 system / light / dark
 * @return 无
 */
export function apply_theme(mode)
{
    const prefers_dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = mode === "system" ? (prefers_dark ? "dark" : "light") : mode;
    document.documentElement.setAttribute("data-theme", resolved);
    localStorage.setItem("litelearn-theme", mode);
    ui.btnTheme.innerHTML = mode === "system" ? icons.monitor : (resolved === "dark" ? icons.sun : icons.moon);
    ui.btnTheme.title = `主题: ${theme_label(mode)}, 点击切换`;
    document.dispatchEvent(new CustomEvent("theme-change", { detail: { theme: resolved } }));
}

/**
 * @brief 初始化主题, 并在跟随系统时响应系统主题变化
 *
 * @return 无
 */
export function init_theme()
{
    apply_theme(current_theme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", () =>
    {
        if (current_theme() === "system")
        {
            apply_theme("system");
        }
    });
}

/**
 * @brief 当前是否为深色主题
 *
 * @return 是否深色
 */
export function is_dark()
{
    return document.documentElement.getAttribute("data-theme") === "dark";
}

/**
 * @brief 恢复上次的窗口尺寸
 *
 * @return 无
 */
export async function init_window_size()
{
    try
    {
        const saved = JSON.parse(localStorage.getItem("litelearn-window-size") || "null");
        if (saved && saved.width && saved.height)
        {
            await getCurrentWindow().setSize(new LogicalSize(saved.width, saved.height));
        }
    }
    catch (error)
    {
        // 窗口尺寸记忆不可用时忽略
    }
}

/**
 * @brief 监听窗口尺寸变化并记录
 *
 * @return 无
 */
export async function watch_window_size()
{
    try
    {
        let timer = null;
        await getCurrentWindow().onResized(({ payload }) =>
        {
            clearTimeout(timer);
            timer = setTimeout(() =>
            {
                const factor = window.devicePixelRatio || 1;
                const width = Math.round(payload.width / factor);
                const height = Math.round(payload.height / factor);
                if (width >= 900 && height >= 600)
                {
                    localStorage.setItem("litelearn-window-size", JSON.stringify({ width, height }));
                }
            }, 400);
        });
    }
    catch (error)
    {
        // 事件监听不可用时忽略
    }
}
