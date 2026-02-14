//! System commands for keep-awake (caffeinate) management

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

/// Check if caffeinate is currently active
#[tauri::command]
pub async fn is_keep_awake_active(state: State<'_, CaffeinateState>) -> Result<bool, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    Ok(guard.is_some())
}
