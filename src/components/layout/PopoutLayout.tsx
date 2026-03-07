import { Outlet } from 'react-router-dom'

/**
 * Minimal layout for the pop-out thread window.
 * No sidebar, no status bar, no command palette — just the page content.
 * The window uses system decorations so it has a native title bar.
 */
export function PopoutLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <Outlet />
    </div>
  )
}
