//! Codex Desktop - A beautiful desktop GUI for Codex CLI
//!
//! This application provides a visual interface for interacting with the Codex CLI,
//! offering features like project management, session handling, diff previews,
//! and command execution with safety controls.

pub mod app_server;
pub mod codex_import;
pub mod commands;
pub mod database;
pub mod snapshots;

mod events;
mod global_state;
mod health;
mod error;
mod state;
mod utils;

pub use error::{CodexErrorInfo, CodexErrorType, Error, Result};
pub use state::AppState;

use std::io;
use tauri::{Manager, WindowEvent};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

/// Clean up old temp image files from previous sessions
fn cleanup_temp_images() {
    let temp_dir = std::env::temp_dir();

    if let Ok(entries) = std::fs::read_dir(&temp_dir) {
        let current_pid = std::process::id();
        let mut cleaned = 0;

        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                // Match codex_image_<pid>_<timestamp>.<ext> pattern
                if name.starts_with("codex_image_") {
                    // Extract PID from filename
                    let parts: Vec<&str> = name.split('_').collect();
                    if parts.len() >= 3 {
                        if let Ok(pid) = parts[2].parse::<u32>() {
                            // Only clean files from other PIDs (not current session)
                            if pid != current_pid {
                                if let Ok(metadata) = std::fs::metadata(&path) {
                                    // Only delete files older than 1 hour
                                    if let Ok(modified) = metadata.modified() {
                                        if let Ok(age) = std::time::SystemTime::now().duration_since(modified) {
                                            if age.as_secs() > 3600
                                                && std::fs::remove_file(&path).is_ok()
                                            {
                                                cleaned += 1;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if cleaned > 0 {
            tracing::info!("Cleaned up {} old temp image files", cleaned);
        }
    }
}

/// Initialize and run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Clean up old temp images from previous sessions
    cleanup_temp_images();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                if let Err(err) = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None) {
                    tracing::warn!("Failed to apply Sidebar vibrancy: {}", err);
                    let _ = apply_vibrancy(
                        &window,
                        NSVisualEffectMaterial::AppearanceBased,
                        None,
                        None,
                    );
                }
            }

            // Initialize logging (file + stdout)
            let log_guard = init_tracing(&app_handle);

            tracing::info!("Starting Codex Desktop");

            // Initialize application state
            let state = AppState::new(&app_handle, log_guard)?;
            app.manage(state);
            app.manage(commands::system::CaffeinateState(std::sync::Mutex::new(None)));
            app.state::<AppState>().start_background_tasks();

            tracing::info!("Application state initialized");
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::CloseRequested { .. } | WindowEvent::Destroyed) {
                if let Some(state) = window.app_handle().try_state::<AppState>() {
                    if let Err(err) = state.global_state.flush() {
                        tracing::warn!("Failed to flush global state on close: {}", err);
                    }
                }
                // Clean up caffeinate process on app close
                if let Some(caff) = window.app_handle().try_state::<commands::system::CaffeinateState>() {
                    if let Ok(mut guard) = caff.0.lock() {
                        if let Some(mut child) = guard.take() {
                            let _ = child.kill();
                            let _ = child.wait();
                            tracing::info!("Caffeinate process cleaned up on window close");
                        }
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Project commands
            commands::projects::list_projects,
            commands::projects::add_project,
            commands::projects::remove_project,
            commands::projects::update_project,
            commands::projects::get_project_git_info,
            commands::projects::get_project_git_diff,
            commands::projects::git_diff_staged,
            commands::projects::git_diff_branch,
            commands::projects::list_project_files,
            commands::projects::validate_project_directory,
            commands::projects::read_project_file,
            commands::projects::get_git_branches,
            commands::projects::get_git_commits,
            commands::projects::git_status,
            commands::projects::git_stage_files,
            commands::projects::git_unstage_files,
            commands::projects::git_commit,
            commands::projects::git_push,
            commands::projects::git_remote_info,
            commands::projects::git_apply_patch,
            // PR commands
            commands::projects::check_gh_cli,
            commands::projects::get_current_branch,
            commands::projects::create_pull_request,
            // Worktree commands
            commands::projects::create_worktree,
            commands::projects::remove_worktree,
            commands::projects::list_worktrees,
            // Session commands
            commands::sessions::list_sessions,
            commands::sessions::get_session,
            commands::sessions::update_session_metadata,
            commands::sessions::delete_session,
            commands::sessions::search_sessions,
            commands::sessions::update_session_status,
            commands::sessions::set_session_first_message,
            commands::sessions::update_session_tasks,
            // Thread commands (proxy to app-server)
            commands::thread::start_thread,
            commands::thread::resume_thread,
            commands::thread::send_message,
            commands::thread::interrupt_turn,
            commands::thread::respond_to_approval,
            commands::thread::list_threads,
            // Snapshot commands
            commands::snapshots::create_snapshot,
            commands::snapshots::revert_to_snapshot,
            commands::snapshots::list_snapshots,
            commands::snapshots::cleanup_old_snapshots_by_age,
            commands::snapshots::cleanup_session_snapshots,
            // App server commands
            commands::app_server::get_server_status,
            commands::app_server::restart_server,
            commands::app_server::get_account_info,
            commands::app_server::start_login,
            commands::app_server::logout,
            commands::app_server::get_models,
            commands::app_server::list_skills,
            commands::app_server::list_mcp_servers,
            commands::app_server::start_review,
            commands::app_server::run_user_shell_command,
            // Config commands
            commands::app_server::read_config,
            commands::app_server::write_config,
            // Account rate limits
            commands::app_server::get_account_rate_limits,
            // Allowlist commands
            commands::allowlist::get_allowlist,
            commands::allowlist::add_to_allowlist,
            commands::allowlist::remove_from_allowlist,
            // Codex CLI import commands
            commands::codex_import::get_codex_config,
            commands::codex_import::list_codex_sessions,
            commands::codex_import::get_codex_session,
            commands::codex_import::search_codex_sessions,
            commands::codex_import::delete_codex_session,
            commands::codex_import::get_codex_dir,
            // Terminal commands
            commands::terminal::execute_terminal_command,
            // Renderer lifecycle
            commands::lifecycle::renderer_ready,
            commands::lifecycle::renderer_heartbeat,
            // System commands (keep awake)
            commands::system::start_keep_awake,
            commands::system::stop_keep_awake,
            commands::system::is_keep_awake_active,
            // Diagnostics
            commands::system::get_app_paths,
            commands::system::get_log_tail,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn init_tracing(app_handle: &tauri::AppHandle) -> Option<tracing_appender::non_blocking::WorkerGuard> {
    let env_filter = tracing_subscriber::EnvFilter::from_default_env()
        .add_directive("codex_desktop=debug".parse().unwrap());

    let stdout_layer = tracing_subscriber::fmt::layer().with_writer(io::stdout);
    let mut guard = None;
    let mut file_layer = None;
    if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
        let log_dir = app_data_dir.join("logs");
        if std::fs::create_dir_all(&log_dir).is_ok() {
            let file_appender = tracing_appender::rolling::daily(&log_dir, "codex-desktop.log");
            let (non_blocking, file_guard) = tracing_appender::non_blocking(file_appender);
            file_layer = Some(tracing_subscriber::fmt::layer()
                .with_writer(non_blocking)
                .with_ansi(false));
            guard = Some(file_guard);
        }
    }

    tracing_subscriber::registry()
        .with(env_filter)
        .with(stdout_layer)
        .with(file_layer)
        .init();
    guard
}
