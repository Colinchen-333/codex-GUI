//! App server management commands

use serde::Serialize;
use tauri::State;
use tokio::process::Command;
use tokio::sync::OnceCell;

use crate::app_server::ipc_bridge::{AccountInfo, TurnStartResponse};
use crate::app_server::AppServerProcess;
use crate::state::AppState;
use crate::Result;

/// Server status information
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerStatus {
    pub is_running: bool,
    pub version: Option<String>,
}

static CODEX_CLI_VERSION: OnceCell<Option<String>> = OnceCell::const_new();

async fn get_codex_cli_version() -> Option<String> {
    let codex_path = AppServerProcess::find_codex_binary().ok()?;
    let output = Command::new(codex_path).arg("--version").output().await.ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !stdout.is_empty() {
        return Some(stdout);
    }
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if !stderr.is_empty() {
        return Some(stderr);
    }
    None
}

async fn get_codex_cli_version_cached() -> Option<String> {
    CODEX_CLI_VERSION
        .get_or_init(|| async { get_codex_cli_version().await })
        .await
        .clone()
}

/// Get the app server status
#[tauri::command]
pub async fn get_server_status(state: State<'_, AppState>) -> Result<ServerStatus> {
    // Only hold the lock briefly to check running status
    let is_running = {
        let mut server = state.app_server.write().await;
        server.as_mut().map(|s| s.is_running()).unwrap_or(false)
    };

    Ok(ServerStatus {
        is_running,
        version: get_codex_cli_version_cached().await,
    })
}

/// Restart the app server
#[tauri::command]
pub async fn restart_server(state: State<'_, AppState>) -> Result<()> {
    state.restart_app_server().await?;
    Ok(())
}

/// Get account information
#[tauri::command]
pub async fn get_account_info(state: State<'_, AppState>) -> Result<AccountInfo> {
    // Ensure app-server is running
    state.start_app_server().await?;

    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    // Empty params for account/read
    let response: AccountInfo = server
        .send_request("account/read", serde_json::json!({}))
        .await?;

    Ok(response)
}

/// Login response from app-server
#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    #[serde(rename = "type")]
    pub login_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub login_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auth_url: Option<String>,
}

/// Start login flow
#[tauri::command]
pub async fn start_login(
    state: State<'_, AppState>,
    login_type: String,
    api_key: Option<String>,
) -> Result<LoginResponse> {
    // Ensure app-server is running
    state.start_app_server().await?;

    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    // Build params based on login type
    let params = if login_type == "apiKey" {
        // API key login requires the key
        serde_json::json!({
            "type": "apiKey",
            "apiKey": api_key.unwrap_or_default(),
        })
    } else {
        // ChatGPT OAuth flow
        serde_json::json!({
            "type": login_type,
        })
    };

    let response: LoginResponse = server.send_request("account/login/start", params).await?;

    Ok(response)
}

/// Logout
#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> Result<()> {
    let mut server = state.app_server.write().await;

    if let Some(server) = server.as_mut() {
        let _: serde_json::Value = server
            .send_request("account/logout", serde_json::json!({}))
            .await?;
    }

    Ok(())
}

/// Reasoning effort option
#[derive(Debug, Clone, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReasoningEffortOption {
    pub reasoning_effort: String,
    pub description: String,
}

/// Model information
#[derive(Debug, Clone, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Model {
    pub id: String,
    pub model: String,
    pub display_name: String,
    pub description: String,
    pub supported_reasoning_efforts: Vec<ReasoningEffortOption>,
    pub default_reasoning_effort: String,
    pub is_default: bool,
}

/// Model list response
#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelListResponse {
    pub data: Vec<Model>,
    pub next_cursor: Option<String>,
}

/// Get available models
#[tauri::command]
pub async fn get_models(state: State<'_, AppState>) -> Result<ModelListResponse> {
    // Ensure app-server is running
    state.start_app_server().await?;

    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let params = serde_json::json!({
        "limit": 100,
    });

    let response: ModelListResponse = server.send_request("model/list", params).await?;

    Ok(response)
}

// ==================== Skills Commands ====================

#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillsListParams {
    pub cwds: Vec<String>,
    pub force_reload: bool,
}

#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillMetadata {
    pub name: String,
    pub description: String,
    pub short_description: Option<String>,
    pub path: String,
    pub scope: String,
}

#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillErrorInfo {
    pub path: String,
    pub message: String,
}

#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillsListEntry {
    pub cwd: String,
    pub skills: Vec<SkillMetadata>,
    pub errors: Vec<SkillErrorInfo>,
}

#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillsListResponse {
    pub data: Vec<SkillsListEntry>,
}

#[tauri::command]
pub async fn list_skills(
    state: State<'_, AppState>,
    cwds: Vec<String>,
    force_reload: bool,
) -> Result<SkillsListResponse> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let params = SkillsListParams { cwds, force_reload };
    let response: SkillsListResponse = server.send_request("skills/list", params).await?;
    Ok(response)
}

// ==================== MCP Commands ====================

#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerStatus {
    pub name: String,
    pub tools: std::collections::HashMap<String, serde_json::Value>,
    pub resources: Vec<serde_json::Value>,
    pub resource_templates: Vec<serde_json::Value>,
    pub auth_status: serde_json::Value,
}

#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerStatusResponse {
    pub data: Vec<McpServerStatus>,
    pub next_cursor: Option<String>,
}

#[tauri::command]
pub async fn list_mcp_servers(state: State<'_, AppState>) -> Result<McpServerStatusResponse> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let params = serde_json::json!({
        "limit": 100,
    });
    let response: McpServerStatusResponse = server
        .send_request("mcpServerStatus/list", params)
        .await?;
    Ok(response)
}

// ==================== Review Commands ====================

#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewStartResponse {
    pub turn: serde_json::Value,
    pub review_thread_id: String,
}

#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ReviewTarget {
    /// Review the working tree: staged, unstaged, and untracked files
    UncommittedChanges,
    /// Review changes between the current branch and the given base branch
    #[serde(rename_all = "camelCase")]
    BaseBranch { branch: String },
    /// Review the changes introduced by a specific commit
    #[serde(rename_all = "camelCase")]
    Commit {
        sha: String,
        title: Option<String>,
    },
    /// Arbitrary instructions, equivalent to the old free-form prompt
    #[serde(rename_all = "camelCase")]
    Custom { instructions: String },
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewStartParams {
    pub thread_id: String,
    pub target: ReviewTarget,
}

#[tauri::command]
pub async fn start_review(
    state: State<'_, AppState>,
    thread_id: String,
    target: Option<ReviewTarget>,
) -> Result<ReviewStartResponse> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let params = ReviewStartParams {
        thread_id,
        target: target.unwrap_or(ReviewTarget::UncommittedChanges),
    };
    let response: ReviewStartResponse = server.send_request("review/start", params).await?;
    Ok(response)
}

// ==================== User Shell Command ====================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserShellCommandParams {
    pub thread_id: String,
    pub command: String,
}

/// Run a local shell command (like CLI's ! prefix)
#[tauri::command]
pub async fn run_user_shell_command(
    state: State<'_, AppState>,
    thread_id: String,
    command: String,
) -> Result<TurnStartResponse> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let params = UserShellCommandParams { thread_id, command };
    let response: TurnStartResponse = server.send_request("userShellCommand/run", params).await?;
    Ok(response)
}

// ==================== Config Commands ====================

/// Config layer information
#[derive(Debug, Clone, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigLayer {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    pub config: serde_json::Value,
}

/// Config origin information
#[derive(Debug, Clone, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigOrigin {
    pub layer: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
}

/// Config read response
#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigReadResponse {
    pub config: serde_json::Value,
    pub origins: std::collections::HashMap<String, ConfigOrigin>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub layers: Option<Vec<ConfigLayer>>,
}

/// Read configuration
///
/// Supports the official `config/read` method with `includeLayers` and `cwd`
/// parameters for the multi-layer config system.
#[tauri::command]
pub async fn read_config(
    state: State<'_, AppState>,
    include_layers: Option<bool>,
    cwd: Option<String>,
) -> Result<ConfigReadResponse> {
    // Ensure app-server is running
    state.start_app_server().await?;

    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let mut params = serde_json::json!({
        "includeLayers": include_layers.unwrap_or(false),
    });
    if let Some(cwd_val) = cwd {
        params["cwd"] = serde_json::Value::String(cwd_val);
    }

    let response: ConfigReadResponse = server.send_request("config/read", params).await?;

    Ok(response)
}

/// Write configuration
#[tauri::command]
pub async fn write_config(
    state: State<'_, AppState>,
    key: String,
    value: serde_json::Value,
) -> Result<()> {
    // Ensure app-server is running
    state.start_app_server().await?;

    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let params = serde_json::json!({
        "key": key,
        "value": value,
    });

    let _: serde_json::Value = server.send_request("config/write", params).await?;

    Ok(())
}

/// Write a single config value by key path
///
/// Maps to the official `config/value/write` JSON-RPC method.
/// Supports dot-separated `keyPath`, optional `mergeStrategy`
/// (`"replace"` | `"merge"`), target `filePath`, and optimistic-concurrency
/// `expectedVersion` for conflict detection.
#[tauri::command]
pub async fn write_config_value(
    state: State<'_, AppState>,
    key_path: String,
    value: serde_json::Value,
    merge_strategy: Option<String>,
    file_path: Option<String>,
    expected_version: Option<String>,
) -> Result<serde_json::Value> {
    state.start_app_server().await?;

    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let mut params = serde_json::json!({
        "keyPath": key_path,
        "value": value,
    });
    if let Some(strategy) = merge_strategy {
        params["mergeStrategy"] = serde_json::Value::String(strategy);
    }
    if let Some(fp) = file_path {
        params["filePath"] = serde_json::Value::String(fp);
    }
    if let Some(ev) = expected_version {
        params["expectedVersion"] = serde_json::Value::String(ev);
    }

    let response: serde_json::Value = server.send_request("config/value/write", params).await?;
    Ok(response)
}

/// Atomically write multiple config values in a single request
///
/// Maps to the official `config/batchWrite` JSON-RPC method.
/// `edits` is an array of `{ keyPath, value, mergeStrategy? }` objects.
#[tauri::command]
pub async fn batch_write_config(
    state: State<'_, AppState>,
    edits: Vec<serde_json::Value>,
    file_path: Option<String>,
    expected_version: Option<String>,
) -> Result<serde_json::Value> {
    state.start_app_server().await?;

    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let mut params = serde_json::json!({
        "edits": edits,
    });
    if let Some(fp) = file_path {
        params["filePath"] = serde_json::Value::String(fp);
    }
    if let Some(ev) = expected_version {
        params["expectedVersion"] = serde_json::Value::String(ev);
    }

    let response: serde_json::Value = server.send_request("config/batchWrite", params).await?;
    Ok(response)
}

/// Read config schema requirements
///
/// Maps to the official `configRequirements/read` JSON-RPC method.
/// Returns schema constraints (required fields, validation rules) that the
/// app-server enforces when writing config values.
#[tauri::command]
pub async fn read_config_requirements(
    state: State<'_, AppState>,
) -> Result<serde_json::Value> {
    state.start_app_server().await?;

    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let response: serde_json::Value = server
        .send_request("configRequirements/read", serde_json::json!({}))
        .await?;
    Ok(response)
}

// ==================== Skills Config Write ====================

/// Write configuration for a specific skill
///
/// Maps to the official `skills/config/write` JSON-RPC method.
#[tauri::command]
pub async fn write_skill_config(
    state: State<'_, AppState>,
    skill_id: String,
    config: serde_json::Value,
) -> Result<()> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let params = serde_json::json!({
        "skillId": skill_id,
        "config": config,
    });
    let _: serde_json::Value = server.send_request("skills/config/write", params).await?;
    tracing::info!("Wrote skill config for: {}", skill_id);
    Ok(())
}

// ==================== Feedback Upload ====================

/// Upload user feedback to the Codex service
///
/// Maps to the official `feedback/upload` JSON-RPC method.
#[tauri::command]
pub async fn upload_feedback(
    state: State<'_, AppState>,
    feedback: String,
    context: Option<serde_json::Value>,
) -> Result<()> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let params = if let Some(ctx) = context {
        serde_json::json!({ "feedback": feedback, "context": ctx })
    } else {
        serde_json::json!({ "feedback": feedback })
    };
    let _: serde_json::Value = server.send_request("feedback/upload", params).await?;
    tracing::info!("Uploaded user feedback");
    Ok(())
}

// ==================== App List ====================

/// Information about a connected app / integration
#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectedApp {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub app_type: String,
}

/// Response from `app/list`
#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppListResponse {
    pub apps: Vec<ConnectedApp>,
}

/// List connected apps / integrations
///
/// Maps to the official `app/list` JSON-RPC method.
#[tauri::command]
pub async fn list_apps(state: State<'_, AppState>) -> Result<AppListResponse> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let response: AppListResponse = server
        .send_request("app/list", serde_json::json!({}))
        .await?;
    Ok(response)
}

// ==================== Experimental Features ====================

/// Experimental feature entry returned by `experimentalFeature/list`
#[derive(Debug, Clone, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExperimentalFeature {
    pub name: String,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// Response from `experimentalFeature/list`
#[derive(Debug, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExperimentalFeatureListResponse {
    pub data: Vec<ExperimentalFeature>,
    pub next_cursor: Option<String>,
}

/// List experimental features (cursor-based pagination)
///
/// Maps to the official `experimentalFeature/list` JSON-RPC method.
#[tauri::command]
pub async fn list_experimental_features(
    state: State<'_, AppState>,
    cursor: Option<String>,
    limit: Option<u32>,
) -> Result<ExperimentalFeatureListResponse> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let mut params = serde_json::json!({ "limit": limit.unwrap_or(100) });
    if let Some(c) = cursor {
        params["cursor"] = serde_json::Value::String(c);
    }

    let response: ExperimentalFeatureListResponse = server
        .send_request("experimentalFeature/list", params)
        .await?;
    Ok(response)
}

/// Toggle an experimental feature on or off via config write
///
/// Uses `config/write` with key `experimentalFeatures.<name>` to persist the
/// toggle — this matches how the official Codex Desktop persists feature flags.
#[tauri::command]
pub async fn toggle_experimental_feature(
    state: State<'_, AppState>,
    name: String,
    enabled: bool,
) -> Result<()> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let key = format!("experimentalFeatures.{}", name);
    let params = serde_json::json!({ "key": key, "value": enabled });
    let _: serde_json::Value = server.send_request("config/write", params).await?;
    tracing::info!("Toggled experimental feature '{}' to {}", name, enabled);
    Ok(())
}

// ==================== Fuzzy File Search ====================

/// One-shot fuzzy file search
#[tauri::command]
pub async fn fuzzy_file_search(
    state: State<'_, AppState>,
    query: String,
    cwd: Option<String>,
    limit: Option<u32>,
) -> Result<serde_json::Value> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let mut params = serde_json::json!({ "query": query });
    if let Some(cwd_val) = cwd {
        params["cwd"] = serde_json::Value::String(cwd_val);
    }
    if let Some(limit_val) = limit {
        params["limit"] = serde_json::Value::Number(limit_val.into());
    }

    let response: serde_json::Value = server.send_request("fuzzyFileSearch", params).await?;
    Ok(response)
}

/// Start a fuzzy file search session (streaming / incremental results)
#[tauri::command]
pub async fn fuzzy_file_search_session_start(
    state: State<'_, AppState>,
    query: String,
    cwd: Option<String>,
) -> Result<serde_json::Value> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let mut params = serde_json::json!({ "query": query });
    if let Some(cwd_val) = cwd {
        params["cwd"] = serde_json::Value::String(cwd_val);
    }

    let response: serde_json::Value = server
        .send_request("fuzzyFileSearch/sessionStart", params)
        .await?;
    Ok(response)
}

/// Update the query in an active fuzzy file search session
#[tauri::command]
pub async fn fuzzy_file_search_session_update(
    state: State<'_, AppState>,
    session_id: String,
    query: String,
) -> Result<serde_json::Value> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let params = serde_json::json!({ "sessionId": session_id, "query": query });
    let response: serde_json::Value = server
        .send_request("fuzzyFileSearch/sessionUpdate", params)
        .await?;
    Ok(response)
}

/// Stop an active fuzzy file search session
#[tauri::command]
pub async fn fuzzy_file_search_session_stop(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<serde_json::Value> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let params = serde_json::json!({ "sessionId": session_id });
    let response: serde_json::Value = server
        .send_request("fuzzyFileSearch/sessionStop", params)
        .await?;
    Ok(response)
}

// ==================== Account Rate Limits ====================

/// Get account rate limits
#[tauri::command]
pub async fn get_account_rate_limits(
    state: State<'_, AppState>,
) -> Result<serde_json::Value> {
    // Ensure app-server is running
    state.start_app_server().await?;

    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let response: serde_json::Value = server
        .send_request("account/rateLimits/read", serde_json::json!({}))
        .await?;

    Ok(response)
}

// ==================== MCP Server Status (paginated) ====================

/// List MCP server statuses with optional cursor-based pagination
///
/// Maps to the official `mcpServerStatus/list` JSON-RPC method.
/// This is the paginated variant of `list_mcp_servers` which accepts
/// explicit `cursor` and `limit` parameters for incremental fetching.
#[tauri::command]
pub async fn list_mcp_server_status(
    state: State<'_, AppState>,
    cursor: Option<String>,
    limit: Option<u32>,
) -> Result<serde_json::Value> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let mut params = serde_json::json!({
        "limit": limit.unwrap_or(100),
    });
    if let Some(c) = cursor {
        params["cursor"] = serde_json::Value::String(c);
    }

    let response: serde_json::Value = server
        .send_request("mcpServerStatus/list", params)
        .await?;
    Ok(response)
}

/// Initiate an OAuth login flow for a specific MCP server
///
/// Maps to the official `mcpServer/oauth/login` JSON-RPC method.
/// The server returns a redirect URL that the frontend opens in a browser;
/// the resulting callback lands on `/connector/oauth_callback`.
#[tauri::command]
pub async fn mcp_server_oauth_login(
    state: State<'_, AppState>,
    server_name: String,
    scope: Option<String>,
) -> Result<serde_json::Value> {
    state.start_app_server().await?;
    let mut server = state.app_server.write().await;
    let server = server
        .as_mut()
        .ok_or_else(|| crate::Error::AppServer("App server not running".to_string()))?;

    let mut params = serde_json::json!({
        "serverName": server_name,
    });
    if let Some(s) = scope {
        params["scope"] = serde_json::Value::String(s);
    }

    let response: serde_json::Value = server
        .send_request("mcpServer/oauth/login", params)
        .await?;
    Ok(response)
}
