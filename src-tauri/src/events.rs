//! Buffered event emitter for renderer readiness.

use serde::Serialize;
use serde_json::Value as JsonValue;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

const MAX_PENDING_EVENTS: usize = 1000;

#[derive(Debug)]
struct BufferedEvent {
    name: String,
    payload: JsonValue,
}

/// Emits events to the renderer, buffering until it signals readiness.
#[derive(Clone)]
pub struct AppEventEmitter {
    app_handle: AppHandle,
    ready: Arc<AtomicBool>,
    pending: Arc<Mutex<Vec<BufferedEvent>>>,
}

impl AppEventEmitter {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            ready: Arc::new(AtomicBool::new(false)),
            pending: Arc::new(Mutex::new(Vec::with_capacity(64))),
        }
    }

    pub fn is_ready(&self) -> bool {
        self.ready.load(Ordering::SeqCst)
    }

    pub async fn set_ready(&self) {
        if self.ready.swap(true, Ordering::SeqCst) {
            return;
        }

        let mut pending = self.pending.lock().await;
        if !pending.is_empty() {
            tracing::info!("Flushing {} pending events", pending.len());
        }

        for event in pending.drain(..) {
            if let Err(e) = self.app_handle.emit(&event.name, event.payload) {
                tracing::warn!("Failed to emit buffered event {}: {}", event.name, e);
            }
        }
    }

    pub async fn emit<T: Serialize>(&self, event: &str, payload: T) {
        match serde_json::to_value(payload) {
            Ok(value) => self.emit_json(event, value).await,
            Err(e) => tracing::warn!("Failed to serialize payload for event {}: {}", event, e),
        }
    }

    pub async fn emit_json(&self, event: &str, payload: JsonValue) {
        if !self.is_ready() {
            let mut pending = self.pending.lock().await;
            if pending.len() >= MAX_PENDING_EVENTS {
                let overflow = pending.len() + 1 - MAX_PENDING_EVENTS;
                pending.drain(0..overflow);
                tracing::warn!("Pending event buffer overflowed, dropped {} events", overflow);
            }
            pending.push(BufferedEvent {
                name: event.to_string(),
                payload,
            });
            return;
        }

        if let Err(e) = self.app_handle.emit(event, payload) {
            tracing::warn!("Failed to emit event {}: {}", event, e);
        }
    }
}
