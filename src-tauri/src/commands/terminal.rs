use serde::Serialize;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tauri::{Emitter, Window};

use crate::Result;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalOutput {
    pub exit_code: Option<i32>,
}

/// Execute a shell command in the given working directory.
/// Streams output via events and returns the exit code.
#[tauri::command]
pub async fn execute_terminal_command(
    window: Window,
    cwd: String,
    command: String,
) -> Result<TerminalOutput> {
    let shell = if cfg!(target_os = "windows") {
        "cmd"
    } else {
        "/bin/sh"
    };

    let shell_arg = if cfg!(target_os = "windows") {
        "/C"
    } else {
        "-c"
    };

    let mut child = Command::new(shell)
        .arg(shell_arg)
        .arg(&command)
        .current_dir(&cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| crate::Error::Other(format!("Failed to spawn command: {}", e)))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    // Stream stdout and stderr concurrently
    let stdout_window = window.clone();
    let stdout_handle = tokio::spawn(async move {
        if let Some(stdout) = stdout {
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = stdout_window.emit("terminal:stdout", &line);
            }
        }
    });

    let stderr_window = window.clone();
    let stderr_handle = tokio::spawn(async move {
        if let Some(stderr) = stderr {
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = stderr_window.emit("terminal:stderr", &line);
            }
        }
    });

    // Wait for both streams to finish
    let _ = stdout_handle.await;
    let _ = stderr_handle.await;

    let status = child
        .wait()
        .await
        .map_err(|e| crate::Error::Other(format!("Failed to wait for command: {}", e)))?;

    let exit_code = status.code();
    let _ = window.emit("terminal:exit", exit_code);

    Ok(TerminalOutput { exit_code })
}
