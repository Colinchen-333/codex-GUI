# Official Codex Desktop v26.305.950 Reverse Engineering Analysis

## Version Info
- Product: openai-codex-electron v26.305.950, build 863
- Electron 40, Vite 8 beta, React 19 (compiler-runtime), TypeScript 5.9
- State: Jotai atoms + TanStack Query (persisted atoms)
- UI: Tailwind CSS v4 + Radix primitives
- Bundled: node-pty, better-sqlite3, sparkle (auto-update)
- Default model: `gpt-5.3-codex`, reasoning effort: `medium`
- Available models: gpt-5.1, 5.2, 5.3-codex, 5.4
- Reasoning efforts: minimal, low, medium, high, xhigh

## IPC Architecture
- **Main channel**: `codex_desktop:message-from-view` / `message-for-view`
- **Worker channels**: `codex_desktop:worker:{workerId}:from-view/for-view` (e.g. `git`)
- **Context menu**: `codex_desktop:show-context-menu`
- **Misc**: `codex_desktop:get-sentry-init-options`, `get-build-flavor`, `get-fast-mode-rollout-metrics`, `trigger-sentry-test`

## JSON-RPC Methods (40 total)

### Thread lifecycle
- `thread/start` - Start new thread
- `thread/resume` - Resume existing thread
- `thread/read` - Read thread without resuming
- `thread/list` - List threads with filters
- `thread/fork` - Fork/branch thread
- `thread/archive` / `thread/unarchive`
- `thread/name/set` - Rename thread
- `thread/rollback` - Undo turns
- `thread/metadata/update` - Update thread metadata

### Turn lifecycle
- `turn/start` - Send user message
- `turn/interrupt` - Cancel running turn

### Account
- `account/login/start` / `account/login/cancel` / `account/login/completed`
- `account/read` / `account/logout`

### Config
- `config/read` - Read configuration
- `config/value/write` - Write config value

### Models
- `model/list` - List available models

### Skills
- `skills/list` - List skills
- `skills/config/write` - Write skill config

### Apps
- `app/list` - List connected apps

### Feedback
- `feedback/upload` - Upload feedback

### Automations
- `automation-create` / `automation-update` / `automation-delete`
- `automation-run-now` / `automation-run-archive` / `automation-run-delete`

## Server Events (subscribed via window message)

### Thread events
- `thread/started` - Thread created
- `thread/status/changed` - Thread status change
- `thread/archived` / `thread/unarchived`

### Turn/Item events (granular)
- `turn/started` / `turn/completed`
- `turn/diff/updated` / `turn/plan/updated`
- `item/started` / `item/completed` - Individual item lifecycle
- `item/tool/call` - Tool call event
- `item/plan/delta` - Plan delta streaming

### Account events
- `account/updated` / `account/login/completed`

### Model events
- `model/rerouted` - Model was rerouted

### Skills/Apps events
- `skills/changed`
- `app/list/updated`

### Automation events
- `automation-runs-updated`

## Git Worker Channel
Separate worker process with dedicated IPC channel (`git` workerId).

### Git Methods (18)
- `stable-metadata` - Get repo metadata (commonDir, root, hostConfig)
- `current-branch` / `upstream-branch` / `recent-branches`
- `branch-ahead-count` / `branch-changes`
- `default-branch` / `base-branch`
- `status-summary`
- `staged-and-unstaged-changes` / `untracked-changes` / `tracked-uncommitted-changes`
- `index-info` / `submodule-paths`
- `synced-branch` / `synced-branch-state`

### Git Cache Invalidation Groups
- `head` changes → refresh: current-branch, upstream-branch, branch-ahead-count, recent-branches, branch-changes, status-summary, staged-and-unstaged-changes, untracked-changes, tracked-uncommitted-changes, index-info, submodule-paths, synced-branch
- `remote-refs` changes → refresh: branch-ahead-count, default-branch, base-branch, branch-changes
- `synced-branch` changes → refresh: synced-branch, synced-branch-state

## Tailwind Token Classes (official)

### Text tokens
text-token-text-primary, text-token-text-secondary, text-token-text-tertiary
text-token-foreground, text-token-foreground-muted, text-token-muted-foreground
text-token-description-foreground, text-token-disabled-foreground
text-token-icon-foreground, text-token-link, text-token-link-foreground
text-token-input-foreground, text-token-input-placeholder-foreground
text-token-danger, text-token-success, text-token-error-foreground
text-token-badge-foreground, text-token-button-foreground
text-token-button-tertiary-foreground, text-token-checkbox-foreground
text-token-terminal-foreground
text-token-charts-{blue,green,orange,purple,red,yellow}
text-token-editor-error-foreground, text-token-editor-warning-foreground
text-token-git-decoration-{added,deleted}-resource-foreground

### Background tokens
bg-token-background, bg-token-main-surface-primary
bg-token-surface-{primary,secondary,tertiary,muted}
bg-token-bg-{primary,secondary,tertiary,subtle,fog}
bg-token-side-bar-background, bg-token-terminal-background
bg-token-input-background, bg-token-dropdown-background, bg-token-menu-background
bg-token-editor-background, bg-token-editor-group-drop-background
bg-token-text-code-block-background
bg-token-list-{active-selection,hover}-background
bg-token-toolbar-hover-background
bg-token-button-foreground, bg-token-button-secondary-hover-background
bg-token-button-tertiary-background
bg-token-checkbox-background, bg-token-radio-active-foreground
bg-token-badge-background
bg-token-foreground, bg-token-border, bg-token-border-default
bg-token-success, bg-token-error-foreground
bg-token-charts-{blue,green,orange,purple,red,yellow}
bg-token-text-link-{foreground,active-foreground}
bg-token-input-validation-{error,info,warning}-background
bg-token-editor-{error,warning}-foreground
bg-token-editor-group-drop-into-prompt-background

### Border tokens
border-token-border, border-token-border-{default,light,subtle,error}
border-token-focus-border, border-token-button-border
border-token-input-{background,border}
border-token-input-validation-{error,warning}-border
border-token-side-bar-background, border-token-terminal-border
border-token-dropdown-background
border-token-success, border-token-error-foreground
border-token-bg-primary, border-token-charts-blue
border-token-editor-{error,group-drop-into-prompt}-foreground
border-token-text-link-foreground

### Divide tokens
divide-token-border

## Settings Pages (12)
1. `account` - Account
2. `general-settings` - General
3. `agent` - Configuration
4. `git-settings` - Git
5. `data-controls` - Archived threads
6. `personalization` - Personalization
7. `usage` - Usage
8. `local-environments` - Environments
9. `worktrees` - Worktrees
10. `environments` - Cloud Environments
11. `mcp-settings` - MCP servers
12. `skills-settings` - Skills

## UI Components Referenced
- SettingsSurface (section + header + content pattern)
- SettingsRow (label + description + control)
- SegmentedToggle
- Toggle (switch)
- Checkbox
- Dropdown
- Dialog + DialogLayout
- Toaster
- Tooltip
- InlineChip
- CodeSnippet
- Markdown
- ConnectorLogo

## Thread Features
- Pin threads (`pin-thread`, `set-pinned-threads-order`)
- Mark thread unread (`mark-thread-unread`)
- Move thread between modes (`move-thread`, `move-thread-to-local`, `move-thread-to-worktree`)
- Thread diff virtualization (`thread-diff-virtualized`, `content-visibility: auto`)
- Find in thread (CSS Custom Highlight API)
- Thread follower/collaboration mode

## Hotkey Window System
- Separate window type for quick access
- States: home, thread, collapse, dismiss, transition
- Project selection from hotkey window
- Open thread in main window from hotkey window

## Composer Features
- Model selection with reasoning effort
- Agent mode: auto (default)
- Best-of-N: configurable
- Auto context: enabled by default
- Enter behavior: configurable (enter vs shift+enter)
- Prompt history
- File mentions + skill mentions
- Image analysis

## Feature Flags
- `statsig_default_enable_features` with sub-features like `fast_mode`
- Fast mode only available for ChatGPT auth method
