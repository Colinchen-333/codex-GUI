# Official Codex Desktop backend alignment notes

Date: 2026-02-06
Source package inspected: `/Applications/Codex.app/Contents/Resources/app.asar`
Extracted to: `/tmp/codex_official_asar_1770360530`

## 1) Confirmed official patterns from reverse

- Renderer event buffering before ready
  - `main-CQwPb0Th.js` contains `pendingMessages` + `markWebContentsReady()` + `flushPendingMessages()`.
- Renderer diagnostics and recovery
  - `installWebContentsDiagnostics()` listens to `render-process-gone`, `unresponsive`, `did-fail-load`.
  - `maybeRecoverFromRendererCrash()` applies bounded reload retry behavior.
- Sidecar/backend split
  - Main process coordinates worker channels and app-server style backend capabilities.
  - API base constants include local fallback style endpoint (`http://localhost:8000/api`).
- Graceful persistence on quit
  - Main process flushes global state stores on `will-quit`.
- Platform fallback strategy
  - macOS `liquid glass` integration has fallback to vibrancy when unavailable.

## 2) Mapping to current Tauri implementation

- Ready-gated event buffering
  - `src-tauri/src/events.rs`
- Renderer heartbeat + recovery watchdog
  - `src-tauri/src/health.rs`
  - `src-tauri/src/commands/lifecycle.rs`
  - `src-tauri/src/state.rs`
- App-server subprocess supervision and restart backoff
  - `src-tauri/src/app_server/process.rs`
  - `src-tauri/src/state.rs`
- Persistent global state with atomic writes
  - `src-tauri/src/global_state.rs`

## 3) This round improvements added

- Global state schema upgraded with migration path
  - Added `version = 2` migration handling and `serde(default)` safety.
- Added startup diagnostics fields
  - `startup.app_started_at_ms`
  - `startup.renderer_ready_latency_ms`
- Startup timing is recorded at boot; renderer-ready latency is persisted on `renderer_ready`.

## 4) Remaining parity gaps (next)

- Structured crash bundle export (last N log lines + event fingerprint) to Sentry pipeline.
- Sidecar child-process tree kill on cancellation for long-running remote tasks.
- Optional per-request latency/error-rate counters with rolling window reporting.
