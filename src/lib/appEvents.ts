export const APP_EVENTS = {
  OPEN_COMMIT_DIALOG: 'codex:open-commit-dialog',
  OPEN_CREATE_PR_DIALOG: 'codex:open-create-pr-dialog',
  TOGGLE_TERMINAL: 'codex:toggle-terminal',
  TOGGLE_REVIEW_PANEL: 'codex:toggle-review-panel',
  OPEN_IMPORT_CODEX_SESSIONS: 'codex:open-import-codex-sessions',
  OPEN_PROJECT_SETTINGS: 'codex:open-project-settings',
  OPEN_EXPORT_SESSION: 'codex:open-export-session',
  OPEN_RENAME_SESSION: 'codex:open-rename-session',
  OPEN_CLOSE_SESSION: 'codex:open-close-session',
} as const

export type AppEventName = (typeof APP_EVENTS)[keyof typeof APP_EVENTS]

export function dispatchAppEvent<TDetail = unknown>(name: AppEventName, detail?: TDetail): void {
  window.dispatchEvent(new CustomEvent<TDetail>(name, { detail }))
}
