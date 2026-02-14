/**
 * useNotifications - System notification hook
 *
 * Uses the Web Notification API to send desktop notifications
 * when the app is in the background. Respects user settings
 * stored in localStorage under 'codex-notifications'.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// Notification types
export type NotificationType = 'task_completed' | 'approval_needed' | 'error'

interface NotificationSettings {
  enabled: boolean
  task_completed: boolean
  approval_needed: boolean
  error: boolean
}

const STORAGE_KEY = 'codex-notifications'

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  task_completed: true,
  approval_needed: true,
  error: true,
}

function loadSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore storage errors
  }
}

export interface UseNotificationsReturn {
  /** Whether the Notification API is supported */
  isSupported: boolean
  /** Current permission state */
  permission: NotificationPermission | 'unsupported'
  /** Request notification permission from the user */
  requestPermission: () => Promise<NotificationPermission>
  /** Send a notification (respects settings) */
  sendNotification: (
    type: NotificationType,
    title: string,
    body?: string,
    options?: NotificationOptions
  ) => void
  /** Current notification settings */
  settings: NotificationSettings
  /** Update notification settings */
  updateSettings: (updates: Partial<NotificationSettings>) => void
}

export function useNotifications(): UseNotificationsReturn {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    isSupported ? Notification.permission : 'unsupported'
  )
  const [settings, setSettings] = useState<NotificationSettings>(loadSettings)
  const settingsRef = useRef(settings)

  // Sync ref with state
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  // Sync permission state
  useEffect(() => {
    if (!isSupported) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing browser API state
    setPermission(Notification.permission)
  }, [isSupported])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [isSupported])

  const sendNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      body?: string,
      options?: NotificationOptions
    ) => {
      if (!isSupported) return
      if (Notification.permission !== 'granted') return

      const currentSettings = settingsRef.current
      if (!currentSettings.enabled) return
      if (!currentSettings[type]) return

      // Only notify when app is not focused
      if (document.hasFocus()) return

      try {
        new Notification(title, {
          body,
          icon: '/icons/icon.png',
          tag: type, // collapse duplicate notifications of same type
          ...options,
        })
      } catch {
        // Notification constructor may throw in some environments
      }
    },
    [isSupported]
  )

  const updateSettings = useCallback((updates: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates }
      saveSettings(next)
      return next
    })
  }, [])

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    settings,
    updateSettings,
  }
}
