import { useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { SegmentedToggle } from '../../components/ui/SegmentedToggle'
import {
  getNotificationMode,
  setNotificationMode,
  type NotificationMode,
} from '../../lib/notifications'

const NOTIFICATION_OPTIONS = [
  { id: 'never' as const, label: 'Never', icon: <BellOff size={14} /> },
  { id: 'background' as const, label: 'Background', icon: <Bell size={14} /> },
  { id: 'always' as const, label: 'Always', icon: <BellRing size={14} /> },
]

export function NotificationSettings() {
  const [mode, setMode] = useState<NotificationMode>(getNotificationMode())

  const handleModeChange = (newMode: string) => {
    const m = newMode as NotificationMode
    setMode(m)
    setNotificationMode(m)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-lg font-semibold text-text-1">Notifications</h2>
        <p className="text-sm text-text-3 mt-1">
          Choose when Codex sends you notifications.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-1">Notification mode</p>
            <p className="text-xs text-text-3 mt-0.5">
              {mode === 'never' && 'Notifications are disabled.'}
              {mode === 'background' && 'Notify only when the app is in the background.'}
              {mode === 'always' && 'Always notify, even when the app is in focus.'}
            </p>
          </div>
          <SegmentedToggle
            options={NOTIFICATION_OPTIONS}
            selectedId={mode}
            onSelect={handleModeChange}
            size="sm"
            ariaLabel="Notification mode"
          />
        </div>

        <div className="border-t border-stroke/20 pt-4">
          <p className="text-xs text-text-3">
            Codex will notify you when a task completes, when approval is needed,
            or when an error occurs. On macOS, you may need to grant notification
            permissions in System Settings &gt; Notifications.
          </p>
        </div>
      </div>
    </div>
  )
}
