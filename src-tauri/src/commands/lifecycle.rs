//! Renderer lifecycle commands.

use tauri::State;

use crate::global_state::{unix_timestamp_millis, unix_timestamp_secs};
use crate::state::AppState;
use crate::Result;

/// Signal that renderer has finished loading and is ready to receive events.
#[tauri::command]
pub async fn renderer_ready(state: State<'_, AppState>) -> Result<()> {
    state.renderer_health.mark_ready().await;
    state.events.set_ready().await;
    let now_ms = unix_timestamp_millis();
    state.global_state.update(|global| {
        let now = unix_timestamp_secs();
        global.renderer.last_ready_at = Some(now);
        global.renderer.last_heartbeat_at = Some(now);
        global.renderer.recovery_attempts = 0;
        global.renderer.last_recovery_at = None;
        if let Some(started_at_ms) = global.startup.app_started_at_ms {
            if now_ms >= started_at_ms {
                global.startup.renderer_ready_latency_ms = Some((now_ms - started_at_ms) as u64);
            }
        }
    });
    Ok(())
}

/// Heartbeat from renderer to detect unresponsive states.
#[tauri::command]
pub async fn renderer_heartbeat(state: State<'_, AppState>) -> Result<()> {
    state.renderer_health.heartbeat().await;
    state.global_state.update(|global| {
        global.renderer.last_heartbeat_at = Some(unix_timestamp_secs());
        global.renderer.recovery_attempts = 0;
        global.renderer.last_recovery_at = None;
    });
    Ok(())
}
