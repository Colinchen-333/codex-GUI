import { Outlet } from 'react-router-dom'
import { HostNavigationListener } from '../navigation/HostNavigationListener'
import { KeyboardShortcuts } from '../KeyboardShortcuts'

export function StandaloneLayout() {
  return (
    <div className="min-h-screen w-screen bg-background">
      <HostNavigationListener />
      <KeyboardShortcuts />
      <Outlet />
    </div>
  )
}
