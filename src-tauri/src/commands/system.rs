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
