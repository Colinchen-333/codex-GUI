use serde::Serialize;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tauri::{Emitter, Window};

use crate::Result;

/// Maximum allowed command length in characters
const MAX_COMMAND_LENGTH: usize = 10_000;

/// Command execution timeout in seconds
const COMMAND_TIMEOUT_SECS: u64 = 30;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalOutput {
    pub exit_code: Option<i32>,
}

/// Execute a shell command in the given working directory.
/// Streams output via events and returns the exit code.
///
/// Security: validates command length and cwd, enforces execution timeout.
#[tauri::command]
pub async fn execute_terminal_command(
    window: Window,
    cwd: String,
    command: String,
) -> Result<TerminalOutput> {
    // Validate command length
    if command.len() > MAX_COMMAND_LENGTH {
        return Err(crate::Error::Other(format!(
            "Command too long: {} chars (max {})",
            command.len(),
            MAX_COMMAND_LENGTH
        )));
    }

    // Validate cwd is an existing directory
    let cwd_path = std::path::Path::new(&cwd);
    if !cwd_path.is_absolute() || !cwd_path.is_dir() {
        return Err(crate::Error::InvalidPath(format!(
            "Working directory is not a valid absolute path: {}",
            cwd
        )));
    }

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

    // Wait with timeout for both streams and process exit
    let timeout_duration = std::time::Duration::from_secs(COMMAND_TIMEOUT_SECS);
    let result = tokio::time::timeout(timeout_duration, async {
        let _ = stdout_handle.await;
        let _ = stderr_handle.await;
        child.wait().await
    })
    .await;

    let exit_code = match result {
        Ok(Ok(status)) => status.code(),
        Ok(Err(e)) => {
            return Err(crate::Error::Other(format!(
                "Failed to wait for command: {}",
                e
            )));
        }
        Err(_) => {
            // Timeout: kill the process
            let _ = child.kill().await;
            let _ = window.emit("terminal:stderr", "Command timed out after 30 seconds");
            let _ = window.emit("terminal:exit", Option::<i32>::None);
            return Err(crate::Error::Other(format!(
                "Command timed out after {} seconds",
                COMMAND_TIMEOUT_SECS
            )));
        }
    };

    let _ = window.emit("terminal:exit", exit_code);

    Ok(TerminalOutput { exit_code })
}
