//! System commands for keep-awake (caffeinate) management

use std::fs;
use std::io::{Read, Seek, SeekFrom};
use std::process::{Child, Command};
use std::sync::Mutex;
use serde::Serialize;
use tauri::Manager;
use tauri::State;

/// Holds the caffeinate child process handle
pub struct CaffeinateState(pub Mutex<Option<Child>>);

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPaths {
    pub app_data_dir: Option<String>,
    pub log_dir: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogTailResponse {
    pub file: Option<String>,
    pub content: String,
    pub truncated: bool,
}

/// Get app-specific paths for diagnostics.
#[tauri::command]
pub fn get_app_paths(app: tauri::AppHandle) -> AppPaths {
    let app_data_dir = app.path().app_data_dir().ok();
    let log_dir = app_data_dir.as_ref().map(|p| p.join("logs"));

    AppPaths {
        app_data_dir: app_data_dir.map(|p| p.to_string_lossy().into_owned()),
        log_dir: log_dir.map(|p| p.to_string_lossy().into_owned()),
    }
}

fn find_latest_log_file(log_dir: &std::path::Path) -> Option<std::path::PathBuf> {
    let mut best: Option<(std::time::SystemTime, std::path::PathBuf)> = None;
    let entries = fs::read_dir(log_dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        // Limit to our rolling file prefix to avoid leaking arbitrary files from the directory.
        let name = path.file_name()?.to_string_lossy();
        if !name.starts_with("codex-desktop.log") {
            continue;
        }
        let meta = entry.metadata().ok()?;
        let modified = meta.modified().ok()?;
        match &best {
            None => best = Some((modified, path)),
            Some((best_time, _)) => {
                if modified > *best_time {
                    best = Some((modified, path));
                }
            }
        }
    }
    best.map(|(_, p)| p)
}

/// Read the tail of the most recent log file for quick diagnostics.
#[tauri::command]
pub fn get_log_tail(app: tauri::AppHandle, max_bytes: Option<u32>) -> Result<LogTailResponse, String> {
    let max_bytes = max_bytes.unwrap_or(200_000) as u64;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let log_dir = app_data_dir.join("logs");

    if !log_dir.exists() {
        return Ok(LogTailResponse {
            file: None,
            content: String::new(),
            truncated: false,
        });
    }

    let latest = find_latest_log_file(&log_dir);
    let Some(file_path) = latest else {
        return Ok(LogTailResponse {
            file: None,
            content: String::new(),
            truncated: false,
        });
    };

    let mut file = fs::File::open(&file_path).map_err(|e| e.to_string())?;
    let len = file.metadata().map_err(|e| e.to_string())?.len();
    let truncated = len > max_bytes;
    if truncated {
        let start = len.saturating_sub(max_bytes);
        file.seek(SeekFrom::Start(start)).map_err(|e| e.to_string())?;
    }

    let mut buf = Vec::new();
    file.read_to_end(&mut buf).map_err(|e| e.to_string())?;
    let content = String::from_utf8_lossy(&buf).into_owned();

    Ok(LogTailResponse {
        file: Some(file_path.to_string_lossy().into_owned()),
        content,
        truncated,
    })
}

/// Start caffeinate to prevent system sleep
#[tauri::command]
pub async fn start_keep_awake(state: State<'_, CaffeinateState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if guard.is_some() {
        return Ok(());
    }
    let child = Command::new("caffeinate")
        .arg("-d") // prevent display sleep
        .arg("-i") // prevent idle sleep
        .spawn()
        .map_err(|e| format!("Failed to start caffeinate: {}", e))?;
    tracing::info!("Keep awake started (caffeinate pid={})", child.id());
    *guard = Some(child);
    Ok(())
}

/// Stop caffeinate and allow system to sleep normally
#[tauri::command]
pub async fn stop_keep_awake(state: State<'_, CaffeinateState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
        tracing::info!("Keep awake stopped");
    }
    Ok(())
}

/// Show or create the hotkey quick-prompt mini-window
#[tauri::command]
pub async fn show_hotkey_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    // Reuse existing window if it was already created
    if let Some(window) = app_handle.get_webview_window("hotkey") {
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    // Create a new frameless, always-on-top, transparent mini-window
    let window = tauri::WebviewWindowBuilder::new(
        &app_handle,
        "hotkey",
        tauri::WebviewUrl::App("/hotkey-window".into()),
    )
    .title("Codex Quick Prompt")
    .inner_size(440.0, 220.0)
    .min_inner_size(320.0, 160.0)
    .max_inner_size(560.0, 480.0)
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .visible_on_all_workspaces(true)
    .shadow(true)
    .center()
    .build()
    .map_err(|e| format!("Failed to create hotkey window: {}", e))?;

    let _ = window.show();
    let _ = window.set_focus();

    tracing::info!("Hotkey window created and shown");
    Ok(())
}

/// Hide the hotkey mini-window without destroying it (keeps it ready to reuse)
#[tauri::command]
pub async fn hide_hotkey_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("hotkey") {
        let _ = window.hide();
        tracing::debug!("Hotkey window hidden");
    }
    Ok(())
}

/// Pop out a thread into a dedicated floating window.
/// If a window for this thread already exists, focus it instead of creating a new one.
#[tauri::command]
pub async fn pop_out_thread(
    app: tauri::AppHandle,
    thread_id: String,
) -> Result<(), String> {
    use tauri::WebviewUrl;
    use tauri::WebviewWindowBuilder;

    // Use the first 8 characters of the thread ID for the window label
    let label = format!("popout-{}", &thread_id[..8.min(thread_id.len())]);

    // Reuse existing window if already created
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    let url = format!("/popout/thread/{}", thread_id);
    let window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.into()))
        .title("Codex Thread")
        .inner_size(480.0, 700.0)
        .min_inner_size(360.0, 400.0)
        .decorations(true)
        .always_on_top(false)
        .resizable(true)
        .build()
        .map_err(|e| format!("Failed to create pop-out window: {}", e))?;

    #[cfg(target_os = "macos")]
    {
        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
        let _ = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None);
    }

    let _ = window.show();
    let _ = window.set_focus();

    tracing::info!("Pop-out window created for thread {}", &thread_id[..8.min(thread_id.len())]);
    Ok(())
}

/// Toggle the always-on-top state of a window by its label.
/// Returns the new always-on-top value.
#[tauri::command]
pub async fn toggle_always_on_top(
    app: tauri::AppHandle,
    window_label: String,
) -> Result<bool, String> {
    let window = app
        .get_webview_window(&window_label)
        .ok_or_else(|| format!("Window '{}' not found", window_label))?;
    let current = window.is_always_on_top().map_err(|e| e.to_string())?;
    let new_val = !current;
    window.set_always_on_top(new_val).map_err(|e| e.to_string())?;
    tracing::debug!("Window '{}' always-on-top set to {}", window_label, new_val);
    Ok(new_val)
}

/// Bring the main window to the front
#[tauri::command]
pub async fn show_main_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
    Ok(())
}

/// Check if caffeinate is currently active
#[tauri::command]
pub async fn is_keep_awake_active(state: State<'_, CaffeinateState>) -> Result<bool, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(child) = guard.as_mut() {
        match child.try_wait() {
            Ok(Some(_status)) => {
                // Process has exited, clean up
                tracing::warn!("Caffeinate process has exited unexpectedly");
                guard.take();
                Ok(false)
            }
            Ok(None) => {
                // Process is still running
                Ok(true)
            }
            Err(e) => {
                tracing::warn!("Failed to check caffeinate status: {}", e);
                guard.take();
                Ok(false)
            }
        }
    } else {
        Ok(false)
    }
}
