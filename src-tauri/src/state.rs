//! Application state management

use std::sync::{Arc, Mutex as StdMutex};
use std::time::{Duration, Instant};
use serde_json::json;
use tauri::{AppHandle, Manager};
use tokio::sync::{mpsc, Mutex, RwLock};
use tracing_appender::non_blocking::WorkerGuard;

use crate::app_server::{AppServerEvent, AppServerProcess};
use crate::database::Database;
use crate::events::AppEventEmitter;
use crate::global_state::{unix_timestamp_millis, unix_timestamp_secs, GlobalStateStore};
use crate::health::RendererHealth;
use crate::Result;

/// Global application state
pub struct AppState {
    /// Database connection for projects, sessions, and metadata
    pub database: Arc<Database>,

    /// App server process manager
    pub app_server: Arc<RwLock<Option<AppServerProcess>>>,

    /// Tauri app handle for emitting events
    pub app_handle: AppHandle,

    /// Buffered event emitter (renderer-ready aware)
    pub events: AppEventEmitter,

    /// Global persistent state store
    pub global_state: Arc<GlobalStateStore>,

    /// Renderer health tracker
    pub renderer_health: Arc<RendererHealth>,

    /// App server event channel (supervisor)
    app_server_events_tx: mpsc::Sender<AppServerEvent>,
    app_server_events_rx: StdMutex<Option<mpsc::Receiver<AppServerEvent>>>,

    /// Restart lock to avoid concurrent start/stop
    app_server_restart_lock: Arc<Mutex<()>>,

    /// Keep tracing worker guard alive for file logging
    #[allow(dead_code)]
    log_guard: StdMutex<Option<WorkerGuard>>,
}

impl AppState {
    /// Create a new application state
    pub fn new(app_handle: &AppHandle, log_guard: Option<WorkerGuard>) -> Result<Self> {
        // Get the app data directory
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| crate::Error::Tauri(e.to_string()))?;

        // Ensure the directory exists
        std::fs::create_dir_all(&app_data_dir)?;

        // Initialize database
        let db_path = app_data_dir.join("codex-desktop.db");
        let database = Arc::new(Database::new(&db_path)?);

        tracing::info!("Database initialized at {:?}", db_path);

        // Run periodic database VACUUM (weekly)
        match database.vacuum_if_needed(7) {
            Ok(true) => tracing::info!("Weekly database VACUUM completed"),
            Ok(false) => tracing::debug!("Database VACUUM not needed yet"),
            Err(e) => tracing::warn!("Database VACUUM failed (non-fatal): {}", e),
        }

        // Global state store
        let global_state_path = app_data_dir.join("codex-global-state.json");
        let global_state = Arc::new(GlobalStateStore::load(global_state_path)?);

        global_state.update(|state| {
            state.startup.app_started_at_ms = Some(unix_timestamp_millis());
            state.startup.renderer_ready_latency_ms = None;
        });

        let events = AppEventEmitter::new(app_handle.clone());
        let renderer_health = Arc::new(RendererHealth::new());
        let (app_server_events_tx, app_server_events_rx) = mpsc::channel(16);

        Ok(Self {
            database,
            app_server: Arc::new(RwLock::new(None)),
            app_handle: app_handle.clone(),
            events,
            global_state,
            renderer_health,
            app_server_events_tx,
            app_server_events_rx: StdMutex::new(Some(app_server_events_rx)),
            app_server_restart_lock: Arc::new(Mutex::new(())),
            log_guard: StdMutex::new(log_guard),
        })
    }

    /// Start the app server process
    pub async fn start_app_server(&self) -> Result<()> {
        self.handle().start_app_server().await
    }

    /// Stop the app server process
    pub async fn stop_app_server(&self) -> Result<()> {
        self.handle().stop_app_server().await
    }

    /// Restart the app server process
    pub async fn restart_app_server(&self) -> Result<()> {
        self.handle().restart_app_server().await
    }

    /// Start background supervisors (app-server watchdog, renderer heartbeat)
    pub fn start_background_tasks(&self) {
        if let Some(rx) = self.app_server_events_rx.lock().unwrap().take() {
            let handle = self.handle();
            tauri::async_runtime::spawn(async move {
                monitor_app_server(rx, handle).await;
            });
        }

        let renderer_health = self.renderer_health.clone();
        let app_handle = self.app_handle.clone();
        let events = self.events.clone();
        let global_state = self.global_state.clone();
        tauri::async_runtime::spawn(async move {
            monitor_renderer(renderer_health, app_handle, events, global_state).await;
        });
    }

    fn handle(&self) -> AppStateHandle {
        AppStateHandle {
            app_server: self.app_server.clone(),
            app_server_events_tx: self.app_server_events_tx.clone(),
            events: self.events.clone(),
            global_state: self.global_state.clone(),
            restart_lock: self.app_server_restart_lock.clone(),
        }
    }
}

#[derive(Clone)]
struct AppStateHandle {
    app_server: Arc<RwLock<Option<AppServerProcess>>>,
    app_server_events_tx: mpsc::Sender<AppServerEvent>,
    events: AppEventEmitter,
    global_state: Arc<GlobalStateStore>,
    restart_lock: Arc<Mutex<()>>,
}

impl AppStateHandle {
    async fn start_app_server(&self) -> Result<()> {
        let _guard = self.restart_lock.lock().await;
        self.start_app_server_inner().await
    }

    async fn stop_app_server(&self) -> Result<()> {
        let _guard = self.restart_lock.lock().await;
        self.stop_app_server_inner().await
    }

    async fn restart_app_server(&self) -> Result<()> {
        let _guard = self.restart_lock.lock().await;
        tracing::info!("Restarting app server...");
        self.stop_app_server_inner().await?;
        self.start_app_server_inner().await?;

        self.events.emit("app-server-reconnected", ()).await;
        self.global_state.update(|state| {
            state.app_server.restart_count += 1;
            state.app_server.last_restart_at = Some(unix_timestamp_secs());
        });

        tracing::info!("App server restarted successfully");
        Ok(())
    }

    async fn start_app_server_inner(&self) -> Result<()> {
        let mut server = self.app_server.write().await;
        match server.as_mut() {
            None => {
                let process =
                    AppServerProcess::spawn(self.events.clone(), self.app_server_events_tx.clone())
                        .await?;
                *server = Some(process);
                tracing::info!("App server started");
            }
            Some(existing) => {
                if !existing.is_running() {
                    tracing::warn!("App server was not running, respawning...");
                    let process =
                        AppServerProcess::spawn(self.events.clone(), self.app_server_events_tx.clone())
                            .await?;
                    *server = Some(process);
                    tracing::info!("App server restarted");
                }
            }
        }
        Ok(())
    }

    async fn stop_app_server_inner(&self) -> Result<()> {
        let mut server = self.app_server.write().await;
        if let Some(mut process) = server.take() {
            if process.is_running() {
                tracing::info!("Stopping running app server...");
                process.shutdown().await?;
                tracing::info!("App server stopped");
            } else {
                tracing::info!("App server already stopped, cleaning up...");
            }
        }
        Ok(())
    }
}

const APP_SERVER_MAX_RESTART_ATTEMPTS: usize = 3;
const APP_SERVER_MAX_RESTARTS_PER_WINDOW: usize = 5;
const APP_SERVER_RESTART_WINDOW_SECS: u64 = 300;
const APP_SERVER_BACKOFF_BASE_SECS: u64 = 1;
const APP_SERVER_BACKOFF_MAX_SECS: u64 = 30;

const RENDERER_HEARTBEAT_TIMEOUT_SECS: u64 = 20;
const RENDERER_MONITOR_INTERVAL_SECS: u64 = 5;
const RENDERER_MAX_RECOVERY_ATTEMPTS: u32 = 3;
const RENDERER_RECOVERY_BASE_SECS: u64 = 2;
const RENDERER_RECOVERY_MAX_SECS: u64 = 30;

fn app_server_backoff(attempt: u32) -> Duration {
    let factor = 2u64.saturating_pow(attempt.saturating_sub(1));
    Duration::from_secs((APP_SERVER_BACKOFF_BASE_SECS * factor).min(APP_SERVER_BACKOFF_MAX_SECS))
}

fn renderer_recovery_backoff(attempt: u32) -> Duration {
    let factor = 2u64.saturating_pow(attempt.saturating_sub(1));
    Duration::from_secs((RENDERER_RECOVERY_BASE_SECS * factor).min(RENDERER_RECOVERY_MAX_SECS))
}

async fn monitor_app_server(mut rx: mpsc::Receiver<AppServerEvent>, handle: AppStateHandle) {
    let mut restart_history: Vec<Instant> = Vec::new();

    while let Some(event) = rx.recv().await {
        match event {
            AppServerEvent::Disconnected { reason } => {
                tracing::warn!("App server disconnected: {}", reason);
                handle.global_state.update(|state| {
                    state.app_server.last_disconnect_reason = Some(reason.clone());
                });

                for attempt in 1..=APP_SERVER_MAX_RESTART_ATTEMPTS {
                    let now = Instant::now();
                    restart_history
                        .retain(|timestamp| now.duration_since(*timestamp)
                            < Duration::from_secs(APP_SERVER_RESTART_WINDOW_SECS));

                    if restart_history.len() >= APP_SERVER_MAX_RESTARTS_PER_WINDOW {
                        handle
                            .events
                            .emit(
                                "app-server-restart-paused",
                                json!({ "reason": "too_many_restarts" }),
                            )
                            .await;
                        tracing::warn!("Restart paused: too many restarts in window");
                        break;
                    }

                    let delay = app_server_backoff(attempt as u32);
                    tracing::info!("Restarting app server in {:?} (attempt {})", delay, attempt);
                    tokio::time::sleep(delay).await;

                    match handle.restart_app_server().await {
                        Ok(_) => {
                            restart_history.push(Instant::now());
                            break;
                        }
                        Err(err) => {
                            restart_history.push(Instant::now());
                            tracing::error!("Failed to restart app server: {}", err);
                        }
                    }
                }
            }
        }
    }
}

async fn monitor_renderer(
    renderer_health: Arc<RendererHealth>,
    app_handle: AppHandle,
    events: AppEventEmitter,
    global_state: Arc<GlobalStateStore>,
) {
    let mut interval = tokio::time::interval(Duration::from_secs(RENDERER_MONITOR_INTERVAL_SECS));

    loop {
        interval.tick().await;
        let snapshot = renderer_health.snapshot().await;
        if !snapshot.ready {
            continue;
        }

        let Some(last_heartbeat) = snapshot.last_heartbeat else {
            continue;
        };

        if Instant::now().duration_since(last_heartbeat)
            < Duration::from_secs(RENDERER_HEARTBEAT_TIMEOUT_SECS)
        {
            continue;
        }

        let attempt = snapshot.recovery_attempts + 1;
        let backoff = renderer_recovery_backoff(attempt);
        let attempt = match renderer_health
            .try_start_recovery(Instant::now(), RENDERER_MAX_RECOVERY_ATTEMPTS, backoff)
            .await
        {
            Some(attempt) => attempt,
            None => continue,
        };

        tracing::warn!("Renderer heartbeat stalled; attempting recovery (attempt {})", attempt);
        global_state.update(|state| {
            state.renderer.recovery_attempts = attempt;
            state.renderer.last_recovery_at = Some(unix_timestamp_secs());
        });

        if let Some(window) = app_handle.get_webview_window("main") {
            if let Err(err) = window.eval("window.location.reload()") {
                tracing::warn!("Failed to reload renderer (attempt {}): {}", attempt, err);
                let _ = window.close();
            }
        } else {
            tracing::warn!("Main window not found for renderer recovery");
        }

        events
            .emit(
                "renderer-recovery-attempted",
                json!({ "attempt": attempt }),
            )
            .await;
    }
}
