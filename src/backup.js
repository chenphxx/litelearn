import { getCurrentWebview } from "@tauri-apps/api/webview";
import * as api from "./api.js";
import { actions } from "./state.js";
import { show_dialog, toast, ui } from "./ui.js";

/** 当前选中的导入文件路径 */
let import_path = "";

/** 当前导入文件格式 */
let import_format = "json";

/**
 * @brief 生成备份文件名中的时间戳
 *
 * @return 时间戳文本
 */
function timestamp()
{
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

/**
 * @brief 打开导出弹窗
 *
 * @return 无
 */
export function open_export_dialog()
{
    ui.exportPath.value = "";
    ui.exportStatus.classList.remove("error");
    ui.exportStatus.textContent = "";
    show_dialog(ui.exportDialog);
}

/**
 * @brief 选择导出路径
 *
 * @return 无
 */
async function browse_export()
{
    const format = ui.exportFormat.value;
    const path = await api.pick_save_path({
        title: "导出备份",
        defaultPath: `litelearn-${timestamp()}.${format}`,
        filters: [
            {
                name: format === "json" ? "JSON 备份" : "CSV 表格",
                extensions: [format],
            },
        ],
    });
    if (path)
    {
        ui.exportPath.value = path;
    }
}

/**
 * @brief 执行导出
 *
 * @return 无
 */
async function do_export()
{
    const path = ui.exportPath.value.trim();
    if (!path)
    {
        ui.exportStatus.classList.add("error");
        ui.exportStatus.textContent = "请先选择保存位置";
        return;
    }
    ui.exportStatus.classList.remove("error");
    ui.exportStatus.textContent = "正在导出...";
    try
    {
        const summary = await api.export_backup(ui.exportFormat.value, path);
        ui.exportStatus.textContent = `已导出 ${summary.stacks} 个技术栈, ${summary.snippets} 篇文章`;
        toast(`导出完成: ${summary.stacks} 个技术栈, ${summary.snippets} 篇文章`, {
            type: "success",
        });
    }
    catch (error)
    {
        ui.exportStatus.classList.add("error");
        ui.exportStatus.textContent = `导出失败: ${error}`;
    }
}

/**
 * @brief 打开导入弹窗
 *
 * @param path 备份文件路径, 传入时直接预览
 * @return 无
 */
export async function open_import_dialog(path = "")
{
    import_path = path || "";
    import_format = format_of(import_path);
    ui.importPath.value = import_path;
    ui.importStatus.classList.remove("error");
    ui.importStatus.textContent = "";
    ui.importPreview.hidden = true;
    ui.btnImportSave.disabled = true;
    show_dialog(ui.importDialog);
    if (import_path)
    {
        await refresh_preview();
    }
}

/**
 * @brief 根据文件扩展名判断备份格式
 *
 * @param path 文件路径
 * @return 格式, 支持 json 与 csv
 */
function format_of(path)
{
    return String(path).toLowerCase().endsWith(".csv") ? "csv" : "json";
}

/**
 * @brief 选择导入文件
 *
 * @return 无
 */
async function browse_import()
{
    const path = await api.pick_open_path({
        title: "选择备份文件",
        multiple: false,
        filters: [{ name: "备份文件", extensions: ["json", "csv"] }],
    });
    if (!path)
    {
        return;
    }
    import_path = path;
    import_format = format_of(path);
    ui.importPath.value = path;
    await refresh_preview();
}

/**
 * @brief 预览导入结果
 *
 * @return 无
 */
async function refresh_preview()
{
    if (!import_path)
    {
        return;
    }
    ui.importStatus.classList.remove("error");
    ui.importStatus.textContent = "正在分析备份文件...";
    ui.importPreview.hidden = true;
    ui.btnImportSave.disabled = true;
    try
    {
        const summary = await api.preview_import(
            import_format,
            import_path,
            ui.importOverwrite.checked,
        );
        ui.importStatus.textContent = "";
        render_preview(summary);
        ui.btnImportSave.disabled = summary.snippets_imported + summary.snippets_updated === 0;
        if (ui.btnImportSave.disabled)
        {
            ui.importStatus.textContent = "没有需要导入的新数据";
        }
    }
    catch (error)
    {
        ui.importStatus.classList.add("error");
        ui.importStatus.textContent = `分析失败: ${error}`;
    }
}

/**
 * @brief 渲染导入预览
 *
 * @param summary 导入统计
 * @return 无
 */
function render_preview(summary)
{
    ui.importPreview.hidden = false;
    ui.importPreview.innerHTML = `
        <div class="preview-grid">
            <span>新建技术栈</span><strong>${summary.stacks_created}</strong>
            <span>已存在技术栈</span><strong>${summary.stacks_existed}</strong>
            <span>新增文章</span><strong>${summary.snippets_imported}</strong>
            <span>覆盖文章</span><strong>${summary.snippets_updated}</strong>
            <span>跳过文章</span><strong>${summary.snippets_skipped}</strong>
        </div>`;
}

/**
 * @brief 执行导入
 *
 * @return 无
 */
async function do_import()
{
    if (!import_path)
    {
        ui.importStatus.classList.add("error");
        ui.importStatus.textContent = "请先选择备份文件";
        return;
    }
    ui.importStatus.classList.remove("error");
    ui.importStatus.textContent = "正在导入...";
    try
    {
        const summary = await api.import_backup(
            import_format,
            import_path,
            ui.importOverwrite.checked,
        );
        ui.importStatus.textContent =
            `新增 ${summary.snippets_imported} 条, 覆盖 ${summary.snippets_updated} 条, ` +
            `跳过 ${summary.snippets_skipped} 条`;
        toast("导入完成", { type: "success" });
        await actions.reload_stacks();
        await actions.reload_results();
        await refresh_preview();
    }
    catch (error)
    {
        ui.importStatus.classList.add("error");
        ui.importStatus.textContent = `导入失败: ${error}`;
    }
}

/**
 * @brief 监听窗口文件拖放
 *
 * @return 无
 */
async function init_drag_drop()
{
    try
    {
        await getCurrentWebview().onDragDropEvent((event) =>
        {
            if (event.payload.type === "over")
            {
                ui.dropHint.hidden = false;
                return;
            }
            ui.dropHint.hidden = true;
            if (event.payload.type !== "drop")
            {
                return;
            }
            const path = (event.payload.paths || []).find((item) => /\.(json|csv)$/i.test(item));
            if (path)
            {
                open_import_dialog(path);
            }
        });
    }
    catch (error)
    {
        // 拖放不可用时忽略
    }
}

/**
 * @brief 绑定备份相关事件
 *
 * @return 无
 */
export function init_backup()
{
    ui.btnExportBrowse.addEventListener("click", browse_export);
    ui.btnExportSave.addEventListener("click", do_export);
    ui.btnExportCancel.addEventListener("click", () => ui.exportDialog.close());
    ui.exportFormat.addEventListener("change", () =>
    {
        ui.exportPath.value = "";
        ui.exportStatus.textContent = "";
    });
    ui.btnImportBrowse.addEventListener("click", browse_import);
    ui.btnImportSave.addEventListener("click", do_import);
    ui.btnImportCancel.addEventListener("click", () => ui.importDialog.close());
    ui.importOverwrite.addEventListener("change", refresh_preview);
    init_drag_drop();
}
