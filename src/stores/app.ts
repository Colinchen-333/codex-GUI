import { create } from 'zustand'

type SidebarTab = 'projects' | 'sessions'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'codex:sidebar-collapsed'
const SIDEBAR_PANEL_WIDTH_KEY = 'codex:sidebar-panel-width'
const SIDEBAR_PANEL_WIDTH_DEFAULT = 244
const SIDEBAR_PANEL_WIDTH_MIN = 160
const SIDEBAR_PANEL_WIDTH_MAX = 480

function readSidebarPanelWidth(): number {
  if (typeof window === 'undefined') return SIDEBAR_PANEL_WIDTH_DEFAULT
  try {
    const raw = window.localStorage.getItem(SIDEBAR_PANEL_WIDTH_KEY)
    if (!raw) return SIDEBAR_PANEL_WIDTH_DEFAULT
    const n = parseInt(raw, 10)
    if (isNaN(n)) return SIDEBAR_PANEL_WIDTH_DEFAULT
    return Math.min(Math.max(n, SIDEBAR_PANEL_WIDTH_MIN), SIDEBAR_PANEL_WIDTH_MAX)
  } catch {
    return SIDEBAR_PANEL_WIDTH_DEFAULT
  }
}

function writeSidebarPanelWidth(width: number): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SIDEBAR_PANEL_WIDTH_KEY, String(width))
  } catch {
    // Best-effort persistence.
  }
}

function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)
    return raw === '1' || raw === 'true'
  } catch {
    // localStorage may be unavailable (e.g. in sandboxed iframes)
    return false
  }
}

function writeSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0')
  } catch {
    // Best-effort persistence.
  }
}

export interface AppState {
  // Dialog states
  settingsTab: 'general' | 'model' | 'safety' | 'account' | 'allowlist'
  setSettingsTab: (tab: 'general' | 'model' | 'safety' | 'account' | 'allowlist') => void
  snapshotsOpen: boolean
  setSnapshotsOpen: (open: boolean) => void
  aboutOpen: boolean
  setAboutOpen: (open: boolean) => void
  helpOpen: boolean
  setHelpOpen: (open: boolean) => void
  keyboardShortcutsOpen: boolean
  setKeyboardShortcutsOpen: (open: boolean) => void

  // Sidebar state
  sidebarTab: SidebarTab
  setSidebarTab: (tab: SidebarTab) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
  sidebarPanelWidth: number
  setSidebarPanelWidth: (width: number) => void

  // Input focus
  shouldFocusInput: boolean
  triggerFocusInput: () => void
  clearFocusInput: () => void

  // Escape pending state (for double-escape interrupt like CLI)
  escapePending: boolean
  setEscapePending: (pending: boolean) => void

  // Cross-component scroll requests (handled by ChatView)
  scrollToItemId: string | null
  setScrollToItemId: (itemId: string) => void
  clearScrollToItemId: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Dialog states
  settingsTab: 'general',
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  snapshotsOpen: false,
  setSnapshotsOpen: (open) => set({ snapshotsOpen: open }),
  aboutOpen: false,
  setAboutOpen: (open) => set({ aboutOpen: open }),
  helpOpen: false,
  setHelpOpen: (open) => set({ helpOpen: open }),
  keyboardShortcutsOpen: false,
  setKeyboardShortcutsOpen: (open) => set({ keyboardShortcutsOpen: open }),

  // Sidebar state
  sidebarTab: 'projects',
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  sidebarCollapsed: readSidebarCollapsed(),
  setSidebarCollapsed: (collapsed) => {
    writeSidebarCollapsed(collapsed)
    set({ sidebarCollapsed: collapsed })
  },
  toggleSidebarCollapsed: () =>
    set((prev) => {
      const next = !prev.sidebarCollapsed
      writeSidebarCollapsed(next)
      return { sidebarCollapsed: next }
    }),
  sidebarPanelWidth: readSidebarPanelWidth(),
  setSidebarPanelWidth: (width) => {
    const clamped = Math.min(Math.max(width, SIDEBAR_PANEL_WIDTH_MIN), SIDEBAR_PANEL_WIDTH_MAX)
    writeSidebarPanelWidth(clamped)
    set({ sidebarPanelWidth: clamped })
  },

  // Input focus
  shouldFocusInput: false,
  triggerFocusInput: () => set({ shouldFocusInput: true }),
  clearFocusInput: () => set({ shouldFocusInput: false }),

  // Escape pending state (for double-escape interrupt like CLI)
  escapePending: false,
  setEscapePending: (pending) => set({ escapePending: pending }),

  // Cross-component scroll requests (handled by ChatView)
  scrollToItemId: null,
  setScrollToItemId: (itemId) => set({ scrollToItemId: itemId }),
  clearScrollToItemId: () => set({ scrollToItemId: null }),
}))
