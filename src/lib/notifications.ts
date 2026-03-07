import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'

export type NotificationMode = 'never' | 'background' | 'always'

let notificationMode: NotificationMode = 'background'

export function setNotificationMode(mode: NotificationMode): void {
  notificationMode = mode
}

export function getNotificationMode(): NotificationMode {
  return notificationMode
}

export async function ensureNotificationPermission(): Promise<boolean> {
  let granted = await isPermissionGranted()
  if (!granted) {
    const permission = await requestPermission()
    granted = permission === 'granted'
  }
  return granted
}

export async function notifyTurnCompleted(threadTitle: string): Promise<void> {
  if (notificationMode === 'never') return
  if (notificationMode === 'background' && document.hasFocus()) return

  const granted = await ensureNotificationPermission()
  if (!granted) return

  sendNotification({
    title: 'Task Completed',
    body: `Codex finished working on: ${threadTitle}`,
  })
}

export async function notifyApprovalNeeded(threadTitle: string, action: string): Promise<void> {
  if (notificationMode === 'never') return
  if (notificationMode === 'background' && document.hasFocus()) return

  const granted = await ensureNotificationPermission()
  if (!granted) return

  sendNotification({
    title: 'Approval Needed',
    body: `${action} in: ${threadTitle}`,
  })
}

export async function notifyError(message: string): Promise<void> {
  if (notificationMode === 'never') return

  const granted = await ensureNotificationPermission()
  if (!granted) return

  sendNotification({
    title: 'Codex Error',
    body: message,
  })
}
