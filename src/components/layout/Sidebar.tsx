/**
 * Sidebar - Main coordinator component for project/session navigation
 *
 * Refactored from 802 lines to ~180 lines by extracting sub-components:
 * - SidebarTabs: Tab switcher UI
 * - SessionSearch: Search input with debounce
 * - ProjectList: Project cards with context menu
 * - SessionList: Session cards with sorting and context menu
 * - SidebarDialogs: All dialog components
 * - useSidebarDialogs: Dialog state management hook
 */

import React, { useEffect, useCallback, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { open } from '@tauri-apps/plugin-dialog'
import { MessageSquarePlus, Zap, Layers, Bell, Settings, FolderPlus, PanelLeftClose, Filter, Check } from 'lucide-react'
import { IconButton } from '../ui/IconButton'
import { log } from '../../lib/logger'
import { APP_EVENTS } from '../../lib/appEvents'
import { useProjectsStore } from '../../stores/projects'
import { useSessionsStore } from '../../stores/sessions'
import { useAppStore } from '../../stores/app'
import { useThreadStore, selectFocusedThread } from '../../stores/thread'
import { useAutomationsStore } from '../../stores/automations'
import { useSettingsStore, mergeProjectSettings, getEffectiveWorkingDirectory } from '../../stores/settings'
import { useToast } from '../ui/Toast'
import { SessionSearch, GroupedSessionList, SidebarDialogs, useSidebarDialogs } from './sidebar/index'
import { SwarmToggle } from './sidebar/SwarmToggle'
import { ImportCodexSessionDialog } from '../LazyComponents'
import type { CodexSessionSummary } from '../../lib/api'
import { cn, formatSessionTime } from '../../lib/utils'
import { Dropdown } from '../ui/Dropdown'

type OpenProjectSettingsEventDetail = { projectId?: string | null }

function InboxBadge() {
  const unreadCount = useAutomationsStore((state) =>
    state.inboxItems.filter((item) => !item.isRead).length
  )
  if (unreadCount === 0) return null
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )
}

export const Sidebar = React.memo(function Sidebar() {
  const { setSidebarTab: setActiveTab } = useAppStore()
  const toggleSidebarCollapsed = useAppStore((state) => state.toggleSidebarCollapsed)
  const { projects, selectedProjectId, addProject, selectProject } = useProjectsStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [sessionFilters, setSessionFilters] = useState(() => {
    const defaults = { pinnedOnly: false, runningOnly: false, showArchived: false }
    try {
      if (typeof localStorage === 'undefined') return defaults
      const raw = localStorage.getItem('codex:session-filters')
      if (!raw) return defaults
      const parsed = JSON.parse(raw) as Partial<typeof defaults>
      return {
        pinnedOnly: typeof parsed.pinnedOnly === 'boolean' ? parsed.pinnedOnly : defaults.pinnedOnly,
        runningOnly: typeof parsed.runningOnly === 'boolean' ? parsed.runningOnly : defaults.runningOnly,
        showArchived: typeof parsed.showArchived === 'boolean' ? parsed.showArchived : defaults.showArchived,
      }
    } catch {
      // localStorage may be unavailable or contain invalid JSON
      return defaults
    }
  })
  const {
    sessions,
    selectedSessionId,
    isLoading: sessionsLoading,
    searchQuery,
    searchResults,
    isSearching,
    selectSession,
    fetchSessions,
  } = useSessionsStore()
  const closeAllThreads = useThreadStore((state) => state.closeAllThreads)
  const startThread = useThreadStore((state) => state.startThread)
  const settings = useSettingsStore((state) => state.settings)
  const { showToast } = useToast()
  const dialogs = useSidebarDialogs()
  const handleOpenProjectSettings = dialogs.handleOpenProjectSettings

  useEffect(() => {
    try {
      localStorage.setItem('codex:session-filters', JSON.stringify(sessionFilters))
    } catch {
      // localStorage may be full or unavailable — filters still work in memory
    }
  }, [sessionFilters])

  useEffect(() => {
    const onOpenImport = () => setImportDialogOpen(true)
    window.addEventListener(APP_EVENTS.OPEN_IMPORT_CODEX_SESSIONS, onOpenImport)
    return () => window.removeEventListener(APP_EVENTS.OPEN_IMPORT_CODEX_SESSIONS, onOpenImport)
  }, [])

  useEffect(() => {
    const onOpenProjectSettings = (event: Event) => {
      const custom = event as CustomEvent<OpenProjectSettingsEventDetail>
      const projectId = custom.detail?.projectId ?? selectedProjectId
      if (!projectId) {
        showToast('No project selected', 'error')
        return
      }
      handleOpenProjectSettings(projectId)
    }
    window.addEventListener(APP_EVENTS.OPEN_PROJECT_SETTINGS, onOpenProjectSettings)
    return () => window.removeEventListener(APP_EVENTS.OPEN_PROJECT_SETTINGS, onOpenProjectSettings)
  }, [handleOpenProjectSettings, selectedProjectId, showToast])

  useEffect(() => {
    if (selectedProjectId) void fetchSessions(selectedProjectId)
  }, [fetchSessions, selectedProjectId])

  const displaySessions = searchQuery ? searchResults : sessions
  const filteredSessions = useMemo(
    () => displaySessions.filter((s) => {
      if (!sessionFilters.showArchived && s.isArchived) return false
      if (sessionFilters.pinnedOnly && !s.isFavorite) return false
      if (sessionFilters.runningOnly && s.status !== 'running') return false
      return true
    }),
    [displaySessions, sessionFilters.showArchived, sessionFilters.pinnedOnly, sessionFilters.runningOnly]
  )
  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null
  const displayProjectName = selectedProject
    ? selectedProject.displayName || selectedProject.path.split('/').pop() || null
    : null
  const selectedSession = selectedSessionId
    ? displaySessions.find((s) => s.sessionId === selectedSessionId) ?? null
    : null

  const handleSelectSession = useCallback((sessionId: string | null, sessionProjectId?: string) => {
    if (sessionProjectId && sessionProjectId !== selectedProjectId) {
      closeAllThreads()
      selectProject(sessionProjectId)
    }
    selectSession(sessionId)
  }, [closeAllThreads, selectProject, selectSession, selectedProjectId])

  const handleAddProject = async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Select Project Folder' })
      if (selected && typeof selected === 'string') {
        await addProject(selected)
        showToast('Project added successfully', 'success')
      }
    } catch (error) {
      log.error(`Failed to add project: ${error}`, 'Sidebar')
      showToast('Failed to add project', 'error')
    }
  }

  const handleNewSession = async () => {
    if (!selectedProjectId) {
      await handleAddProject()
      return
    }
    const project = projects.find((p) => p.id === selectedProjectId)
    if (!project) return
    const effective = mergeProjectSettings(settings, project.settingsJson)
    const cwd = getEffectiveWorkingDirectory(project.path, project.settingsJson)
    try {
      selectSession(null)
      await startThread(selectedProjectId, cwd, effective.model, effective.sandboxMode, effective.approvalPolicy)
      const newThread = selectFocusedThread(useThreadStore.getState())?.thread ?? null
      if (newThread) selectSession(newThread.id)
      await fetchSessions(selectedProjectId)
      setActiveTab('sessions')
      showToast('New session started', 'success')
    } catch (error) {
      log.error(`Failed to start new session: ${error}`, 'Sidebar')
      showToast('Failed to start new session', 'error')
    }
  }

  const handleImportSession = useCallback(async (session: CodexSessionSummary) => {
    // Find or create project for the imported session's cwd
    let projectId = projects.find((p) => p.path === session.cwd)?.id

    if (!projectId) {
      // Auto-add the project if it doesn't exist
      try {
        const newProject = await addProject(session.cwd)
        projectId = newProject.id
        showToast(`Project "${session.projectName}" added`, 'success')
      } catch (error) {
        log.error(`Failed to add project for imported session: ${error}`, 'Sidebar')
        showToast('Failed to add project for imported session', 'error')
        return
      }
    }

    // Select the project and switch to sessions tab
    selectProject(projectId)
    setActiveTab('sessions')

    // Start a new thread that resumes from the imported session
    const project = projects.find((p) => p.id === projectId) ?? { path: session.cwd, settingsJson: null }
    const effective = mergeProjectSettings(settings, project.settingsJson)
    const cwd = getEffectiveWorkingDirectory(project.path, project.settingsJson)

    try {
      // Resume the CLI session by starting a thread with the session ID
      selectSession(null)
      await startThread(projectId, cwd, effective.model, effective.sandboxMode, effective.approvalPolicy)

      // Get the new thread and try to resume the CLI session
      const resumeThread = useThreadStore.getState().resumeThread
      const newThread = selectFocusedThread(useThreadStore.getState())?.thread ?? null
      if (newThread) {
        try {
          // Try to resume the imported session
          await resumeThread(session.id)
          selectSession(session.id)
          showToast('Session imported and resumed', 'success')
        } catch {
          // If resume fails, just use the new session
          selectSession(newThread.id)
          showToast('Session imported (started new)', 'info')
        }
      }

      await fetchSessions(projectId)
    } catch (error) {
      log.error(`Failed to import session: ${error}`, 'Sidebar')
      showToast('Failed to import session', 'error')
    }
  }, [projects, addProject, selectProject, setActiveTab, settings, startThread, fetchSessions, selectSession, showToast])

  return (
    <aside
      className="sidebar-vibrancy relative flex h-full w-token-sidebar min-w-token-sidebar shrink-0 flex-col overflow-hidden border-r border-stroke/20"
      data-tauri-drag-region
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-14 top-0 h-28 w-28 rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-500/12" />
        <div className="absolute -bottom-20 -left-8 h-36 w-36 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/12" />
      </div>

      <div className="relative z-10 flex h-toolbar items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-[#ff5f57]" />
          <span className="h-3.5 w-3.5 rounded-full bg-[#febc2e]" />
          <span className="h-3.5 w-3.5 rounded-full bg-[#28c840]" />
        </div>
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          className="inline-flex h-7 w-9 items-center justify-center rounded-md border border-stroke/20 bg-surface-solid text-text-2 transition-colors hover:bg-surface-hover/[0.06] hover:text-text-1"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      {selectedSession && (
        <div className="relative z-10 px-3 pb-2">
          <div className="flex h-10 items-center justify-between rounded-md px-2 text-[11px] text-text-2">
            <div
              className="min-w-0 truncate pr-2 text-[13px] font-semibold text-text-1"
              title={selectedSession.title || displayProjectName || 'Session'}
            >
              {selectedSession.title || displayProjectName || 'Session'}
            </div>
            <div className="shrink-0 text-[11px] text-text-3">
              {formatSessionTime(selectedSession.lastAccessedAt || selectedSession.createdAt)}
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 h-toolbar-sm flex items-center px-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-3">
        Workspace
      </div>

      <nav className="relative z-10 space-y-0.5 px-2 pb-2">
        <button
          onClick={handleNewSession}
          className="group flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-[16px] text-text-1 transition-colors hover:bg-surface-hover/[0.06]"
        >
            <MessageSquarePlus
              size={19}
              className="text-text-2 transition-colors group-hover:text-text-1"
              strokeWidth={1.8}
            />
            <span className="text-[16px] tracking-tight">New session</span>
          </button>
        <SwarmToggle />
        <button
          type="button"
          onClick={() => navigate('/inbox?automationMode=create')}
          className={cn(
            "group flex h-10 w-full items-center justify-between gap-2.5 rounded-md px-3 text-[16px] text-text-1 transition-colors hover:bg-surface-hover/[0.06]",
            location.pathname === '/inbox' && location.search.includes('automationMode=create') && 'bg-surface-hover/[0.08]'
          )}
        >
          <div className="flex items-center gap-2.5">
            <Zap
              size={19}
              className="text-text-2 transition-colors group-hover:text-text-1"
              strokeWidth={1.8}
            />
            <span className="text-[16px] tracking-tight">Automations</span>
          </div>
          <span className="rounded border border-stroke/20 px-1.5 py-0.5 text-[10px] font-medium text-text-3">
            Beta
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/inbox')}
          className={cn(
            "group flex h-10 w-full items-center justify-between gap-2.5 rounded-md px-3 text-[16px] text-text-1 transition-colors hover:bg-surface-hover/[0.06]",
            location.pathname === '/inbox' && !location.search.includes('automationMode=create') && 'bg-surface-hover/[0.08]'
          )}
        >
          <div className="flex items-center gap-2.5">
            <Bell
              size={19}
              className="text-text-2 transition-colors group-hover:text-text-1"
              strokeWidth={1.8}
            />
            <span className="text-[16px] tracking-tight">Inbox</span>
          </div>
          <InboxBadge />
        </button>
        <button
          type="button"
          onClick={() => navigate('/skills')}
          className={cn(
            "group flex h-10 w-full items-center gap-2.5 rounded-md px-3 text-[16px] text-text-1 transition-colors hover:bg-surface-hover/[0.06]",
            location.pathname === '/skills' && 'bg-surface-hover/[0.08]'
          )}
        >
          <Layers
            size={19}
            className="text-text-2 transition-colors group-hover:text-text-1"
            strokeWidth={1.8}
          />
          <span className="text-[16px] tracking-tight">Skills</span>
        </button>
      </nav>

	      <div className="relative z-10 group flex items-center justify-between px-3 pb-2 pt-2">
	        <span className="text-[14px] font-semibold uppercase tracking-[0.1em] text-text-3">
	          Sessions
	        </span>
	        <div className="flex gap-0.5 opacity-90 transition-opacity group-hover:opacity-100">
	          <IconButton
	            onClick={handleAddProject}
	            size="sm"
	            title="Add project folder"
	            aria-label="Add project folder"
	            className="h-6 w-6 text-text-3 hover:bg-surface-hover/[0.06] hover:text-text-1"
	          >
	            <FolderPlus size={13} strokeWidth={1.5} />
	          </IconButton>
            <Dropdown.Root>
              <Dropdown.Trigger
                className="relative inline-flex h-6 w-6 items-center justify-center rounded-md text-text-3 transition-colors hover:bg-surface-hover/[0.06] hover:text-text-1"
                title="Filter sessions"
                aria-label="Filter sessions"
              >
                <Filter size={13} strokeWidth={1.5} />
                {(sessionFilters.pinnedOnly || sessionFilters.runningOnly || sessionFilters.showArchived) && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </Dropdown.Trigger>
              <Dropdown.Content side="bottom" align="end" sideOffset={8}>
                <Dropdown.Label>Filters</Dropdown.Label>
                <Dropdown.Item
                  onClick={() => setSessionFilters((prev) => ({ ...prev, pinnedOnly: !prev.pinnedOnly }))}
                >
                  {sessionFilters.pinnedOnly ? <Check size={14} /> : <span className="w-[14px]" />}
                  Pinned only
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => setSessionFilters((prev) => ({ ...prev, runningOnly: !prev.runningOnly }))}
                >
                  {sessionFilters.runningOnly ? <Check size={14} /> : <span className="w-[14px]" />}
                  Running only
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => setSessionFilters((prev) => ({ ...prev, showArchived: !prev.showArchived }))}
                >
                  {sessionFilters.showArchived ? <Check size={14} /> : <span className="w-[14px]" />}
                  Show archived
                </Dropdown.Item>
                <Dropdown.Separator />
                <Dropdown.Item
                  onClick={() => setSessionFilters({ pinnedOnly: false, runningOnly: false, showArchived: false })}
                >
                  Clear filters
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Root>
	        </div>
	      </div>

      <div className="relative z-10 px-2">
        <SessionSearch visible={true} />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-2">
        <GroupedSessionList
          sessions={filteredSessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={handleSelectSession}
          onOpenProjectSettings={handleOpenProjectSettings}
          isLoading={sessionsLoading || isSearching}
        />
      </div>

      <div className="relative z-10 border-t border-stroke/20 px-2 py-3">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className={cn(
            "flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[15px] text-text-2 transition-colors hover:bg-surface-hover/[0.06] hover:text-text-1",
            location.pathname.startsWith('/settings') && 'bg-surface-hover/[0.08] text-text-1'
          )}
        >
          <Settings size={17} className="text-text-3" />
          <span className="text-[16px] tracking-tight">Settings</span>
        </button>
      </div>

      <SidebarDialogs
        renameDialogOpen={dialogs.renameDialogOpen}
        projectToRename={dialogs.projectToRename}
        onConfirmRename={dialogs.handleConfirmRename}
        onCancelRenameProject={dialogs.cancelRenameProject}
        sessionRenameDialogOpen={dialogs.sessionRenameDialogOpen}
        sessionToRename={dialogs.sessionToRename}
        onConfirmSessionRename={dialogs.handleConfirmSessionRename}
        onCancelRenameSession={dialogs.cancelRenameSession}
        projectSettingsOpen={dialogs.projectSettingsOpen}
        projectSettingsId={dialogs.projectSettingsId}
        onCloseProjectSettings={dialogs.closeProjectSettings}
        deleteProjectConfirm={dialogs.deleteProjectConfirm}
        onConfirmDeleteProject={dialogs.confirmDeleteProject}
        onCancelDeleteProject={dialogs.cancelDeleteProject}
        deleteSessionConfirm={dialogs.deleteSessionConfirm}
        onConfirmDeleteSession={dialogs.confirmDeleteSession}
        onCancelDeleteSession={dialogs.cancelDeleteSession}
      />
      <ImportCodexSessionDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportSession}
      />
    </aside>
  )
})
