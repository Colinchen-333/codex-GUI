import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Settings {
  model: string
  sandboxMode: 'off' | 'permissive' | 'strict'
  askForApproval: 'always' | 'auto' | 'never'
}

const defaultSettings: Settings = {
  model: 'gpt-4o',
  sandboxMode: 'permissive',
  askForApproval: 'always',
}

interface SettingsState {
  settings: Settings

  // Actions
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  resetSettings: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      updateSetting: (key, value) => {
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        }))
      },

      resetSettings: () => {
        set({ settings: defaultSettings })
      },
    }),
    {
      name: 'codex-desktop-settings',
    }
  )
)

// Helper to get settings for thread start
export function getThreadSettings(settings: Settings) {
  return {
    model: settings.model,
    sandboxMode: settings.sandboxMode,
    askForApproval: settings.askForApproval,
  }
}
