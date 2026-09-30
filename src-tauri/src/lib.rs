mod backup;
mod commands;
mod config;
mod db;
mod models;

use db::AppState;
use tauri::Manager;

/**
 * @brief 启动 Tauri 应用
 *
 * @return 无
 */
pub fn run()
{
    tauri::Builder::default()
        .setup(|app|
        {
            // 加载数据库配置并挂载到全局状态
            let db_config = config::load(app.handle());
            app.manage(AppState::new(db_config));
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::list_stacks,
            commands::search_snippets,
            commands::create_stack,
            commands::update_stack,
            commands::delete_stack,
            commands::add_snippet,
            commands::update_snippet,
            commands::delete_snippet,
            commands::list_deleted_snippets,
            commands::restore_snippet,
            commands::purge_snippet,
            commands::purge_all_deleted,
            commands::export_backup,
            commands::export_snippet,
            commands::preview_import,
            commands::import_backup,
            commands::get_config,
            commands::save_config,
            commands::test_connection,
            commands::check_connection,
            commands::analyze_sql,
            commands::execute_sql
        ])
        .run(tauri::generate_context!())
        .expect("Tauri 应用启动失败");
}
