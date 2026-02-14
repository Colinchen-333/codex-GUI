//! Global persistent state store (JSON with atomic writes).

use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use crate::Result;

const STATE_VERSION: u32 = 2;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppServerState {
    pub restart_count: u64,
    pub last_restart_at: Option<i64>,
    pub last_disconnect_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RendererState {
    pub last_ready_at: Option<i64>,
    pub last_heartbeat_at: Option<i64>,
    pub recovery_attempts: u32,
    pub last_recovery_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StartupState {
    pub app_started_at_ms: Option<i64>,
    pub renderer_ready_latency_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct GlobalStateFile {
    pub version: u32,
    pub app_server: AppServerState,
    pub renderer: RendererState,
    pub startup: StartupState,
}

impl Default for GlobalStateFile {
    fn default() -> Self {
        Self {
            version: STATE_VERSION,
            app_server: AppServerState::default(),
            renderer: RendererState::default(),
            startup: StartupState::default(),
        }
    }
}

pub struct GlobalStateStore {
    path: PathBuf,
    state: Mutex<GlobalStateFile>,
    dirty: AtomicBool,
}

impl GlobalStateStore {
    pub fn load(path: PathBuf) -> Result<Self> {
        let (state, migrated) = if path.exists() {
            match std::fs::read_to_string(&path) {
                Ok(contents) => match serde_json::from_str::<GlobalStateFile>(&contents) {
                    Ok(parsed) => {
                        let (migrated_state, changed) = Self::migrate(parsed);
                        (migrated_state, changed)
                    }
                    Err(err) => {
                        let corrupt = path.with_extension("corrupt");
                        let _ = std::fs::rename(&path, &corrupt);
                        tracing::warn!(
                            "Failed to parse global state (moved to {:?}): {}",
                            corrupt,
                            err
                        );
                        (GlobalStateFile::default(), true)
                    }
                },
                Err(err) => {
                    tracing::warn!("Failed to read global state: {}", err);
                    (GlobalStateFile::default(), true)
                }
            }
        } else {
            (GlobalStateFile::default(), true)
        };

        Ok(Self {
            path,
            state: Mutex::new(state),
            dirty: AtomicBool::new(migrated),
        })
    }

    fn migrate(mut state: GlobalStateFile) -> (GlobalStateFile, bool) {
        let mut changed = false;
        if state.version < STATE_VERSION {
            state.version = STATE_VERSION;
            changed = true;
        }
        (state, changed)
    }

    pub fn update<F>(&self, f: F)
    where
        F: FnOnce(&mut GlobalStateFile),
    {
        let mut state = self.state.lock().unwrap();
        f(&mut state);
        self.dirty.store(true, Ordering::SeqCst);
    }

    pub fn flush(&self) -> Result<()> {
        if !self.dirty.load(Ordering::SeqCst) {
            return Ok(());
        }

        let state = self.state.lock().unwrap();

        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let tmp_path = self.path.with_extension("tmp");
        let data = serde_json::to_vec_pretty(&*state)?;

        let mut file = File::create(&tmp_path)?;
        file.write_all(&data)?;
        file.sync_all()?;

        std::fs::rename(&tmp_path, &self.path)?;
        self.dirty.store(false, Ordering::SeqCst);
        Ok(())
    }
}

impl Drop for GlobalStateStore {
    fn drop(&mut self) {
        if let Err(err) = self.flush() {
            tracing::warn!("Failed to flush global state on drop: {}", err);
        }
    }
}

pub fn unix_timestamp_secs() -> i64 {
    match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(duration) => duration.as_secs() as i64,
        Err(_) => 0,
    }
}

pub fn unix_timestamp_millis() -> i64 {
    match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as i64,
        Err(_) => 0,
    }
}
