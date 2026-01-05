//! Project management commands

use std::path::Path;

use tauri::State;

use crate::database::{Project, ProjectSettings};
use crate::state::AppState;
use crate::Result;

/// List all projects
#[tauri::command]
pub async fn list_projects(state: State<'_, AppState>) -> Result<Vec<Project>> {
    state.database.get_all_projects()
}

/// Add a new project
#[tauri::command]
pub async fn add_project(state: State<'_, AppState>, path: String) -> Result<Project> {
    // Validate path exists
    if !Path::new(&path).exists() {
        return Err(crate::Error::InvalidPath(format!(
            "Path does not exist: {}",
            path
        )));
    }

    // Check if already added
    let existing = state.database.get_all_projects()?;
    if existing.iter().any(|p| p.path == path) {
        return Err(crate::Error::Other("Project already exists".to_string()));
    }

    let project = Project::new(&path);
    state.database.insert_project(&project)?;

    tracing::info!("Added project: {} at {}", project.id, path);

    Ok(project)
}

/// Remove a project
#[tauri::command]
pub async fn remove_project(state: State<'_, AppState>, id: String) -> Result<()> {
    state.database.delete_project(&id)?;
    tracing::info!("Removed project: {}", id);
    Ok(())
}

/// Update project settings
#[tauri::command]
pub async fn update_project(
    state: State<'_, AppState>,
    id: String,
    display_name: Option<String>,
    settings: Option<ProjectSettings>,
) -> Result<Project> {
    let project = state
        .database
        .get_project(&id)?
        .ok_or_else(|| crate::Error::ProjectNotFound(id.clone()))?;

    // For now, we'll need to delete and re-insert
    // A proper UPDATE query would be better
    let mut updated = project;
    if let Some(name) = display_name {
        updated.display_name = Some(name);
    }
    if let Some(s) = settings {
        updated.settings_json = Some(serde_json::to_string(&s).unwrap_or_default());
    }

    state.database.delete_project(&id)?;
    state.database.insert_project(&updated)?;

    Ok(updated)
}

/// Get git information for a project
#[tauri::command]
pub async fn get_project_git_info(path: String) -> Result<GitInfo> {
    let project_path = Path::new(&path);

    if !project_path.join(".git").exists() {
        return Ok(GitInfo {
            is_git_repo: false,
            branch: None,
            is_dirty: None,
            last_commit: None,
        });
    }

    // Get current branch
    let branch_output = std::process::Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(project_path)
        .output()
        .ok();

    let branch = branch_output
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());

    // Check if dirty
    let status_output = std::process::Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(project_path)
        .output()
        .ok();

    let is_dirty = status_output
        .filter(|o| o.status.success())
        .map(|o| !o.stdout.is_empty());

    // Get last commit message
    let log_output = std::process::Command::new("git")
        .args(["log", "-1", "--pretty=%s"])
        .current_dir(project_path)
        .output()
        .ok();

    let last_commit = log_output
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());

    Ok(GitInfo {
        is_git_repo: true,
        branch,
        is_dirty,
        last_commit,
    })
}

/// Get git diff for a project (tracked + untracked)
#[tauri::command]
pub async fn get_project_git_diff(path: String) -> Result<GitDiff> {
    let project_path = Path::new(&path);
    if !project_path.exists() {
        return Err(crate::Error::InvalidPath(format!(
            "Path does not exist: {}",
            path
        )));
    }

    if !inside_git_repo(project_path)? {
        return Ok(GitDiff {
            is_git_repo: false,
            diff: String::new(),
        });
    }

    let tracked_diff = run_git_capture_diff(project_path, &["diff"])?;
    let untracked_output =
        run_git_capture_stdout(project_path, &["ls-files", "--others", "--exclude-standard"])?;

    let mut untracked_diff = String::new();
    let null_path = if cfg!(windows) { "NUL" } else { "/dev/null" };

    for file in untracked_output.lines().map(str::trim).filter(|s| !s.is_empty()) {
        let args = ["diff", "--no-index", "--", null_path, file];
        if let Ok(diff) = run_git_capture_diff(project_path, &args) {
            untracked_diff.push_str(&diff);
        }
    }

    Ok(GitDiff {
        is_git_repo: true,
        diff: format!("{tracked_diff}{untracked_diff}"),
    })
}

/// Git repository information
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitInfo {
    pub is_git_repo: bool,
    pub branch: Option<String>,
    pub is_dirty: Option<bool>,
    pub last_commit: Option<String>,
}

/// Git diff response
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitDiff {
    pub is_git_repo: bool,
    pub diff: String,
}

fn inside_git_repo(project_path: &Path) -> Result<bool> {
    let status = std::process::Command::new("git")
        .args(["rev-parse", "--is-inside-work-tree"])
        .current_dir(project_path)
        .status();

    match status {
        Ok(s) if s.success() => Ok(true),
        Ok(_) => Ok(false),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(err) => Err(crate::Error::Other(format!(
            "Failed to check git repo: {}",
            err
        ))),
    }
}

fn run_git_capture_stdout(project_path: &Path, args: &[&str]) -> Result<String> {
    let output = std::process::Command::new("git")
        .args(args)
        .current_dir(project_path)
        .output()
        .map_err(|err| crate::Error::Other(format!("Failed to run git: {}", err)))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        Err(crate::Error::Other(format!(
            "git {:?} failed with status {}",
            args, output.status
        )))
    }
}

fn run_git_capture_diff(project_path: &Path, args: &[&str]) -> Result<String> {
    let output = std::process::Command::new("git")
        .args(args)
        .current_dir(project_path)
        .output()
        .map_err(|err| crate::Error::Other(format!("Failed to run git: {}", err)))?;

    if output.status.success() || output.status.code() == Some(1) {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        Err(crate::Error::Other(format!(
            "git {:?} failed with status {}",
            args, output.status
        )))
    }
}
