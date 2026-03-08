/**
 * Sidebar - Rail + Resizable Panel layout
 *
 * Layout:
 *   ┌──────┬──────────────────┐
 *   │ Rail │ Session Panel     │
 *   │ 56px │ (resizable)       │
 *   └──────┴──────────────────┘
 *
 * When sidebarCollapsed=true the Panel is hidden; only the 56px Rail is shown.
 */

import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { open } from '@tauri-apps/plugin-dialog'
import {
  MessageSquarePlus,
  Zap,
  Layers,
  Bell,
  Settings,
  FolderPlus,
  PanelLeftClose,
  PanelLeftOpen,
  Filter,
  Check,
} from 'lucide-react'
import { IconButton } from '../ui/IconButton'
import { Tooltip } from '../ui/Tooltip'
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

// ─── InboxBadge ──────────────────────────────────────────────────────────────

function InboxBadge() {
  const unreadCount = useAutomationsStore((state) =>
    state.inboxItems.filter((item) => !item.isRead).length
  )
  if (unreadCount === 0) return null
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-semibold text-primary-foreground">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )
}

// ─── ResizeHandle ─────────────────────────────────────────────────────────────

interface ResizeHandleProps {
  onResize: (delta: number) => void
  onResizeEnd: () => void
}

function ResizeHandle({ onResize, onResizeEnd }: ResizeHandleProps) {
  const dragging = useRef(false)
  const lastX = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    lastX.current = e.clientX

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const delta = ev.clientX - lastX.current
      lastX.current = ev.clientX
      onResize(delta)
    }
    const onMouseUp = () => {
      dragging.current = false
      onResizeEnd()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [onResize, onResizeEnd])

  return (
    <div
      data-component="resize-handle"
      onMouseDown={onMouseDown}
      className={cn(
        'absolute right-0 top-0 z-20 h-full w-1 cursor-col-resize',
        'transition-colors hover:bg-primary/40 active:bg-primary/60',
      )}
      aria-hidden="true"
    />
  )
}

// ─── SidebarRail ──────────────────────────────────────────────────────────────

interface SidebarRailProps {
  onNewSession: () => void
  onToggleCollapsed: () => void
  sidebarCollapsed: boolean
}

function SidebarRail({ onNewSession, onToggleCollapsed, sidebarCollapsed }: SidebarRailProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const unreadCount = useAutomationsStore((state) =>
    state.inboxItems.filter((item) => !item.isRead).length
  )

  const isActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path)

  const railBtn = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    active: boolean,
    badge?: React.ReactNode,
  ) => (
    <Tooltip content={label} side="right" delayMs={300}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-lg text-text-2 transition-colors',
          'hover:bg-surface-hover/[0.08] hover:text-text-1',
          active && 'bg-surface-hover/[0.08] text-text-1',
        )}
      >
        {icon}
        {badge}
      </button>
    </Tooltip>
  )

  return (
    <div
      className="sidebar-vibrancy relative flex h-full w-14 shrink-0 flex-col items-center overflow-hidden border-r border-stroke/20"
      data-tauri-drag-region
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-6 top-0 h-20 w-20 rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-500/12" />
        <div className="absolute -bottom-12 -left-4 h-24 w-24 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/12" />
      </div>

      {/* Traffic lights + collapse toggle */}
      <div
        className="relative z-10 flex h-toolbar w-full flex-col items-center justify-end pb-1"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-1.5 self-start px-3 pt-1">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <Tooltip content={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right" delayMs={300}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="mt-1 flex h-7 w-10 items-center justify-center rounded-md border border-stroke/20 bg-surface-solid text-text-2 transition-colors hover:bg-surface-hover/[0.06] hover:text-text-1"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
          </button>
        </Tooltip>
      </div>

      {/* Top nav icons */}
      <nav className="relative z-10 flex flex-1 flex-col items-center gap-1 pt-2">
        {railBtn(
          'New session',
          <MessageSquarePlus size={18} strokeWidth={1.8} />,
          onNewSession,
          false,
        )}
        {railBtn(
          'Automations',
          <Zap size={18} strokeWidth={1.8} />,
          () => navigate('/inbox?automationMode=create'),
          isActive('/inbox') && location.search.includes('automationMode=create'),
          <span className="absolute -right-0 top-0 rounded border border-stroke/20 px-0.5 text-[7px] font-medium text-text-3">β</span>,
        )}
        {railBtn(
          'Inbox',
          <Bell size={18} strokeWidth={1.8} />,
          () => navigate('/inbox'),
          isActive('/inbox') && !location.search.includes('automationMode=create'),
          unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-semibold text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : undefined,
        )}
        {railBtn(
          'Skills',
          <Layers size={18} strokeWidth={1.8} />,
          () => navigate('/skills'),
          isActive('/skills'),
        )}
      </nav>

      {/* Bottom nav icons */}
      <div className="relative z-10 flex flex-col items-center gap-1 border-t border-stroke/20 py-3">
        {railBtn(
          'Settings',
          <Settings size={18} strokeWidth={1.8} />,
          () => navigate('/settings'),
          isActive('/settings'),
        )}
      </div>
    </div>
  )
}

// ─── SidebarPanel ─────────────────────────────────────────────────────────────

interface SidebarPanelProps {
  width: number
  onResize: (delta: number) => void
  onResizeEnd: () => void
  selectedSession: ReturnType<typeof useSessionsStore>['sessions'][number] | null
  displayProjectName: string | null
  filteredSessions: ReturnType<typeof useSessionsStore>['sessions']
  selectedSessionId: string | null
  sessionsLoading: boolean
  isSearching: boolean
  sessionFilters: { pinnedOnly: boolean; runningOnly: boolean; showArchived: boolean }
  onSelectSession: (id: string | null, projectId?: string) => void
  onOpenProjectSettings: (projectId: string) => void
  onToggleFavorite: (id: string, current: boolean) => Promise<void>
  onAddProject: () => Promise<void>
  onSetSessionFilters: React.Dispatch<React.SetStateAction<{ pinnedOnly: boolean; runningOnly: boolean; showArchived: boolean }>>
}

function SidebarPanel({
  width,
  onResize,
  onResizeEnd,
  selectedSession,
  displayProjectName,
  filteredSessions,
  selectedSessionId,
  sessionsLoading,
  isSearching,
  sessionFilters,
  onSelectSession,
  onOpenProjectSettings,
  onToggleFavorite,
  onAddProject,
  onSetSessionFilters,
}: SidebarPanelProps) {
  return (
    <div
      className="relative flex h-full flex-col overflow-hidden border-r border-stroke/20"
      style={{ width }}
    >
      {/* Spacer to align with rail toolbar height */}
      <div className="h-toolbar shrink-0" data-tauri-drag-region />

      {selectedSession && (
        <div className="px-3 pb-2">
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

      <div className="flex h-toolbar-sm shrink-0 items-center px-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-3">
        Workspace
      </div>

      <nav className="space-y-0.5 px-2 pb-2">
        <SwarmToggle />
      </nav>

      {/* Sessions header */}
      <div className="group flex items-center justify-between px-3 pb-2 pt-2">
        <span className="text-[14px] font-semibold uppercase tracking-[0.1em] text-text-3">
          Sessions
        </span>
        <div className="flex gap-0.5 opacity-90 transition-opacity group-hover:opacity-100">
          <IconButton
            onClick={onAddProject}
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
                onClick={() => onSetSessionFilters((prev) => ({ ...prev, pinnedOnly: !prev.pinnedOnly }))}
              >
                {sessionFilters.pinnedOnly ? <Check size={14} /> : <span className="w-[14px]" />}
                Pinned only
              </Dropdown.Item>
              <Dropdown.Item
                onClick={() => onSetSessionFilters((prev) => ({ ...prev, runningOnly: !prev.runningOnly }))}
              >
                {sessionFilters.runningOnly ? <Check size={14} /> : <span className="w-[14px]" />}
                Running only
              </Dropdown.Item>
              <Dropdown.Item
                onClick={() => onSetSessionFilters((prev) => ({ ...prev, showArchived: !prev.showArchived }))}
              >
                {sessionFilters.showArchived ? <Check size={14} /> : <span className="w-[14px]" />}
                Show archived
              </Dropdown.Item>
              <Dropdown.Separator />
              <Dropdown.Item
                onClick={() => onSetSessionFilters({ pinnedOnly: false, runningOnly: false, showArchived: false })}
              >
                Clear filters
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Root>
        </div>
      </div>

      <div className="px-2">
        <SessionSearch visible={true} />
      </div>

      <div className="scroll-view flex-1 overflow-y-auto px-2">
        <GroupedSessionList
          sessions={filteredSessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={onSelectSession}
          onOpenProjectSettings={onOpenProjectSettings}
          isLoading={sessionsLoading || isSearching}
          onToggleFavorite={onToggleFavorite}
        />
      </div>

      {/* Resize handle on right edge */}
      <ResizeHandle onResize={onResize} onResizeEnd={onResizeEnd} />
    </div>
  )
}

// ─── Sidebar (root export) ────────────────────────────────────────────────────

export const Sidebar = React.memo(function Sidebar() {
  const { setSidebarTab: setActiveTab, sidebarCollapsed, toggleSidebarCollapsed, sidebarPanelWidth, setSidebarPanelWidth } = useAppStore()
  const { projects, selectedProjectId, addProject, selectProject } = useProjectsStore()
  const navigate = useNavigate()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  // Peek panel — shown when hovering the rail while sidebar is collapsed
  const [showPeek, setShowPeek] = useState(false)
  const peekHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    updateSession,
  } = useSessionsStore()
  const closeAllThreads = useThreadStore((state) => state.closeAllThreads)
  const startThread = useThreadStore((state) => state.startThread)
  const settings = useSettingsStore((state) => state.settings)
  const { showToast } = useToast()
  const dialogs = useSidebarDialogs()
  const handleOpenProjectSettings = dialogs.handleOpenProjectSettings

  // Transient resize width (updates every mousemove without hitting the store)
  const [liveWidth, setLiveWidth] = useState<number | null>(null)
  const panelWidth = liveWidth ?? sidebarPanelWidth

  useEffect(() => {
    try {
      localStorage.setItem('codex:session-filters', JSON.stringify(sessionFilters))
    } catch {
      // Best-effort
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
    () =>
      displaySessions.filter((s) => {
        if (!sessionFilters.showArchived && s.isArchived) return false
        if (sessionFilters.pinnedOnly && !s.isFavorite) return false
        if (sessionFilters.runningOnly && s.status !== 'running') return false
        return true
      }),
    [displaySessions, sessionFilters.showArchived, sessionFilters.pinnedOnly, sessionFilters.runningOnly],
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

  const handleSelectSession = useCallback(
    (sessionId: string | null, sessionProjectId?: string) => {
      if (sessionProjectId && sessionProjectId !== selectedProjectId) {
        closeAllThreads()
        selectProject(sessionProjectId)
      }
      selectSession(sessionId)
    },
    [closeAllThreads, selectProject, selectSession, selectedProjectId],
  )

  const handleToggleFavorite = useCallback(
    async (sessionId: string, current: boolean) => {
      try {
        await updateSession(sessionId, { isFavorite: !current })
      } catch {
        showToast('Failed to update pin status', 'error')
      }
    },
    [updateSession, showToast],
  )

  const handleAddProject = useCallback(async () => {
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
  }, [addProject, showToast])

  const handleNewSession = useCallback(async () => {
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
  }, [selectedProjectId, projects, settings, selectSession, startThread, fetchSessions, setActiveTab, showToast, handleAddProject])

  const handleImportSession = useCallback(
    async (session: CodexSessionSummary) => {
      let projectId = projects.find((p) => p.path === session.cwd)?.id
      if (!projectId) {
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
      selectProject(projectId)
      setActiveTab('sessions')
      const project = projects.find((p) => p.id === projectId) ?? { path: session.cwd, settingsJson: null }
      const effective = mergeProjectSettings(settings, project.settingsJson)
      const cwd = getEffectiveWorkingDirectory(project.path, project.settingsJson)
      try {
        selectSession(null)
        await startThread(projectId, cwd, effective.model, effective.sandboxMode, effective.approvalPolicy)
        const resumeThread = useThreadStore.getState().resumeThread
        const newThread = selectFocusedThread(useThreadStore.getState())?.thread ?? null
        if (newThread) {
          try {
            await resumeThread(session.id)
            selectSession(session.id)
            showToast('Session imported and resumed', 'success')
          } catch {
            selectSession(newThread.id)
            showToast('Session imported (started new)', 'info')
          }
        }
        await fetchSessions(projectId)
      } catch (error) {
        log.error(`Failed to import session: ${error}`, 'Sidebar')
        showToast('Failed to import session', 'error')
      }
    },
    [projects, addProject, selectProject, setActiveTab, settings, startThread, fetchSessions, selectSession, showToast],
  )

  const handleResize = useCallback((delta: number) => {
    setLiveWidth((prev) => {
      const base = prev ?? sidebarPanelWidth
      const MIN = 160
      const MAX = 480
      return Math.min(Math.max(base + delta, MIN), MAX)
    })
  }, [sidebarPanelWidth])

  const handleResizeEnd = useCallback(() => {
    setLiveWidth((prev) => {
      if (prev !== null) setSidebarPanelWidth(prev)
      return null
    })
  }, [setSidebarPanelWidth])

  const handleRailMouseEnter = useCallback(() => {
    if (!sidebarCollapsed) return
    if (peekHideTimerRef.current) {
      clearTimeout(peekHideTimerRef.current)
      peekHideTimerRef.current = null
    }
    setShowPeek(true)
  }, [sidebarCollapsed])

  const handleRailMouseLeave = useCallback(() => {
    if (!sidebarCollapsed) return
    peekHideTimerRef.current = setTimeout(() => {
      setShowPeek(false)
      peekHideTimerRef.current = null
    }, 80)
  }, [sidebarCollapsed])

  const handlePeekMouseEnter = useCallback(() => {
    if (peekHideTimerRef.current) {
      clearTimeout(peekHideTimerRef.current)
      peekHideTimerRef.current = null
    }
  }, [])

  const handlePeekMouseLeave = useCallback(() => {
    peekHideTimerRef.current = setTimeout(() => {
      setShowPeek(false)
      peekHideTimerRef.current = null
    }, 80)
  }, [])

  return (
    <aside className="relative flex h-full shrink-0 overflow-visible">
      <div
        className="contents"
        onMouseEnter={handleRailMouseEnter}
        onMouseLeave={handleRailMouseLeave}
      >
        <SidebarRail
          onNewSession={handleNewSession}
          onToggleCollapsed={toggleSidebarCollapsed}
          sidebarCollapsed={sidebarCollapsed}
        />
      </div>
      {!sidebarCollapsed && (
        <SidebarPanel
          width={panelWidth}
          onResize={handleResize}
          onResizeEnd={handleResizeEnd}
          selectedSession={selectedSession as Parameters<typeof SidebarPanel>[0]['selectedSession']}
          displayProjectName={displayProjectName}
          filteredSessions={filteredSessions}
          selectedSessionId={selectedSessionId}
          sessionsLoading={sessionsLoading}
          isSearching={isSearching}
          sessionFilters={sessionFilters}
          onSelectSession={handleSelectSession}
          onOpenProjectSettings={handleOpenProjectSettings}
          onToggleFavorite={handleToggleFavorite}
          onAddProject={handleAddProject}
          onSetSessionFilters={setSessionFilters}
        />
      )}
      {/* Peek panel — floating session list when hovering collapsed rail */}
      {sidebarCollapsed && (
        <div
          className={cn(
            'absolute left-14 top-0 bottom-0 z-30 w-[240px]',
            'pointer-events-none',
            showPeek ? 'pointer-events-auto' : '',
          )}
          style={{
            boxShadow: 'var(--shadow-sidebar-overlay, 0 8px 32px rgba(0,0,0,0.45))',
          }}
          onMouseEnter={handlePeekMouseEnter}
          onMouseLeave={handlePeekMouseLeave}
        >
          <div
            className={cn(
              'h-full w-full transition-[opacity,transform] overflow-hidden',
              showPeek
                ? 'opacity-100 translate-x-0 duration-[180ms] ease-out'
                : 'opacity-0 -translate-x-2 duration-[120ms] ease-in',
            )}
          >
            <SidebarPanel
              width={240}
              onResize={() => {/* no-op in peek mode */}}
              onResizeEnd={() => {/* no-op in peek mode */}}
              selectedSession={selectedSession as Parameters<typeof SidebarPanel>[0]['selectedSession']}
              displayProjectName={displayProjectName}
              filteredSessions={filteredSessions}
              selectedSessionId={selectedSessionId}
              sessionsLoading={sessionsLoading}
              isSearching={isSearching}
              sessionFilters={sessionFilters}
              onSelectSession={(id, pid) => { handleSelectSession(id, pid); setShowPeek(false) }}
              onOpenProjectSettings={handleOpenProjectSettings}
              onToggleFavorite={handleToggleFavorite}
              onAddProject={handleAddProject}
              onSetSessionFilters={setSessionFilters}
            />
          </div>
        </div>
      )}

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
