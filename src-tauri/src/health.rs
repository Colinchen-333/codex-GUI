//! Renderer health tracking for unresponsive detection and recovery.

use std::time::Instant;
use tokio::sync::Mutex;

#[derive(Debug, Clone)]
pub struct RendererHealthSnapshot {
    pub ready: bool,
    pub last_heartbeat: Option<Instant>,
    pub recovery_attempts: u32,
    pub last_recovery: Option<Instant>,
}

#[derive(Debug)]
struct RendererHealthState {
    ready: bool,
    last_ready: Option<Instant>,
    last_heartbeat: Option<Instant>,
    recovery_attempts: u32,
    last_recovery: Option<Instant>,
}

/// Tracks renderer readiness and heartbeats, with recovery counters.
#[derive(Debug)]
pub struct RendererHealth {
    inner: Mutex<RendererHealthState>,
}

impl RendererHealth {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(RendererHealthState {
                ready: false,
                last_ready: None,
                last_heartbeat: None,
                recovery_attempts: 0,
                last_recovery: None,
            }),
        }
    }

    pub async fn mark_ready(&self) {
        let now = Instant::now();
        let mut state = self.inner.lock().await;
        state.ready = true;
        state.last_ready = Some(now);
        state.last_heartbeat = Some(now);
        state.recovery_attempts = 0;
        state.last_recovery = None;
    }

    pub async fn heartbeat(&self) {
        let now = Instant::now();
        let mut state = self.inner.lock().await;
        state.last_heartbeat = Some(now);
        state.recovery_attempts = 0;
        state.last_recovery = None;
    }

    pub async fn snapshot(&self) -> RendererHealthSnapshot {
        let state = self.inner.lock().await;
        RendererHealthSnapshot {
            ready: state.ready,
            last_heartbeat: state.last_heartbeat,
            recovery_attempts: state.recovery_attempts,
            last_recovery: state.last_recovery,
        }
    }

    pub async fn try_start_recovery(
        &self,
        now: Instant,
        max_attempts: u32,
        backoff: std::time::Duration,
    ) -> Option<u32> {
        let mut state = self.inner.lock().await;
        if !state.ready {
            return None;
        }
        if state.recovery_attempts >= max_attempts {
            return None;
        }
        if let Some(last) = state.last_recovery {
            if now.duration_since(last) < backoff {
                return None;
            }
        }

        state.recovery_attempts += 1;
        state.last_recovery = Some(now);
        Some(state.recovery_attempts)
    }
}
