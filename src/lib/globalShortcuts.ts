import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut'

let registered = false

export async function registerGlobalShortcuts(
  onActivate: () => void
): Promise<void> {
  if (registered) return

  try {
    await register('CommandOrControl+Shift+;', (event) => {
      if (event.state === 'Pressed') {
        onActivate()
      }
    })
    registered = true
  } catch (err) {
    console.warn('Failed to register global shortcut:', err)
  }
}

export async function unregisterGlobalShortcuts(): Promise<void> {
  if (!registered) return

  try {
    await unregisterAll()
    registered = false
  } catch (err) {
    console.warn('Failed to unregister global shortcuts:', err)
  }
}
