import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut'
import { invoke } from '@tauri-apps/api/core'

let registered = false

/**
 * Register system-wide keyboard shortcuts.
 *
 * Cmd+Shift+; opens the hotkey quick-prompt mini-window via a Tauri command.
 * The optional `onActivate` callback is kept for callers that want additional
 * side-effects (e.g. toggling in-app state), but the window itself is managed
 * entirely on the Rust side so it works even when the main window is hidden.
 */
export async function registerGlobalShortcuts(
  onActivate?: () => void
): Promise<void> {
  if (registered) return

  try {
    await register('CommandOrControl+Shift+;', (event) => {
      if (event.state === 'Pressed') {
        // Show (or create) the hotkey mini-window
        void invoke('show_hotkey_window').catch((err) => {
          console.warn('Failed to show hotkey window:', err)
        })
        // Optional caller-side hook (e.g. analytics, UI state)
        onActivate?.()
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
