import { useState, useCallback, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { PageTransition } from './PageTransition'
import { RightPanel, RightPanelToggle } from './RightPanel'
import { CommitDialog } from '../dialogs/CommitDialog'
import { CommandPalette, useCommandPalette } from '../ui/CommandPalette'
import { AsyncErrorBoundary } from '../ui/AsyncErrorBoundary'
import { logError } from '../../lib/errorUtils'
import { HostNavigationListener } from '../navigation/HostNavigationListener'
import { KeyboardShortcuts } from '../KeyboardShortcuts'
import { useAppStore } from '../../stores/app'
import { APP_EVENTS } from '../../lib/appEvents'

export function AppShell() {
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [commitDialogOpen, setCommitDialogOpen] = useState(false)
  const navigate = useNavigate()
  const commandPalette = useCommandPalette()

  const handleToggleRightPanel = useCallback(() => {
    setRightPanelOpen((prev) => !prev)
  }, [])

  const handleOpenCommitDialog = useCallback(() => {
    setCommitDialogOpen(true)
  }, [])

  // Listen for review panel toggle events (from KeyboardShortcuts Cmd+/)
  useEffect(() => {
    const handleToggle = () => setRightPanelOpen((prev) => !prev)
    window.addEventListener(APP_EVENTS.TOGGLE_REVIEW_PANEL, handleToggle)
    return () => window.removeEventListener(APP_EVENTS.TOGGLE_REVIEW_PANEL, handleToggle)
  }, [])

  // Cross-component request to open the commit dialog (for example: from command palette)
  useEffect(() => {
    const handleOpen = () => setCommitDialogOpen(true)
    window.addEventListener(APP_EVENTS.OPEN_COMMIT_DIALOG, handleOpen)
    return () => window.removeEventListener(APP_EVENTS.OPEN_COMMIT_DIALOG, handleOpen)
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <HostNavigationListener />
      <KeyboardShortcuts />
      <Sidebar />
      <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
        <AsyncErrorBoundary
          onError={(error) => {
            logError(error, {
              context: 'AppShell',
              source: 'AsyncErrorBoundary',
              details: 'Async error in main shell',
            })
          }}
        >
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden">
              <PageTransition className="flex flex-1 flex-col overflow-hidden">
                <Outlet context={{ onToggleRightPanel: handleToggleRightPanel, rightPanelOpen, onOpenCommitDialog: handleOpenCommitDialog }} />
              </PageTransition>
            </div>
            <RightPanel
              isOpen={rightPanelOpen}
              onClose={handleToggleRightPanel}
              onCommit={handleOpenCommitDialog}
            />
          </div>
        </AsyncErrorBoundary>
        <StatusBar />
      </div>
      <CommitDialog
        isOpen={commitDialogOpen}
        onClose={() => setCommitDialogOpen(false)}
      />
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        onOpenSettings={() => navigate('/settings')}
        onOpenKeyboardShortcuts={() => useAppStore.getState().setKeyboardShortcutsOpen(true)}
        onOpenHelp={() => useAppStore.getState().setHelpOpen(true)}
      />
    </div>
  )
}

export { RightPanelToggle }
