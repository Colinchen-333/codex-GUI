import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'
import { RightPanel, RightPanelToggle } from './RightPanel'
import { CommitDialog } from '../dialogs/CommitDialog'
import { CommandPalette, useCommandPalette } from '../ui/CommandPalette'
import { AsyncErrorBoundary } from '../ui/AsyncErrorBoundary'
import { logError } from '../../lib/errorUtils'
import { HostNavigationListener } from '../navigation/HostNavigationListener'
import { KeyboardShortcuts } from '../KeyboardShortcuts'
import { useToast } from '../ui/Toast'

export function AppShell() {
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [commitDialogOpen, setCommitDialogOpen] = useState(false)
  const { showToast } = useToast()
  const commandPalette = useCommandPalette()

  const handleToggleRightPanel = useCallback(() => {
    setRightPanelOpen((prev) => !prev)
  }, [])

  const handleOpenCommitDialog = useCallback(() => {
    setCommitDialogOpen(true)
  }, [])

  const handleCommit = useCallback((message: string, nextStep: 'commit' | 'commit-push' | 'commit-pr') => {
    showToast(`Would ${nextStep}: "${message || 'auto-generated message'}"`, 'info')
  }, [showToast])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <HostNavigationListener />
      <KeyboardShortcuts />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-card relative">
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
              <Outlet context={{ onToggleRightPanel: handleToggleRightPanel, rightPanelOpen, onOpenCommitDialog: handleOpenCommitDialog }} />
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
        onCommit={handleCommit}
      />
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        onOpenSettings={() => showToast('Settings shortcut', 'info')}
        onOpenKeyboardShortcuts={() => showToast('Keyboard shortcuts', 'info')}
        onOpenHelp={() => showToast('Help', 'info')}
      />
    </div>
  )
}

export { RightPanelToggle }
