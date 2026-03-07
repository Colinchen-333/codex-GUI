import { Outlet } from 'react-router-dom'

/**
 * Minimal layout for the frameless, transparent hotkey mini-window.
 * No sidebar, no status bar, no navigation listener — just the raw page.
 * The window itself is transparent so the page controls its own visual shape.
 */
export function HotkeyLayout() {
  return (
    <div className="min-h-screen w-screen bg-transparent overflow-hidden">
      <Outlet />
    </div>
  )
}
