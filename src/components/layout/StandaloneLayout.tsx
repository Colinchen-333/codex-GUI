import { Outlet } from 'react-router-dom'
import { HostNavigationListener } from '../navigation/HostNavigationListener'
import { KeyboardShortcuts } from '../KeyboardShortcuts'
import { PageTransition } from './PageTransition'

export function StandaloneLayout() {
  return (
    <div className="min-h-screen w-screen bg-background">
      <HostNavigationListener />
      <KeyboardShortcuts />
      <PageTransition>
        <Outlet />
      </PageTransition>
    </div>
  )
}
