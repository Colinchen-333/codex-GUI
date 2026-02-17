import { create } from 'zustand'

// ==================== Types ====================

export type AutomationTrigger =
  | { type: 'schedule'; cron: string; label: string }
  | { type: 'file_change'; patterns: string[] }
  | { type: 'git_event'; events: ('push' | 'commit' | 'pr')[] }
  | { type: 'manual' }

export interface Automation {
  id: string
  name: string
  description: string
  skillId: string
  skillName: string
  trigger: AutomationTrigger
  enabled: boolean
  lastRunAt: number | null
  runCount: number
  createdAt: number
}

export type InboxItemStatus = 'success' | 'error' | 'warning'

export interface InboxItem {
  id: string
  automationId: string
  automationName: string
  status: InboxItemStatus
  summary: string
  details: string
  createdAt: number
  isRead: boolean
}

// ==================== Store ====================

interface AutomationsState {
  automations: Automation[]
  inboxItems: InboxItem[]

  // Automation actions
  createAutomation: (automation: Omit<Automation, 'id' | 'createdAt' | 'lastRunAt' | 'runCount'>) => void
  updateAutomation: (id: string, updates: Partial<Omit<Automation, 'id' | 'createdAt'>>) => void
  deleteAutomation: (id: string) => void
  toggleAutomation: (id: string) => void

  // Inbox actions
  addInboxItem: (item: Omit<InboxItem, 'id' | 'createdAt' | 'isRead'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearRead: () => void
  getUnreadCount: () => number
}

const STORAGE_KEY_AUTOMATIONS = 'codex-automations'
const STORAGE_KEY_INBOX = 'codex-inbox'

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    // localStorage or JSON parse may fail — use fallback
    return fallback
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // Silently fail if localStorage is full
  }
}

export const useAutomationsStore = create<AutomationsState>((set, get) => ({
  automations: loadFromStorage<Automation[]>(STORAGE_KEY_AUTOMATIONS, []),
  inboxItems: loadFromStorage<InboxItem[]>(STORAGE_KEY_INBOX, []),

  createAutomation: (automation) => {
    set((state) => {
      const next: Automation = {
        ...automation,
        id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        lastRunAt: null,
        runCount: 0,
      }
      const automations = [next, ...state.automations]
      saveToStorage(STORAGE_KEY_AUTOMATIONS, automations)
      return { automations }
    })
  },

  updateAutomation: (id, updates) => {
    set((state) => {
      const automations = state.automations.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      )
      saveToStorage(STORAGE_KEY_AUTOMATIONS, automations)
      return { automations }
    })
  },

  deleteAutomation: (id) => {
    set((state) => {
      const automations = state.automations.filter((a) => a.id !== id)
      saveToStorage(STORAGE_KEY_AUTOMATIONS, automations)
      return { automations }
    })
  },

  toggleAutomation: (id) => {
    set((state) => {
      const automations = state.automations.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled } : a
      )
      saveToStorage(STORAGE_KEY_AUTOMATIONS, automations)
      return { automations }
    })
  },

  addInboxItem: (item) => {
    set((state) => {
      const next: InboxItem = {
        ...item,
        id: `inbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        isRead: false,
      }
      const inboxItems = [next, ...state.inboxItems]
      saveToStorage(STORAGE_KEY_INBOX, inboxItems)
      return { inboxItems }
    })
  },

  markAsRead: (id) => {
    set((state) => {
      const inboxItems = state.inboxItems.map((item) =>
        item.id === id ? { ...item, isRead: true } : item
      )
      saveToStorage(STORAGE_KEY_INBOX, inboxItems)
      return { inboxItems }
    })
  },

  markAllAsRead: () => {
    set((state) => {
      const inboxItems = state.inboxItems.map((item) => ({ ...item, isRead: true }))
      saveToStorage(STORAGE_KEY_INBOX, inboxItems)
      return { inboxItems }
    })
  },

  clearRead: () => {
    set((state) => {
      const inboxItems = state.inboxItems.filter((item) => !item.isRead)
      saveToStorage(STORAGE_KEY_INBOX, inboxItems)
      return { inboxItems }
    })
  },

  getUnreadCount: () => {
    return get().inboxItems.filter((item) => !item.isRead).length
  },
}))
