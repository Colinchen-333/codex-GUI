//! Thread commands - proxy to app-server

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde_json::Value as JsonValue;
use std::io::Write;
use tauri::State;

use crate::app_server::ipc_bridge::{
    ApprovalDecision, ApprovalResponseResult, ThreadListParams, ThreadListResponse,
    ThreadResumeParams, ThreadResumeResponse, ThreadStartParams, ThreadStartResponse,
    TurnInterruptParams, TurnStartParams, TurnStartResponse, TurnSteerParams, UserInput, SandboxPolicy,
    ThreadForkParams, ThreadForkResponse, ThreadArchiveParams, ThreadCompactParams,
    ThreadReadParams, ThreadReadResponse, ThreadNameSetParams, ThreadRollbackParams,
    ThreadListExtendedParams, ThreadMetadataUpdateParams, ThreadMetadataFields,
};
use crate::database::SessionMetadata;
use crate::state::AppState;
use crate::{Error, Result};

fn parse_sandbox_policy(policy: Option<String>) -> Option<SandboxPolicy> {
    match policy.as_deref() {
        Some("read-only") => Some(SandboxPolicy::ReadOnly),
        Some("workspace-write") => Some(SandboxPolicy::WorkspaceWrite {
            writable_roots: Vec::new(),
            network_access: false,
            exclude_tmpdir_env_var: false,
            exclude_slash_tmp: false,
        }),
        Some("danger-full-access") => Some(SandboxPolicy::DangerFullAccess),
        Some("external-sandbox") | Some("external_sandbox") => Some(SandboxPolicy::ExternalSandbox {
            network_access: "restricted".to_string(),
        }),
        _ => None,
    }
}

/// Start a new thread
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn start_thread(
    state: State<'_, AppState>,
    project_id: String,
    cwd: String,
    model: Option<String>,
    sandbox: Option<String>,
    approval_policy: Option<String>,
    base_instructions: Option<String>,
    developer_instructions: Option<String>,
    config: Option<JsonValue>,
) -> Result<ThreadStartResponse> {
    // Ensure app-server is running
    state.start_app_server().await?;

    let params = ThreadStartParams {
        cwd: Some(cwd.clone()),
        model,
        model_provider: None,
        sandbox,
        approval_policy,
        base_instructions,
        developer_instructions,
        config,
    };

    let mut guard = state.app_server.write().await;
    let server = guard
        .as_mut()
        .ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    let response: ThreadStartResponse = server.send_request("thread/start", params).await?;

    // Create session metadata only if project_id is valid (non-empty and exists in database)
    // Agent threads may not have a project_id, so we skip session metadata creation in that case
    if !project_id.is_empty() {
        // Check if project exists before creating session metadata
        if let Ok(Some(_)) = state.database.get_project(&project_id) {
            let metadata = SessionMetadata::new(&response.thread.id, &project_id);
            if let Err(e) = state.database.upsert_session_metadata(&metadata) {
                tracing::warn!("Failed to create session metadata: {}", e);
                // Don't fail the thread start - session metadata is optional for agent threads
            }
            // Update project last opened time
            if let Err(e) = state.database.update_project_last_opened(&project_id) {
                tracing::warn!("Failed to update project last opened time: {}", e);
            }
        } else {
            tracing::info!("Project {} not found in database, skipping session metadata creation", project_id);
        }
    } else {
        tracing::info!("No project_id provided, skipping session metadata creation (agent thread)");
    }

    tracing::info!("Started thread: {}", response.thread.id);

    Ok(response)
}

/// Resume an existing thread
///
/// Supports pagination for large threads:
/// - `limit`: Maximum number of items to return per page (default: 50)
/// - `cursor`: Pagination cursor for fetching subsequent pages
#[tauri::command]
pub async fn resume_thread(
    state: State<'_, AppState>,
    thread_id: String,
    limit: Option<u32>,
    cursor: Option<String>,
) -> Result<ThreadResumeResponse> {
    // Ensure app-server is running
    state.start_app_server().await?;

    let params = ThreadResumeParams {
        thread_id,
        limit,
        cursor,
    };

    let mut guard = state.app_server.write().await;
    let server = guard
        .as_mut()
        .ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    let response: ThreadResumeResponse = server.send_request("thread/resume", params).await?;

    tracing::info!(
        "Resumed thread: {}, items: {}, has_more: {:?}",
        response.thread.id,
        response.items.len(),
        response.has_more
    );

    Ok(response)
}

/// Skill input for send_message
#[derive(Debug, serde::Deserialize)]
pub struct SkillInput {
    pub name: String,
    pub path: String,
}

/// Send a message to start a new turn
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn send_message(
    state: State<'_, AppState>,
    thread_id: String,
    text: String,
    images: Option<Vec<String>>,
    skills: Option<Vec<SkillInput>>,
    effort: Option<String>,
    summary: Option<String>,
    model: Option<String>,
    approval_policy: Option<String>,
    sandbox_policy: Option<String>,
    best_of_n: Option<u32>,
) -> Result<TurnStartResponse> {
    let mut input: Vec<UserInput> = vec![UserInput::Text { text }];

    // Add skills if provided (skills should come before images in input)
    if let Some(skill_data) = skills {
        for skill in skill_data {
            input.push(UserInput::Skill {
                name: skill.name,
                path: skill.path,
            });
        }
    }

    // Add images if provided
    // Images can be either file paths or base64 data URLs
    if let Some(image_data) = images {
        for data in image_data {
            let path = if data.starts_with("data:image/") {
                // This is a base64 data URL - save to temp file
                save_base64_image_to_temp(&data)?
            } else {
                // This is already a file path
                data
            };
            input.push(UserInput::LocalImage { path });
        }
    }

    let params = TurnStartParams {
        thread_id,
        input,
        effort,
        summary,
        cwd: None,
        approval_policy,
        sandbox_policy: parse_sandbox_policy(sandbox_policy),
        model,
        best_of_n,
    };

    let mut guard = state.app_server.write().await;
    let server = guard
        .as_mut()
        .ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    let response: TurnStartResponse = server.send_request("turn/start", params).await?;

    tracing::info!("Started turn: {}", response.turn.id);

    Ok(response)
}

/// Interrupt the current turn
#[tauri::command]
pub async fn interrupt_turn(state: State<'_, AppState>, thread_id: String) -> Result<()> {
    let params = TurnInterruptParams { thread_id, turn_id: None };

    let mut guard = state.app_server.write().await;
    let server = guard
        .as_mut()
        .ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    let _: JsonValue = server.send_request("turn/interrupt", params).await?;

    tracing::info!("Interrupted turn");

    Ok(())
}

/// Respond to an approval request
///
/// request_id is the JSON-RPC request ID from the server's approval request.
/// The server sends approval requests as JSON-RPC requests (with both id and method),
/// so we respond with a proper JSON-RPC response containing the same id.
#[tauri::command]
pub async fn respond_to_approval(
    state: State<'_, AppState>,
    _thread_id: String,
    _item_id: String,
    decision: String,
    request_id: u64,
    execpolicy_amendment: Option<crate::app_server::ipc_bridge::ExecPolicyAmendment>,
) -> Result<()> {
    let decision = match decision.as_str() {
        "accept" => ApprovalDecision::Accept,
        "acceptForSession" => ApprovalDecision::AcceptForSession,
        "acceptWithExecpolicyAmendment" => {
            let amendment = execpolicy_amendment.ok_or_else(|| {
                crate::Error::Other("Missing execpolicy amendment".to_string())
            })?;
            ApprovalDecision::AcceptWithExecpolicyAmendment {
                execpolicy_amendment: amendment,
            }
        }
        "decline" => ApprovalDecision::Decline,
        "cancel" => ApprovalDecision::Cancel,
        _ => return Err(crate::Error::Other(format!("Invalid decision: {decision}"))),
    };

    let result = ApprovalResponseResult { decision };

    let mut guard = state.app_server.write().await;
    let server = guard
        .as_mut()
        .ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    // Send JSON-RPC response with the original request ID
    server.send_response(request_id, result).await?;

    tracing::info!("Responded to approval request {}", request_id);

    Ok(())
}

/// List threads from codex
#[tauri::command]
pub async fn list_threads(
    state: State<'_, AppState>,
    limit: Option<u32>,
    cursor: Option<String>,
) -> Result<ThreadListResponse> {
    // Ensure app-server is running
    state.start_app_server().await?;

    let params = ThreadListParams {
        limit,
        cursor,
        model_providers: None,
    };

    let mut guard = state.app_server.write().await;
    let server = guard
        .as_mut()
        .ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    let response: ThreadListResponse = server.send_request("thread/list", params).await?;

    Ok(response)
}

/// Fork a thread
#[tauri::command]
pub async fn fork_thread(
    state: State<'_, AppState>,
    thread_id: String,
    cwd: Option<String>,
) -> Result<ThreadForkResponse> {
    state.start_app_server().await?;
    let params = ThreadForkParams { thread_id, cwd };
    let mut guard = state.app_server.write().await;
    let server = guard.as_mut().ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    server.send_request("thread/fork", params).await
}

/// Archive a thread
#[tauri::command]
pub async fn archive_thread(state: State<'_, AppState>, thread_id: String) -> Result<()> {
    let params = ThreadArchiveParams { thread_id };
    let mut guard = state.app_server.write().await;
    let server = guard.as_mut().ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    let _: JsonValue = server.send_request("thread/archive", params).await?;
    Ok(())
}

/// Unarchive a thread
#[tauri::command]
pub async fn unarchive_thread(state: State<'_, AppState>, thread_id: String) -> Result<()> {
    let params = ThreadArchiveParams { thread_id };
    let mut guard = state.app_server.write().await;
    let server = guard.as_mut().ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    let _: JsonValue = server.send_request("thread/unarchive", params).await?;
    Ok(())
}

/// Compact a thread (summarize context to free up context window)
#[tauri::command]
pub async fn compact_thread(state: State<'_, AppState>, thread_id: String) -> Result<()> {
    let params = ThreadCompactParams { thread_id };
    let mut guard = state.app_server.write().await;
    let server = guard.as_mut().ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    let _: JsonValue = server.send_request("thread/compact/start", params).await?;
    Ok(())
}

/// Read a thread without resuming it
#[tauri::command]
pub async fn read_thread(
    state: State<'_, AppState>,
    thread_id: String,
    limit: Option<u32>,
    cursor: Option<String>,
) -> Result<ThreadReadResponse> {
    state.start_app_server().await?;
    let params = ThreadReadParams { thread_id, limit, cursor };
    let mut guard = state.app_server.write().await;
    let server = guard.as_mut().ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    server.send_request("thread/read", params).await
}

/// Set thread name
#[tauri::command]
pub async fn set_thread_name(
    state: State<'_, AppState>,
    thread_id: String,
    name: String,
) -> Result<()> {
    let params = ThreadNameSetParams { thread_id, name };
    let mut guard = state.app_server.write().await;
    let server = guard.as_mut().ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    let _: JsonValue = server.send_request("thread/name/set", params).await?;
    Ok(())
}

/// Rollback last N turns
#[tauri::command]
pub async fn rollback_thread(
    state: State<'_, AppState>,
    thread_id: String,
    num_turns: u32,
) -> Result<()> {
    let params = ThreadRollbackParams { thread_id, num_turns };
    let mut guard = state.app_server.write().await;
    let server = guard.as_mut().ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    let _: JsonValue = server.send_request("thread/rollback", params).await?;
    Ok(())
}

/// Steer an active turn (append input without creating a new turn)
#[tauri::command]
pub async fn steer_turn(
    state: State<'_, AppState>,
    thread_id: String,
    text: String,
) -> Result<()> {
    let input = vec![UserInput::Text { text }];
    let params = TurnSteerParams { thread_id, input };
    let mut guard = state.app_server.write().await;
    let server = guard.as_mut().ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    let _: JsonValue = server.send_request("turn/steer", params).await?;
    Ok(())
}

/// Cancel an in-progress login
#[tauri::command]
pub async fn cancel_login(state: State<'_, AppState>) -> Result<()> {
    let mut guard = state.app_server.write().await;
    let server = guard.as_mut().ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    let _: JsonValue = server.send_request("account/login/cancel", serde_json::json!({})).await?;
    Ok(())
}

/// List threads with extended filters
#[tauri::command]
pub async fn list_threads_filtered(
    state: State<'_, AppState>,
    limit: Option<u32>,
    cursor: Option<String>,
    model_providers: Option<Vec<String>>,
    source_kinds: Option<Vec<String>>,
    archived: Option<bool>,
    cwd: Option<String>,
    search_term: Option<String>,
    sort_key: Option<String>,
) -> Result<ThreadListResponse> {
    state.start_app_server().await?;
    let params = ThreadListExtendedParams {
        limit, cursor, model_providers, source_kinds, archived, cwd, search_term, sort_key,
    };
    let mut guard = state.app_server.write().await;
    let server = guard.as_mut().ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    server.send_request("thread/list", params).await
}

/// Update thread metadata (title, tags)
///
/// Maps to the official `thread/metadata/update` JSON-RPC method.
#[tauri::command]
pub async fn update_thread_metadata(
    state: State<'_, AppState>,
    thread_id: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<()> {
    let params = ThreadMetadataUpdateParams {
        thread_id,
        metadata: ThreadMetadataFields { title, tags },
    };
    let mut guard = state.app_server.write().await;
    let server = guard
        .as_mut()
        .ok_or_else(|| Error::AppServer("App server not running".to_string()))?;
    let _: serde_json::Value = server.send_request("thread/metadata/update", params).await?;
    tracing::info!("Updated thread metadata");
    Ok(())
}

/// Save a base64 data URL image to a temporary file and return the path
fn save_base64_image_to_temp(data_url: &str) -> Result<String> {
    // Parse the data URL: data:image/png;base64,<data>
    let parts: Vec<&str> = data_url.splitn(2, ',').collect();
    if parts.len() != 2 {
        return Err(Error::Other("Invalid data URL format".to_string()));
    }

    let header = parts[0];
    let base64_data = parts[1];

    // Determine file extension from MIME type
    let extension = if header.contains("image/png") {
        "png"
    } else if header.contains("image/jpeg") || header.contains("image/jpg") {
        "jpg"
    } else if header.contains("image/gif") {
        "gif"
    } else if header.contains("image/webp") {
        "webp"
    } else {
        "png" // Default to png
    };

    // Decode base64
    let image_bytes = STANDARD
        .decode(base64_data)
        .map_err(|e| Error::Other(format!("Failed to decode base64 image: {e}")))?;

    // Create temp file
    let temp_dir = std::env::temp_dir();
    let file_name = format!("codex_image_{}_{}.{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis(),
        extension
    );
    let temp_path = temp_dir.join(file_name);

    // Write to file
    let mut file = std::fs::File::create(&temp_path)
        .map_err(|e| Error::Other(format!("Failed to create temp file: {e}")))?;
    file.write_all(&image_bytes)
        .map_err(|e| Error::Other(format!("Failed to write image to temp file: {e}")))?;

    Ok(temp_path.to_string_lossy().to_string())
}
