import * as api from "./api.js";
import { state } from "./state.js";
import { icons, show_dialog, toast, ui } from "./ui.js";

/**
 * @brief 刷新数据库连接状态
 *
 * @return 是否已连接
 */
export async function refresh_connection()
{
    try
    {
        const version = await api.check_connection();
        state.connected = true;
        ui.connDot.classList.remove("offline");
        ui.connText.textContent = `MySQL ${version}`;
        return true;
    }
    catch (error)
    {
        state.connected = false;
        ui.connDot.classList.add("offline");
        ui.connText.textContent = "未连接";
        return false;
    }
}

/**
 * @brief 打开设置弹窗
 *
 * @param message 状态区提示内容
 * @return 无
 */
export async function open_settings(message = "")
{
    try
    {
        const config = await api.get_config();
        ui.settingHost.value = config.host;
        ui.settingPort.value = String(config.port);
        ui.settingUser.value = config.user;
        ui.settingPassword.value = config.password;
        ui.settingDatabase.value = config.database;
    }
    catch (error)
    {
        toast(`读取配置失败: ${error}`, { type: "error" });
    }
    ui.settingStatus.classList.remove("error");
    ui.settingStatus.textContent = message;
    show_dialog(ui.settingsDialog);
}

/**
 * @brief 读取设置表单内容
 *
 * @return 数据库配置
 */
function read_settings_form()
{
    return {
        host: ui.settingHost.value.trim(),
        port: Number(ui.settingPort.value) || 0,
        user: ui.settingUser.value.trim(),
        password: ui.settingPassword.value,
        database: ui.settingDatabase.value.trim(),
    };
}

/**
 * @brief 测试数据库连接
 *
 * @return 无
 */
async function test_connection()
{
    ui.settingStatus.classList.remove("error");
    ui.settingStatus.textContent = "正在测试连接...";
    try
    {
        const version = await api.test_connection(read_settings_form());
        ui.settingStatus.textContent = `连接成功, MySQL 版本 ${version}`;
    }
    catch (error)
    {
        ui.settingStatus.classList.add("error");
        ui.settingStatus.textContent = `连接失败: ${error}`;
    }
}

/**
 * @brief 保存数据库配置
 *
 * @return 无
 */
async function save_settings()
{
    ui.settingStatus.classList.remove("error");
    ui.settingStatus.textContent = "正在保存...";
    try
    {
        await api.save_config(read_settings_form());
        ui.settingStatus.textContent = "已保存并应用";
        toast("数据库配置已保存", { type: "success" });
        const connected = await refresh_connection();
        if (connected)
        {
            ui.settingsDialog.close();
        }
    }
    catch (error)
    {
        ui.settingStatus.classList.add("error");
        ui.settingStatus.textContent = `保存失败: ${error}`;
        await refresh_connection();
    }
}

/**
 * @brief 切换密码显示状态
 *
 * @return 无
 */
function toggle_password()
{
    const input = ui.settingPassword;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    ui.btnTogglePassword.innerHTML = show ? icons.eyeOff : icons.eye;
}

/**
 * @brief 绑定连接状态与设置弹窗事件
 *
 * @return 无
 */
export function init_connection()
{
    ui.connStatus.addEventListener("click", () => open_settings());
    ui.btnSettingTest.addEventListener("click", test_connection);
    ui.btnSettingSave.addEventListener("click", save_settings);
    ui.btnSettingCancel.addEventListener("click", () => ui.settingsDialog.close());
    ui.btnTogglePassword.addEventListener("click", toggle_password);
}
