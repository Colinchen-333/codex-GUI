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
import { NewThreadDialog } from '../LazyComponents'
import { useProjectsStore } from '../../stores/projects'
import { useSettingsStore, mergeProjectSettings, getEffectiveWorkingDirectory } from '../../stores/settings'
import { useThreadStore } from '../../stores/thread'
import { useSessionsStore } from '../../stores/sessions'
import { useToast } from '../ui/useToast'
import { PanelLeftOpen } from 'lucide-react'
import { isTauriAvailable } from '../../lib/tauri'

export function AppShell() {
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [commitDialogOpen, setCommitDialogOpen] = useState(false)
  const [commitDialogIntent, setCommitDialogIntent] = useState<'commit' | 'pr'>('commit')
  const [newSessionDialogOpen, setNewSessionDialogOpen] = useState(false)
  const navigate = useNavigate()
  const commandPalette = useCommandPalette()
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  const toggleSidebarCollapsed = useAppStore((state) => state.toggleSidebarCollapsed)
  const { toast } = useToast()
  const selectedProject = useProjectsStore((state) =>
    state.selectedProjectId ? state.projects.find((p) => p.id === state.selectedProjectId) ?? null : null
  )

  const handleToggleRightPanel = useCallback(() => {
    setRightPanelOpen((prev) => !prev)
  }, [])

  const handleOpenCommitDialog = useCallback(() => {
    setCommitDialogIntent('commit')
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
    const handleOpen = () => {
      if (!isTauriAvailable()) {
        toast.error('Unavailable in web mode')
        return
      }
      setCommitDialogIntent('commit')
      setCommitDialogOpen(true)
    }
    window.addEventListener(APP_EVENTS.OPEN_COMMIT_DIALOG, handleOpen)
    return () => window.removeEventListener(APP_EVENTS.OPEN_COMMIT_DIALOG, handleOpen)
  }, [toast])

  useEffect(() => {
    const handleOpen = () => {
      if (!isTauriAvailable()) {
        toast.error('Unavailable in web mode')
        return
      }
      setCommitDialogIntent('pr')
      setCommitDialogOpen(true)
    }
    window.addEventListener(APP_EVENTS.OPEN_CREATE_PR_DIALOG, handleOpen)
    return () => window.removeEventListener(APP_EVENTS.OPEN_CREATE_PR_DIALOG, handleOpen)
  }, [toast])

  useEffect(() => {
    const handleOpen = () => setNewSessionDialogOpen(true)
    window.addEventListener(APP_EVENTS.OPEN_NEW_SESSION_DIALOG, handleOpen)
    return () => window.removeEventListener(APP_EVENTS.OPEN_NEW_SESSION_DIALOG, handleOpen)
  }, [])

  const startSession = useCallback((cwdOverride?: string | null) => {
    const { selectedProjectId, projects } = useProjectsStore.getState()
    if (!selectedProjectId) {
      toast.error('No project selected')
      return
    }
    if (!useThreadStore.getState().canAddSession()) {
      toast.error('Maximum sessions reached')
      return
    }
    const project = projects.find((p) => p.id === selectedProjectId)
    if (!project) {
      toast.error('Project not found')
      return
    }

    const settings = useSettingsStore.getState().settings
    const effective = mergeProjectSettings(settings, project.settingsJson)
    const cwd = cwdOverride || getEffectiveWorkingDirectory(project.path, project.settingsJson)

    void useSessionsStore.getState().selectSession(null)
    void useThreadStore
      .getState()
      .startThread(selectedProjectId, cwd, effective.model, effective.sandboxMode, effective.approvalPolicy)
      .then((threadId) => {
        void useSessionsStore.getState().selectSession(threadId)
        toast.success('New session started')
        void navigate('/')
      })
      .catch((err) => {
        toast.error('Failed to start new session', { message: String(err) })
      })
  }, [navigate, toast])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <HostNavigationListener />
      <KeyboardShortcuts />
      {sidebarCollapsed ? (
        <div className="relative h-full w-12 shrink-0 border-r border-stroke/20 bg-surface-solid">
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="absolute left-1.5 top-3 inline-flex h-8 w-9 items-center justify-center rounded-md border border-stroke/20 bg-surface-solid text-text-2 transition-colors hover:bg-surface-hover/[0.06] hover:text-text-1"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
        </div>
      ) : (
        <Sidebar />
      )}
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
        initialIntent={commitDialogIntent}
        onClose={() => {
          setCommitDialogOpen(false)
          setCommitDialogIntent('commit')
        }}
      />
      <NewThreadDialog
        isOpen={newSessionDialogOpen}
        onClose={() => setNewSessionDialogOpen(false)}
        projectPath={selectedProject?.path ?? null}
        onCreateLocal={() => startSession(null)}
        onCreateWorktree={(_branchName, worktreePath) => startSession(worktreePath)}
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
