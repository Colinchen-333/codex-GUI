# Official Codex Desktop v26.305.950 - JavaScript Architecture Analysis

Extracted from `/Applications/Codex.app` via `app.asar` unpacking.

---

## 1. High-Level Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Electron | 40.0.0 |
| UI Framework | React | 19.2.0 |
| React Compiler | `compiler-runtime` | Active (useMemoCache) |
| Build Tool | Vite | 8.0.0-beta.15 |
| CSS Framework | Tailwind CSS v4 | With `tailwind-styled-components` |
| State Management | **Jotai** (atoms) + **TanStack Query** (server state) | |
| Routing | **React Router** (v7-style `<Route>` elements) | |
| UI Primitives | **Radix UI** (Dialog, Tooltip, Dropdown, etc.) | |
| Schema Validation | Zod | ^4.1.13 |
| i18n | **react-intl** / FormatJS | 58 locale files |
| Feature Flags | **Statsig** | SDK embedded |
| Error Tracking | **Sentry** | 10.29.0 |
| Immutable State | Immer | ^10.1.1 |
| Forms | @tanstack/react-form | ^1.27.7 |
| Class Merging | tailwind-merge (via `tailwind-styled-components`) | |
| Diagrams | Mermaid (lazy-loaded diagram chunks) | |
| Math | KaTeX (lazy-loaded) | |
| PDF | PDF.js (worker + viewer) | |
| Graphs | Cytoscape.js + dagre layout | |
| Syntax Highlighting | Shiki (400+ grammars, web worker) | |
| Lottie Animations | Multiple animation JSON chunks | |

---

## 2. State Management Architecture

### Jotai (Client State)

The app uses **Jotai atoms** as the primary client-side state management. Key patterns:

**Core module: `persisted-atom-DZbaQxiM.js`**
- Contains the full Jotai core: `atom()`, `useAtomValue()`, `useSetAtom()`, `useAtom()`, `createStore()`, `Provider`
- Custom `atomFamily()`, `atomWithDefault()`, `loadable()`, `atomWithRefresh()`
- **Custom persistence layer**: `persistedAtom` backed by a key-value store that syncs with the app-server via `codex:persisted-atom:` prefixed localStorage keys
- `ye()` (initializePersistedAtomStore) bootstraps persisted state from the app-server
- `we()` (resetAllPersistedAtoms) clears all state

**Composer atoms (`composer-atoms-p3lVwjLZ.js`)**:
```
Persisted atoms (survive page reload):
- agent-mode: 'auto' (default)
- skip-full-access-confirm: false
- skip-thread-branch-mismatch-confirm: false
- composer-best-of-n: 1
- prompt-history: []
- composer-auto-context-enabled: true
- enter-behavior: 'enter'

Non-persisted atoms:
- current conversation reference
- pending model selection
```

Default model: `gpt-5.3-codex`
Reasoning efforts: `['minimal', 'low', 'medium', 'high', 'xhigh']`

### TanStack Query (Server State)

All data fetching uses TanStack Query with stale-time constants:
- `FIVE_MINUTES` - config, models, skills
- `FIVE_SECONDS` - MCP server status
- `INFINITE` - git metadata, analytics config, config requirements

Query key patterns:
- `['config', 'mcp', 'servers', cwd]` - MCP server config
- `['config', 'user']` - user config
- `['config', 'analytics']` - analytics config
- `['models', 'list', authMethod]` - model list
- `['git', 'metadata', hostKey, cwd]` - git metadata
- `['git', hostKey, cwd, method, params]` - git RPC queries
- `['get-global-state', key]` - global state key-value

### Global State Hook

`use-global-state-wIi_w9PS.js` provides a `useGlobalState(key)` hook that:
1. Reads from TanStack Query cache (`get-global-state` query)
2. Writes via mutation (`set-global-state` mutation)
3. Optimistically updates the query cache
4. Falls back to a default value per key

---

## 3. Routing Structure

Uses React Router with `<Route>` elements and a flat/nested structure:

```
/ ............................................. Home (thread list)
/first-run .................................... First-run onboarding
/login ........................................ Login page
/welcome ...................................... Welcome page
/select-workspace ............................. Workspace selector
/local/:conversationId ........................ Local thread view
/thread-overlay/:conversationId ............... Thread overlay (modal)
/remote/:taskId ............................... Remote/cloud task view
/remote-connections ........................... Remote connections manager
/hotkey-window ................................ Hotkey window (mini launcher)
/hotkey-window/thread/:conversationId ......... Hotkey thread view
/inbox ........................................ Inbox
  /:itemId .................................... Inbox item detail
/worktree-init-v2/:pendingWorktreeId .......... Worktree initialization
/connector/oauth_callback ..................... OAuth callback
/diff ......................................... Diff viewer
/plan-summary ................................. Plan summary
/file-preview ................................. File preview
/settings ..................................... Settings container
  /account .................................... Account settings
  /general-settings ........................... General settings
  /agent ...................................... Configuration/Agent settings
  /git-settings ............................... Git settings
  /data-controls .............................. Archived threads
  /personalization ............................ Personalization
  /usage ...................................... Usage stats
  /local-environments ......................... Local environments
  /worktrees .................................. Worktrees
  /environments ............................... Cloud environments
  /mcp-settings ............................... MCP servers
  /skills-settings ............................ Skills settings
  /open-source-licenses ....................... OSS licenses
/skills ....................................... Skills page
/debug ........................................ Debug page
```

Layout hierarchy:
1. Root layout (`__e`) wraps all authenticated routes
2. Main app layout (`Yre`) wraps the primary app shell
3. Settings layout with sidebar navigation

---

## 4. IPC Layer Design

### Architecture Overview

```
Renderer (React)                 Main Process (Node.js)              App Server (Codex CLI)
   |                                   |                                    |
   |--electronBridge.send----------->  |                                    |
   |   MessageFromView                |--stdio/WebSocket JSON-RPC-------> |
   |                                   |                                    |
   |  <--window 'message' event-----  |  <---JSON-RPC response/events---  |
   |      MessageForView              |                                    |
   |                                   |                                    |
   |--electronBridge.sendWorker----->  |  (separate git worker channel)     |
   |   WorkerMessageFromView          |--codex_desktop:worker:git:-------> |
```

### Electron Preload Bridge (`preload.js`)

Exposed as `window.electronBridge`:

| Method | IPC Channel | Purpose |
|--------|-------------|---------|
| `sendMessageFromView(msg)` | `codex_desktop:message-from-view` | Send JSON-RPC request to app-server |
| `sendWorkerMessageFromView(workerId, msg)` | `codex_desktop:worker:{id}:from-view` | Send to git worker |
| `subscribeToWorkerMessages(workerId, cb)` | `codex_desktop:worker:{id}:for-view` | Listen to git worker events |
| `getPathForFile(file)` | sync | Get native file path |
| `showContextMenu(opts)` | `codex_desktop:show-context-menu` | Show native context menu |
| `getSentryInitOptions()` | sync (cached) | Sentry config |
| `getBuildFlavor()` | sync (cached) | Build flavor string |
| `triggerSentryTestError()` | `codex_desktop:trigger-sentry-test` | Test Sentry |

App-server responses arrive via `window.addEventListener('message', ...)` on the `codex_desktop:message-for-view` channel.

### JSON-RPC Methods (Request/Response)

36 methods identified in the frontend:

**Account**:
- `account/read` - Read current account info
- `account/login/start` - Start OAuth login
- `account/login/cancel` - Cancel login
- `account/logout` - Logout

**Thread Lifecycle**:
- `thread/start` - Start new thread
- `thread/resume` - Resume existing thread
- `thread/read` - Read thread data
- `thread/list` - List threads (with filters)
- `thread/fork` - Fork/branch a thread
- `thread/archive` - Archive thread
- `thread/unarchive` - Unarchive thread
- `thread/rollback` - Undo last N turns
- `thread/name/set` - Set thread name
- `thread/metadata/update` - Update thread metadata
- `thread/backgroundTerminals/clean` - Clean background terminals

**Turn**:
- `turn/start` - Start a new turn (send message)
- `turn/interrupt` - Interrupt running turn

**Config**:
- `config/read` - Read configuration (with layers)
- `config/value/write` - Write single config value
- `config/batchWrite` - Batch write config values
- `configRequirements/read` - Read config requirements

**Models**:
- `model/list` - List available models

**Skills**:
- `skills/list` - List skills
- `skills/config/write` - Write skill config

**MCP**:
- `mcpServerStatus/list` - List MCP server statuses
- `mcpServer/oauth/login` - MCP server OAuth

**Apps**:
- `app/list` - List connected apps

**File Search**:
- `fuzzyFileSearch` - One-shot fuzzy file search
- `fuzzyFileSearch/sessionStart` - Start search session
- `fuzzyFileSearch/sessionUpdate` - Update search query
- `fuzzyFileSearch/sessionStop` - Stop search session

**Misc**:
- `feedback/upload` - Upload feedback
- `experimentalFeature/list` - List experimental features
- `collaborationMode/list` - List collaboration modes
- `gitDiffToRemote` - Get diff to remote
- `windowsSandbox/setupStart` - Windows sandbox setup

### Server-Push Events

18 event types identified:

| Event | Description |
|-------|-------------|
| `account/updated` | Account info changed |
| `account/login/completed` | Login flow completed |
| `thread/started` | Thread created |
| `thread/status/changed` | Thread status change |
| `thread/archived` | Thread archived |
| `thread/unarchived` | Thread unarchived |
| `turn/started` | Turn began processing |
| `turn/completed` | Turn finished |
| `turn/diff/updated` | File diff updated during turn |
| `turn/plan/updated` | Plan updated during turn |
| `item/started` | Stream item started |
| `item/completed` | Stream item completed |
| `item/plan/delta` | Plan delta update |
| `item/tool/call` | Tool call event |
| `skills/changed` | Skills list changed |
| `model/rerouted` | Model rerouted |
| `app/list/updated` | Apps list changed |

### Git Worker Channel

Separate worker process (`git` workerId) with its own request/response protocol:

**Query methods** (read-only, cached via TanStack Query):
- `stable-metadata` - Repository metadata (commonDir, root)
- `current-branch` / `upstream-branch` / `recent-branches`
- `branch-ahead-count` / `branch-changes`
- `status-summary`
- `staged-and-unstaged-changes` / `untracked-changes` / `tracked-uncommitted-changes`
- `index-info` / `submodule-paths`
- `synced-branch` / `synced-branch-state`
- `default-branch` / `base-branch`

**Mutation methods** (via main bundle):
- `apply-changes` - Apply file changes
- `create-worktree` / `delete-worktree`
- `move-thread-to-local` / `move-thread-to-worktree`
- `set-worktree-owner-thread` / `resolve-worktree-for-thread`
- `worktree-snapshot-ref`
- `git-init-repo` / `overwrite-repo`
- `cat-file`
- `config-value`

Cache invalidation groups:
- `head` changes invalidate: current-branch, upstream-branch, branch-ahead-count, recent-branches, branch-changes, status-summary, staged-and-unstaged, untracked, tracked-uncommitted, index-info, submodule-paths, synced-branch
- `remote-refs` changes invalidate: branch-ahead-count, default-branch, base-branch, branch-changes
- `synced-branch` changes invalidate: synced-branch, synced-branch-state

---

## 5. UI Component Library

### Radix UI Primitives

The app uses **Radix UI** unstyled primitives, wrapped with Tailwind classes:

- **Dialog** (`dialog-CQtg3dJc.js`): Full Radix Dialog with Portal, Overlay, Content, Title, Description, Close. Custom height animation with ResizeObserver.
- **Tooltip** (`tooltip-DJ38bi13.js`): Radix Tooltip with custom positioning
- **Dropdown** (`dropdown-DNwdroSj.js`): Radix DropdownMenu
- **Checkbox** (`checkbox-CL4qGDPq.js`): Radix Checkbox
- **Toggle** (`toggle-C6Z0GVSX.js`): Custom toggle component
- **Segmented Toggle** (`segmented-toggle-CIN9nTsq.js`): Radio group style toggle

### Custom Components

- **Dialog Layout** (`dialog-layout-CI3EzXNC.js`): Standardized dialog layouts
- **Inline Chip** (`inline-chip-D8rFbOIc.js`): Inline mention/tag chips
- **Code Snippet** (`code-snippet-Dy3o1M6z.js`): Code display with copy
- **Toaster** (`toaster-DVS7CElZ.js`): Toast notification system
- **Connector Logo** (`connector-logo-BUTxUEQs.js`): OAuth connector logos
- **Settings Surface** (`settings-surface-DbZNaw8K.js`): Settings page layout primitives:
  - `SettingsSurface` (container)
  - `SettingsSection` (group)
  - `SettingsSection.Header` (title + subtitle + actions)
  - `SettingsSection.Content` (body)
  - `SettingsRow` (label + description + control)
  - `SettingsCard` (bordered card container)

### Tailwind Styled Components

Uses `tailwind-styled-components` for creating typed Tailwind components:
```js
import tw from 'tailwind-styled-components'
const Button = tw.button`px-4 py-2 bg-blue-500 rounded`
```
Includes full tailwind-merge for class deduplication.

### Design Token System

All colors use `token-*` CSS custom properties (535 `--color-token-*` variables in CSS):
- `token-background`, `token-foreground`
- `token-text-primary`, `token-text-secondary`, `token-text-tertiary`
- `token-border`, `token-border-default`, `token-border-light`, `token-border-subtle`
- `token-bg-primary`, `token-bg-secondary`, `token-bg-subtle`, `token-bg-tertiary`
- `token-button-background`, `token-button-foreground`, `token-button-border`
- `token-dropdown-background`
- `token-editor-background`, `token-editor-error-foreground`, `token-editor-warning-foreground`
- `token-danger`, `token-error-foreground`
- `token-charts-{blue,green,orange,purple,red,yellow}`
- `token-checkbox-border`
- 99 unique token classes identified in the main bundle

---

## 6. Module Breakdown

### Core Infrastructure (always loaded)

| Module | Size | Purpose |
|--------|------|---------|
| `index-CMu6BCpo.js` | 3.4 MB | Main bundle (React app, all routes, core components) |
| `links-f_CHLUQK.js` | 177 KB | Shared utilities: TanStack Query, Radix primitives, Zod, i18n, tailwind merge |
| `react-DEh3VhWB.js` | - | React 19.2.0 runtime |
| `compiler-runtime-CkFESl8x.js` | - | React Compiler runtime (useMemoCache) |
| `jsx-runtime-BjItZljr.js` | - | JSX runtime |
| `persisted-atom-DZbaQxiM.js` | - | Jotai core + custom persistence layer |
| `app-server-manager-hooks-CAvrQB7n.js` | 241 KB | App-server IPC client, all JSON-RPC methods, Immer, markdown processing |
| `sentry-tracing.electron-Bs8Hqf-8.js` | - | Sentry error tracking |
| `statsig-OoMcRV8f.js` | - | Statsig feature flags SDK |
| `logger-Dlhbocpf.js` | - | Structured logging |

### Feature Modules (lazy-loaded)

| Module | Purpose |
|--------|---------|
| `composer-atoms-p3lVwjLZ.js` | Composer state: model selection, agent mode, prompt history |
| `config-queries-BkCw9D0W.js` | Config read/write queries, MCP server config |
| `use-auth-DPEDvGiB.js` | Auth context provider and hooks |
| `use-global-state-wIi_w9PS.js` | Global key-value state hook |
| `codex-api-30tEB8MV.js` | TanStack infinite query support, API pagination |
| `git-api-Bsu1OGLH.js` | Git worker RPC client, query builders, cache invalidation |
| `diff-view-mode-DWjUgGKA.js` | Diff viewer with Shiki highlighting (231 KB, includes grammar map) |
| `shiki-highlight-provider-DOEBSIlp.js` | Shiki highlight provider |
| `shiki-worker-factory-vite-CQqZo3SK.js` | Shiki web worker factory |
| `markdown-BnSYjTO0.js` | Markdown renderer |
| `katex-BJt1mdYZ.js` / `katex-D--8A1a5.js` | KaTeX math rendering |

### Settings Pages (lazy-loaded)

| Module | Purpose |
|--------|---------|
| `settings-surface-DbZNaw8K.js` | Settings layout primitives |
| `general-settings-BnYxmkHc.js` / `general-settings-DdkOfEgD.js` | General settings |
| `agent-settings-3TN_j2VX.js` | Agent/configuration settings |
| `personalization-settings-BBzAxrmZ.js` | Personalization settings |
| `usage-settings-CM9H7rWZ.js` | Usage statistics |
| `data-controls-BhHg3Nth.js` | Archived threads / data controls |
| `mcp-settings-cFHB2HKo.js` | MCP server settings |
| `skills-settings-CeU_ojJw.js` | Skills settings |
| `skills-page-DeBxXSaK.js` | Skills page (106 KB) |
| `worktrees-settings-page-Bgl0NL4M.js` | Worktrees settings |
| `local-environments-settings-page-B-dYZlLM.js` | Local environments settings |
| `git-settings-CqgUjY8c.js` | Git settings |

### Feature-Area Modules

| Module | Purpose |
|--------|---------|
| `automation-B4TwHeFW.js` | Automation list/cards |
| `automation-dialog-BIAeyC_e.js` / `automation-dialog-DmcmUzw3.js` | Automation create/edit dialog |
| `worktree-rKyQ145C.js` | Worktree icon component |
| `worktree-paths-DfZLeTeh.js` | Worktree path utilities |
| `app-connect-modal-DXUtRYRf.js` | App connection modal |
| `use-navigate-to-local-conversation-BBDzbgPj.js` | Navigation to local threads |
| `use-hotkey-CfVmOSLt.js` | Hotkey registration |
| `electron-menu-shortcuts-Bkiej8gg.js` | Electron menu keyboard shortcuts |
| `use-personality-DZuVID-K.js` | Personality settings hook |
| `use-configuration-HtRg6Zv1.js` | Configuration hook |
| `use-window-type-DTLZmuDX.js` | Window type detection (electron/extension) |
| `use-os-info-ChVtVnEk.js` | OS information hook |
| `use-is-dark-B2sAPpwK.js` | Dark mode detection |
| `use-usage-settings-access-eErYKqm0.js` | Usage settings access control |
| `initial-route-atom-CdT-GvHX.js` | Initial route atom |
| `experimental-features-queries-BgnWG1Cj.js` | Experimental feature flag queries |
| `external-agent-config-utils-C2Auaars.js` | External agent config utilities |
| `format-skill-scope-Bt8chiXt.js` | Skill scope formatting |
| `get-project-name-OjdV1Jlg.js` | Project name extraction |
| `skus-CJcxA8DT.js` | SKU/pricing information |

### UI Component Modules

| Module | Purpose |
|--------|---------|
| `dialog-CQtg3dJc.js` | Radix Dialog wrapper |
| `dialog-layout-CI3EzXNC.js` | Dialog layout patterns |
| `tooltip-DJ38bi13.js` | Radix Tooltip wrapper |
| `dropdown-DNwdroSj.js` | Radix DropdownMenu wrapper |
| `checkbox-CL4qGDPq.js` | Radix Checkbox wrapper |
| `toggle-C6Z0GVSX.js` | Toggle component |
| `segmented-toggle-CIN9nTsq.js` | Segmented toggle (radio group) |
| `toaster-DVS7CElZ.js` | Toast notification system |
| `inline-chip-D8rFbOIc.js` | Inline mention/tag chips |
| `code-snippet-Dy3o1M6z.js` | Code display component |
| `connector-logo-BUTxUEQs.js` | OAuth connector logos |

### Icon Modules

Small SVG-as-React-component modules:
- `chevron-right`, `x`, `plus`, `trash`, `folder`, `arrow-top-right`
- `check-circle-filled`, `check-md`, `regenerate`
- `code-searching-icon`, `web-search-icon`, `internal-knowledge-icon`

### Animation Modules (Lottie JSON)

- `analyze_image_animation`, `browsing_animation`, `edit_files_animation`
- `list_files_animation`, `local_context_animation`, `run_command_animation`
- `searching_animation`, `to_do_animation`

### Shiki Syntax Themes (lazy-loaded)

40+ themes including: `github-dark`, `github-light`, `dracula`, `nord`, `tokyo-night`, `catppuccin-*`, `gruvbox-*`, `material-theme-*`, `solarized-*`, etc.

### Shiki Language Grammars (lazy-loaded)

400+ language grammar files for syntax highlighting.

### Mermaid Diagram Types (lazy-loaded)

- `flowDiagram`, `sequenceDiagram`, `classDiagram`, `stateDiagram`
- `erDiagram`, `ganttDiagram`, `pieDiagram`, `gitGraph`
- `mindmap-definition`, `timeline-definition`, `kanban-definition`
- `c4Diagram`, `blockDiagram`, `sankeyDiagram`, `xychartDiagram`
- `quadrantDiagram`, `requirementDiagram`, `architectureDiagram`

### Locale Files (58 languages)

Lazy-loaded i18n bundles: bg-BG, bn-BD, ca-ES, cs-CZ, da-DK, de-DE, el-GR, es-ES, es-419, et-EE, fi-FI, fr-FR, fr-CA, gu-IN, hi-IN, hr-HR, hu-HU, hy-AM, id-ID, is-IS, it-IT, ja-JP, ka-GE, kn-IN, ko-KR, lv-LV, mk-MK, ml, mn, mr-IN, ms-MY, my-MM, nb-NO, nl-NL, pa, pl, pt-BR, pt-PT, ro-RO, ru-RU, sk-SK, sl-SI, so-SO, sq-AL, sr-RS, sv-SE, sw-TZ, ta-IN, te-IN, th-TH, tl, tr-TR, uk-UA, ur, vi-VN, zh-CN, zh-HK, zh-TW

---

## 7. Key Dependencies (Main Process)

| Package | Version | Purpose |
|---------|---------|---------|
| electron | 40.0.0 | Desktop runtime |
| better-sqlite3 | ^12.4.6 | Local database |
| node-pty | ^1.1.0 | Terminal emulation |
| ws | ^8.18.3 | WebSocket (remote app-server) |
| zod | ^4.1.13 | Schema validation |
| immer | ^10.1.1 | Immutable state updates |
| socks-proxy-agent | ^8.0.5 | SOCKS proxy support |
| which | ^4.0.0 | Binary path resolution |
| shlex | ^3.0.0 | Shell argument parsing |
| smol-toml | ^1.5.2 | TOML config parsing |
| mime-types | ^2.1.35 | MIME type detection |
| lodash | ^4.17.21 | Utilities |
| memoizee | ^0.4.15 | Function memoization |

---

## 8. Notable Architectural Patterns

### React Compiler

The app uses the **React Compiler** (formerly React Forget). Every component uses `useMemoCache(n)` for automatic memoization. This is visible in every module as:
```js
let e = (0, c.c)(N); // useMemoCache(N) - allocate N-slot cache
```

This eliminates the need for manual `useMemo`, `useCallback`, and `React.memo`.

### Persisted Atom Store

A custom Jotai storage backend that:
1. Reads initial state from `window.localStorage` keys prefixed with `codex:persisted-atom:`
2. Syncs writes back to localStorage AND to the app-server
3. Supports subscribe/unsubscribe for cross-tab reactivity
4. Has a `resetAllPersistedAtoms()` for logout/clear

### Git Worker Architecture

Git operations run in a **separate Electron worker** (not on the main thread or renderer), communicating via dedicated IPC channels (`codex_desktop:worker:git:from-view` / `for-view`). This provides:
- Non-blocking git operations
- Dedicated query caching per repository
- Automatic cache invalidation based on change type (head, remote-refs, synced-branch)

### Fuzzy File Search Sessions

File search uses a **session-based protocol** for incremental search:
1. `fuzzyFileSearch/sessionStart` with workspace roots
2. `fuzzyFileSearch/sessionUpdate` with query string (multiple times)
3. `fuzzyFileSearch/sessionStop` when done
4. Falls back to one-shot `fuzzyFileSearch` if sessions unsupported

### Window Types

The app supports multiple window types:
- `electron` - Main desktop window
- `extension` - VS Code extension webview
- Hotkey window - Minimal popup for quick access

CSS classes like `electron:` and `extension:` are used as Tailwind variants for window-type-specific styling.

---

## 9. File Counts Summary

| Category | Count |
|----------|-------|
| Total asset files | 662 |
| JavaScript modules | 595 |
| CSS files | 5 |
| Shiki language grammars | ~400 |
| Shiki themes | ~40 |
| Mermaid diagram types | ~18 |
| Locale files | 58 |
| Feature modules | ~50 |
| Lottie animations | 8 |
| Icon components | ~15 |
