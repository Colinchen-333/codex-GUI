//! Automation scheduling commands

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::state::AppState;
use crate::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationRun {
    pub id: String,
    pub automation_id: String,
    pub status: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub result_summary: Option<String>,
    pub thread_id: Option<String>,
}

#[tauri::command]
pub async fn list_automations(
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>> {
    state.database.list_automations()
}

#[tauri::command]
pub async fn create_automation(
    state: State<'_, AppState>,
    name: String,
    prompt: String,
    project_id: String,
    schedule_cron: Option<String>,
    schedule_timezone: Option<String>,
) -> Result<serde_json::Value> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    state.database.create_automation(
        &id, &name, &prompt, &project_id,
        schedule_cron.as_deref(), schedule_timezone.as_deref(), &now,
    )?;

    let schedule = schedule_cron.map(|c| serde_json::json!({
        "cron": c,
        "timezone": schedule_timezone,
    }));

    Ok(serde_json::json!({
        "id": id,
        "name": name,
        "prompt": prompt,
        "project_id": project_id,
        "schedule": schedule,
        "enabled": true,
        "last_run_at": null,
        "run_count": 0,
        "created_at": now,
    }))
}

#[tauri::command]
pub async fn update_automation(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    prompt: Option<String>,
    schedule_cron: Option<String>,
    schedule_timezone: Option<String>,
    enabled: Option<bool>,
) -> Result<()> {
    if let Some(name) = name {
        state.database.update_automation_field(&id, "name", &name)?;
    }
    if let Some(prompt) = prompt {
        state.database.update_automation_field(&id, "prompt", &prompt)?;
    }
    if let Some(cron) = schedule_cron {
        state.database.update_automation_field(&id, "schedule_cron", &cron)?;
    }
    if let Some(tz) = schedule_timezone {
        state.database.update_automation_field(&id, "schedule_timezone", &tz)?;
    }
    if let Some(enabled) = enabled {
        state.database.update_automation_enabled(&id, enabled)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn delete_automation(
    state: State<'_, AppState>,
    id: String,
) -> Result<()> {
    state.database.delete_automation(&id)
}

#[tauri::command]
pub async fn run_automation_now(
    state: State<'_, AppState>,
    id: String,
) -> Result<serde_json::Value> {
    let now = chrono::Utc::now().to_rfc3339();
    let run_id = uuid::Uuid::new_v4().to_string();

    state.database.record_automation_run(&run_id, &id, &now)?;

    Ok(serde_json::json!({
        "id": run_id,
        "automation_id": id,
        "status": "running",
        "started_at": now,
        "completed_at": null,
        "result_summary": null,
        "thread_id": null,
    }))
}

#[tauri::command]
pub async fn list_automation_runs(
    state: State<'_, AppState>,
    automation_id: String,
) -> Result<Vec<serde_json::Value>> {
    state.database.list_automation_runs(&automation_id)
}
