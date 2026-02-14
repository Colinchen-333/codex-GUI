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
