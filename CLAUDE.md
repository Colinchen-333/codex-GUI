# Codex-GUI Project Context

## Project Overview

Tauri + React 桌面应用，为 Codex CLI 提供图形界面。

**Tech Stack:**
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Tauri (Rust)
- Build: Vite
- Font: Source Sans 3

**Design System:**
- Dark-mode first (class="dark" on html)
- Semantic CSS variables: `bg-background`, `bg-surface`, `bg-surface-solid`, `text-text-1/2/3`, `border-stroke`, `border-border`
- Primary blue: #3b82f6
- Background: #0f0f10 (dark), Sidebar: #161617, Cards: #1c1c1e

---

## Working Rules

### 1. Plan Before Code
在编写任何代码之前，先描述方案并等待批准。需求不明确时，务必先提出澄清问题。

### 2. Small Batches
如果任务需要修改超过 3 个文件，先停下来，将其分解成更小的任务逐步执行。

### 3. Anticipate Issues
编写代码后，列出可能出现的问题，并建议相应的测试用例。

### 4. Test-Driven Bugfix
修复 bug 时，先编写能重现该 bug 的测试，然后修复直到测试通过。

### 5. Learn From Corrections
每次被纠正后，在此文件添加新规则，避免重复错误。

---

## Learned Rules (从纠正中学习)

### UI/UX
- **不要硬编码假数据**: 只实现有真实数据/功能支撑的 UI 元素，不要从参考设计中复制示例数据
- **Diff 颜色是语义化的**: 绿色=新增、红色=删除、蓝色=hunk头，这是通用约定，不要改成主题变量
- **语言一致性**: UI 字符串统一使用英文

### Code Style
- 使用语义化 CSS 变量（`bg-surface-solid`）而非硬编码颜色（`bg-gray-800`）
- 圆角使用标准 Tailwind 类（`rounded-2xl`）而非任意值（`rounded-[22px]`）

---

## Completed Work

### 2025-02-04: UI Optimization Phase 1

**Reference Design Analysis:**
- 分析了 `/tmp/stitch-reference/stitch/` 中的 5 个参考界面

**Color System Updates (`src/index.css`):**
- Dark theme: `--bg: 240 3% 6%`, `--surface: 240 2% 9%`, `--surface-solid: 240 3% 11%`
- Fixed light theme variables (`--hover`, `--selected`, `--stroke`)

**Component Updates:**
- `ChatEmptyState.tsx`: "Let's build" 欢迎页 + 项目选择器 + 建议卡片
- `Sidebar.tsx`: 导航项 (New thread, Automations, Skills) + "Threads" 区块
- `SessionTabs.tsx`: 会话标题头部
- `ChatInputArea.tsx`: Git 分支指示器
- `StatusBar.tsx`: 更紧凑 (h-8)

### 2025-02-05: UI Optimization Phase 2

**Theming:**
- `BaseDialog.tsx`: 硬编码颜色 → 语义化变量

**Border Radius Standardization:**
- `Skeleton.tsx`, `SettingsDialog.tsx`: `rounded-[22px]` → `rounded-2xl`
- `OnboardingFlow.tsx`: `rounded-[2.5rem]` → `rounded-3xl`

**Language Audit (Chinese → English):**
- `StatusIndicator.tsx`: getStatusLabel() 返回英文
- `DiffView.tsx`: "大变更" → "Large"
- `TaskQueue.tsx`: 全部 UI 字符串英文化
- `ChatView.tsx`: "继续" → "Continue"
- `BaseDialog.tsx`: aria-label "关闭" → "Close"

### 2025-02-05: Deep Optimization (Official Codex App Reverse Engineering)

**Design Token Expansion (`src/index.css`):**
- Typography: `--text-3xl: 48px`, `--text-4xl: 72px`
- Z-index scale: `--z-dropdown`, `--z-modal`, `--z-toast`, `--z-overlay`
- Animation timing: `--duration-fast/normal/slow`, `--ease-out`, `--ease-spring`

**Official Animation System:**
- Toast: `toast-enter`, `toast-exit` animations
- Dialog: `dialog-overlay-enter`, `dialog-content-enter/exit`
- Loading: `loading-bar-slide` animation
- Lists: `.stagger-children` for cascading animations

**Atomic Component Library (`src/components/ui/`):**
- `Button.tsx`: 5 variants (primary/secondary/ghost/outline/destructive), 4 sizes, loading state
- `Input.tsx`: 3 sizes, error state, icon support
- `Switch.tsx`: 2 sizes, full a11y (aria-checked)
- `IconButton.tsx`: 3 variants (ghost/outline/solid), 3 sizes, active state
- `Textarea.tsx`: Error state, auto-resize ready
- `Checkbox.tsx`: 2 sizes, label + description support, full a11y
- `Select.tsx`: 3 sizes, options array, error state
- `LoadingBar.tsx`: Sliding animation, overlay variant
- `WorktreeRestoreBanner.tsx`: 4 states (idle/restoring/success/error)
- `CommandPalette.tsx`: cmdk-based command palette (Ctrl+K)

**Component Refactoring:**
- `CommitDialog.tsx`: Hardcoded colors → semantic tokens + uses Button/Switch/IconButton
- `SkillsPage.tsx`: `text-gray-200` → `text-text-2`
- `RightPanel.tsx`: Uses Input/Button/IconButton components
- `Sidebar.tsx`: Uses Button/IconButton components
- `SettingsDialog.tsx`: Uses Button component
- `ConfirmDialog.tsx`: Uses Button component
- `RenameDialog.tsx`: Uses Button/Input components

**New Dependencies:**
- `cmdk`: Command palette library

### 2025-02-05: Comprehensive Audit & Fix Session

**Visual QA:**
- Screenshots taken for all 13 routes
- App redirects to onboarding flow when no backend data (expected behavior)

**Accessibility Fixes (6 issues fixed):**
- `BaseDialog.tsx`: `aria-label="关闭"` → `aria-label="Close"`
- `CommitDialog.tsx`: Added `aria-label="Close"` to IconButton
- `CommitDialog.tsx`: Added `aria-label="Include unstaged changes"` to Switch
- `CommitDialog.tsx`: Linked label to textarea via `htmlFor`/`id`
- `Sidebar.tsx`: Changed interactive divs to proper `<button>` elements
- `ThreadOverlayPage.tsx`: Added `aria-label="Message input"` to input

**Semantic Token System Expansion (`src/index.css` + `tailwind.config.js`):**
- Added `--overlay` and `--overlay-heavy` for backdrop colors
- Added `--switch-knob`, `--switch-track-off`, `--switch-track-on` for Switch component
- Added `--status-success`, `--status-warning`, `--status-error`, `--status-info` with `-foreground` and `-muted` variants
- Tailwind config extended with all new semantic colors

**Hardcoded Color Removal (15 files updated):**
- `bg-black/50` → `bg-overlay` (12 occurrences across dialogs)
- `bg-black/60` → `bg-overlay-heavy` (CommitDialog)
- `bg-black/70` → `bg-overlay-heavy` (ConnectionStatus)
- `bg-white` → `bg-switch-knob` (Switch component)
- `bg-yellow-500/*` → `bg-status-warning-muted` (CloseSessionDialog)

**API Analysis (Read-only):**
- Confirmed pure Tauri IPC architecture
- Key files: `api.ts`, `events.ts`, `apiCache.ts`
- 30+ Tauri commands, 20+ event listeners
- Mock data only used in tests, production uses real backend

**Test Coverage Added:**
- UI Component Unit Tests: 64 tests (Button, Input, Switch)
  - `src/components/ui/__tests__/Button.test.tsx`
  - `src/components/ui/__tests__/Input.test.tsx`
  - `src/components/ui/__tests__/Switch.test.tsx`
- Page Integration Tests: 19 tests
  - `e2e/pages.spec.ts` (Navigation, Accessibility, Dark Mode)

### 2026-03-06: Official Codex Desktop v26.305 Reverse Engineering & Alignment

**Reverse Engineering (from `/Applications/Codex.app`):**
- Extracted and analyzed `app.asar` (Electron 40, React, Tailwind CSS v4)
- 403 unique CSS variables catalogued
- Complete dark/light theme token maps (`.electron-dark`, `.electron-light`)
- IPC architecture: single-channel `codex_desktop:message-from-view` / `message-for-view`
- 26 editor integration icons extracted
- All CSS saved to `reverse/` for reference

**Design Token System Alignment (`src/index.css`):**
- Typography: `--text-xl` 20→28px, `--text-2xl` 24→36px, added `--line-height` companions
- Added `--font-weight-light: 300`, `--tracking-*`, `--leading-*`
- Added `--shadow-xl`, `--blur-sm/md/lg/xl`, `--container-*` sizes
- Added `--spacing-token-button-composer*`, `--spacing-token-safe-header-*`
- Terminal ANSI colors updated to match official (16 colors)
- `--thread-composer-max-width` / `--thread-content-max-width` → `none` (official default)

**Animation System (Official Patterns):**
- Hyperspeed shimmer: gradient text + `background-clip: text` + `color-mix`
- Main surface transitions: background-color + border-radius + box-shadow
- Window celebration effect: `.window-fx-celebration`
- Curtain animation: `backdrop-filter: blur(12px)` + scale(1.01) raise/lower
- Markdown fade-in: element-level `opacity: 0 → 1` with cubic-bezier
- Dialog: `translateY(8px) scale(0.98)` → `translateY(0) scale(1)` with `--cubic-enter`
- Toast: top-center positioning, enters from top with elastic curve
- Loading bar: official `::after` pseudo-element with `translate(350%)` slide
- Code syntax theme: dark + light highlight.js color schemes from official

**Tailwind Config Expansion (`tailwind.config.js`):**
- `borderRadius`: 2xs through 4xl (9 levels)
- `fontSize`: xs through 4xl + heading-lg/md with line-height
- `fontWeight`: light/normal/medium/semibold/bold
- `fontFamily`: sans/mono
- `letterSpacing`: tight/normal/wide
- `lineHeight`: tight/normal/relaxed
- `spacing`: toolbar/toolbar-sm/panel/row-x/row-y/sidebar
- `maxWidth`: thread-composer/content + container-3xs through 3xl
- `zIndex`: dropdown/sticky/modal/popover/tooltip/toast/overlay
- `boxShadow`: xl/2xl
- `blur`: sm/md/lg/xl
- `transitionDuration`: fast/normal/slow/slower/relaxed
- `transitionTimingFunction`: ease-out/ease-in-out/ease-spring/cubic-enter
- `keyframes` + `animation`: 8 predefined animations

**Component Alignment:**
- `BaseDialog.tsx`: `z-50` → `z-modal`, `dialog-content-enter` animation
- `Toast.tsx`: positioned top-center (official), `z-toast`
- `LoadingBar.tsx`: rewritten to official `::after` pseudo-element pattern
- `Markdown.tsx`: Prism → Shiki (400+ lazy-loaded language grammars)
- CMDK: `border-radius: radius-3xl`, `backdrop-filter: blur(8px)`, `opacity: 0.75` items

**New Dependencies:**
- `shiki`: Syntax highlighting (replaces `react-syntax-highlighter`)

**New Files:**
- `src/lib/shikiHighlighter.ts`: Shiki highlighter singleton with lazy language loading
- `reverse/official-theme-v26.305.css`: 11,609 lines formatted official CSS
- `reverse/official-*.css`: Dialog, toast, markdown, automation dialog styles
- `reverse/official-package.json`: Official dependency list
- `reverse/official-preload.js`: Electron preload bridge
- `reverse/editor-icons/`: 26 editor integration icons (PNG/SVG)

---

## Key Files

| Path | Purpose |
|------|---------|
| `src/index.css` | Theme variables, global styles |
| `src/components/ui/` | Reusable UI components |
| `src/components/chat/` | Chat interface components |
| `src/components/layout/` | Layout components (Sidebar, StatusBar) |
| `src/stores/` | Zustand stores |
| `src/lib/api.ts` | API client |
| `src/lib/shikiHighlighter.ts` | Shiki syntax highlighting |
| `src/lib/editorIntegration.ts` | Open-in-editor (16 editors) |
| `src/lib/notifications.ts` | Native macOS notifications |
| `src/lib/globalShortcuts.ts` | System-wide keyboard shortcuts |
| `src/hooks/useVoiceDictation.ts` | Voice dictation (Whisper API) |
| `src/components/chat/FindInThread.tsx` | Cmd+F find-in-thread |
| `reverse/` | Official Codex Desktop reverse engineering reference |

### 2026-03-06: Feature Alignment Sprint

**macOS Native Integration (Tauri Plugins):**
- `tauri-plugin-notification`: Native macOS notifications (turn complete, approval needed)
- `tauri-plugin-global-shortcut`: System-wide hotkeys (Cmd+Shift+;)
- `tauri-plugin-deep-link`: `codex://` URL scheme for OAuth callbacks
- `tauri-plugin-store`: Persistent key-value storage
- System tray: Menu with Show/New Thread/Quit actions
- Sidebar vibrancy scoping: Only sidebar transparent, main content opaque
- Microphone permission: `NSMicrophoneUsageDescription` in Info.plist
- Minimum macOS version: 10.13 → 12.0

**LoginPage Fix:**
- Replaced `setTimeout` stub with real `serverApi.startLogin()` calls
- ChatGPT OAuth + API key flows with error handling
- Account info refresh after login

**Automation Backend (Rust + SQLite + Frontend API):**
- New `automations` table: id, name, prompt, project_id, schedule, enabled, run_count
- New `automation_runs` table: id, automation_id, status, started_at, result
- 6 Tauri commands: list/create/update/delete/run_now/list_runs
- Frontend `automationApi` in api.ts

**New Frontend Features:**
- `FindInThread.tsx`: CSS Custom Highlight API for search (Cmd+F)
- `useVoiceDictation.ts`: MediaRecorder + Whisper API transcription
- `editorIntegration.ts`: 16 editor integrations (VS Code, Cursor, Zed, IntelliJ, etc.)
- `notifications.ts`: 3 notification modes (never/background/always)
- `globalShortcuts.ts`: System-wide hotkey registration
- Slash commands: Added `/fast`, `/plan-mode` with action targets

**New Dependencies:**
- Rust: `tauri-plugin-notification`, `tauri-plugin-global-shortcut`, `tauri-plugin-deep-link`, `tauri-plugin-store`
- npm: `@tauri-apps/plugin-notification`, `@tauri-apps/plugin-global-shortcut`, `@tauri-apps/plugin-deep-link`, `@tauri-apps/plugin-store`

### 2026-03-06: App-Server Protocol Alignment (Codex CLI Integration)

**Reverse Engineering Findings:**
- Official uses dual-transport: stdio (local) + WebSocket (remote/SSH)
- Single JSON-RPC channel with `codex_desktop:message-from-view/for-view`
- Separate Git worker channel (`codex_desktop:worker:git:from-view/for-view`)
- 50+ event types from app-server (codex/event/*)
- Initialize handshake includes `capabilities.experimentalApi`

**Initialize Handshake Enhancement (`process.rs`):**
- Added `capabilities` to `InitializeParams`: `experimentalApi: true`, `optOutNotificationMethods`
- Upgraded error handling: `-32001` overload detection with structured `Codex` error type

**New Thread Lifecycle Commands (11 new Tauri commands):**
- `fork_thread` → `thread/fork` (branch conversation)
- `archive_thread` → `thread/archive`
- `unarchive_thread` → `thread/unarchive`
- `compact_thread` → `thread/compact/start` (context compaction)
- `read_thread` → `thread/read` (read without resume)
- `set_thread_name` → `thread/name/set`
- `rollback_thread` → `thread/rollback` (undo last N turns)
- `steer_turn` → `turn/steer` (append input to running turn)
- `cancel_login` → `account/login/cancel`
- `list_threads_filtered` → `thread/list` with extended filters (modelProviders, sourceKinds, archived, cwd, searchTerm, sortKey)

**IPC Bridge Types (`ipc_bridge.rs`):**
- `ThreadForkParams/Response`, `ThreadArchiveParams`, `ThreadCompactParams`
- `ThreadReadParams/Response`, `ThreadNameSetParams`, `ThreadRollbackParams`
- `TurnSteerParams`, `ThreadListExtendedParams`
- `UserInputExtended` with `Image { url }` and `Mention { name, path }` types

**Frontend API (`api.ts`):**
- `threadApi.fork()`, `.archive()`, `.unarchive()`, `.compact()`
- `threadApi.read()`, `.setName()`, `.rollback()`, `.steer()`
- `threadApi.cancelLogin()`, `.listFiltered()`

**Frontend Events (`events.ts`):**
- 10 new event handlers: `account-updated`, `account-login-completed`, `account-rateLimits-updated`, `thread-status-changed`, `thread-name-updated`, `thread-archived`, `thread-unarchived`, `skills-changed`, `model-rerouted`, `app-server-reconnected`

**Protocol Coverage:**
- Before: 6 JSON-RPC methods, 21 event types
- After: 17 JSON-RPC methods, 31 event types
- Remaining gap: Git worker channel (separate process), realtime audio API

### 2026-03-06: UI Component Alignment Sprint

**Research Findings (Official v26.305):**
- SegmentedToggle: `role="group"` with radio buttons, secondary/ghost colors
- Hotkey Window: Collapsible composer with neck-shaped CMDK panel
- Celebration: `.window-fx-celebration` removes all surfaces to transparent
- Thread diff: `content-visibility: auto; contain-intrinsic-size: auto 40vh`
- Container queries: composer-footer (440px/300px), inbox-toolbar (260px)

**New Components:**
- `SegmentedToggle.tsx`: Official pattern with options, selectedId, size, uniform, ariaLabel
- `SkillMentionPopup.tsx`: `$`-triggered skill picker (matching FileMentionPopup)
- `NotificationSettings.tsx`: Notification mode (never/background/always) with SegmentedToggle
- `ArchivedThreadsSettings.tsx`: List archived threads with unarchive action

**Settings Store v4 (`stores/settings.ts`):**
- Added `fastMode: boolean` (default: true — official default as of v0.111.0)
- Added `planMode: boolean` (default: false)
- Added `personality: 'friendly' | 'pragmatic' | 'none'` (default: 'friendly')
- Added `defaultThreadMode: 'local' | 'worktree' | 'cloud'` (default: 'local')
- Migration v3 → v4 with type guards
