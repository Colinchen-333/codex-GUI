import { useState, memo, useMemo, useCallback, useRef, useEffect } from 'react'
import { X, Plus, MessageSquare, Loader2, MoreHorizontal, Play, ChevronDown, GitCommit, PanelRightClose, PanelRightOpen, SquareTerminal, FolderOpen, Code2, Square } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useThreadStore, type SingleThreadState } from '../../stores/thread'
import { useProjectsStore } from '../../stores/projects'
import { useSessionsStore } from '../../stores/sessions'
import { CloseSessionDialog } from './CloseSessionDialog'
import { TaskProgressCompact } from '../chat/TaskProgress'
import { Dropdown } from '../ui/Dropdown'
import type { SessionStatus } from '../../lib/api'

interface SessionTabsProps {
  onNewSession?: () => void
  onToggleRightPanel?: () => void
  rightPanelOpen?: boolean
  onOpenCommitDialog?: () => void
  terminalVisible?: boolean
  onToggleTerminal?: () => void
}

export function SessionTabs({ onNewSession, onToggleRightPanel, rightPanelOpen, onOpenCommitDialog, terminalVisible, onToggleTerminal }: SessionTabsProps) {
  const threads = useThreadStore((state) => state.threads)
  const focusedThreadId = useThreadStore((state) => state.focusedThreadId)
  const switchThread = useThreadStore((state) => state.switchThread)
  const canAddSession = useThreadStore((state) => state.canAddSession)
  const maxSessions = useThreadStore((state) => state.maxSessions)
  const isLoading = useThreadStore((state) => state.isLoading)
  const sessions = useSessionsStore((state) => state.sessions)
  const projects = useProjectsStore((state) => state.projects)

  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [threadToClose, setThreadToClose] = useState<string | null>(null)
  const [switchingTabId, setSwitchingTabId] = useState<string | null>(null)
  const switchingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (switchingTimeoutRef.current) {
        clearTimeout(switchingTimeoutRef.current)
      }
    }
  }, [])

  const handleTabClick = useCallback((threadId: string) => {
    // Prevent clicking if already switching or if it's the current tab
    if (threadId === focusedThreadId || switchingTabId !== null) {
      return
    }

    // Set switching state
    setSwitchingTabId(threadId)

    // Clear any existing timeout
    if (switchingTimeoutRef.current) {
      clearTimeout(switchingTimeoutRef.current)
    }

    // Perform the switch
    try {
      switchThread(threadId)
    } catch {
      // Revert switching state on error
      setSwitchingTabId(null)
      return
    }

    // Clear switching state after a short delay for visual feedback
    // This also handles the global isLoading state from thread store
    switchingTimeoutRef.current = setTimeout(() => {
      setSwitchingTabId(null)
    }, 300)
  }, [focusedThreadId, switchingTabId, switchThread])

  const handleCloseClick = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation()
    setThreadToClose(threadId)
    setCloseDialogOpen(true)
  }

  const handleNewSessionClick = () => {
    if (canAddSession() && onNewSession) {
      onNewSession()
    }
  }

  const threadEntries = Object.entries(threads)

  const activeSession = sessions.find(s => s.sessionId === focusedThreadId)
  const activeThreadState = focusedThreadId ? threads[focusedThreadId] : null
  const sessionTitle = activeSession?.title || activeThreadState?.thread?.cwd?.split('/').pop() || 'New thread'
  const activeProjectName = useMemo(() => {
    const cwd = activeThreadState?.thread?.cwd
    if (!cwd) return null
    const project = projects.find((item) => cwd.startsWith(item.path))
    return project?.displayName || project?.path.split('/').pop() || null
  }, [activeThreadState?.thread?.cwd, projects])

  const isRunning = activeThreadState?.turnStatus === 'running'
  const showTabStrip = threadEntries.length > 1

  const projectCwd = activeThreadState?.thread?.cwd ?? null

  const handleRevealInFinder = useCallback(async () => {
    if (!projectCwd) return
    try {
      const { open } = await import('@tauri-apps/plugin-shell')
      await open(projectCwd)
    } catch (err) {
      console.error('Failed to reveal in Finder:', err)
    }
  }, [projectCwd])

  const handleOpenInTerminal = useCallback(async () => {
    if (!projectCwd) return
    try {
      const { Command } = await import('@tauri-apps/plugin-shell')
      await Command.create('open', ['-a', 'Terminal', projectCwd]).execute()
    } catch (err) {
      console.error('Failed to open in Terminal:', err)
    }
  }, [projectCwd])

  const handleOpenInVSCode = useCallback(async () => {
    if (!projectCwd) return
    try {
      const { Command } = await import('@tauri-apps/plugin-shell')
      await Command.create('code', [projectCwd]).execute()
    } catch (err) {
      console.error('Failed to open in VS Code:', err)
    }
  }, [projectCwd])

  const handleStop = useCallback(() => {
    void useThreadStore.getState().interrupt()
  }, [])

  // Don't render if no threads
  if (threadEntries.length === 0) {
    return null
  }

  return (
    <>
      <div className="h-14 shrink-0 border-b border-stroke/20 bg-background px-5">
        <div className="flex h-full items-center justify-between">
          <div className="flex min-w-0 items-center gap-2 select-none" data-tauri-drag-region>
            <h1 className="truncate text-[15px] font-semibold text-text-1">{sessionTitle}</h1>
            {activeProjectName && (
              <span className="truncate text-[14px] font-semibold text-text-3">{activeProjectName}</span>
            )}
            <button className="text-text-3 transition-colors hover:text-text-1">
              <MoreHorizontal size={15} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeThreadState && (
              <>
                {isRunning ? (
                  <button
                    onClick={handleStop}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-status-error/40 bg-status-error-muted text-status-error transition-colors hover:bg-status-error/20"
                    title="Stop (Esc)"
                  >
                    <Square size={12} />
                  </button>
                ) : (
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stroke/30 bg-surface-solid text-text-2 transition-colors hover:bg-surface-hover/[0.08]"
                    title="Run"
                  >
                    <Play size={12} />
                  </button>
                )}

                <button
                  onClick={onToggleTerminal}
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors',
                    terminalVisible
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-stroke/30 bg-surface-solid text-text-2 hover:bg-surface-hover/[0.08]'
                  )}
                  title="Toggle terminal (\u2318J)"
                >
                  <SquareTerminal size={14} />
                </button>

                <Dropdown.Root>
                  <Dropdown.Trigger className="inline-flex h-8 items-center gap-1.5 rounded-full border border-stroke/30 bg-surface-solid px-3 text-[12px] font-medium text-text-2 transition-colors hover:bg-surface-hover/[0.08]">
                    Open
                    <ChevronDown size={12} />
                  </Dropdown.Trigger>
                  <Dropdown.Content side="bottom" align="end" sideOffset={4}>
                    <Dropdown.Item onClick={() => void handleRevealInFinder()}>
                      <FolderOpen size={14} className="text-text-3" />
                      Reveal in Finder
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => void handleOpenInTerminal()}>
                      <SquareTerminal size={14} className="text-text-3" />
                      Open in Terminal
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => void handleOpenInVSCode()}>
                      <Code2 size={14} className="text-text-3" />
                      Open in VS Code
                    </Dropdown.Item>
                  </Dropdown.Content>
                </Dropdown.Root>

                <button
                  onClick={onOpenCommitDialog}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-stroke/30 bg-surface-solid px-3 text-[12px] font-semibold text-text-1 transition-colors hover:bg-surface-hover/[0.08]"
                >
                  <GitCommit size={12} />
                  Commit
                </button>
              </>
            )}

            <button
              onClick={onToggleRightPanel}
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                rightPanelOpen
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-3 hover:bg-surface-hover/[0.08] hover:text-text-1'
              )}
              title={rightPanelOpen ? 'Hide changes panel' : 'Show changes panel'}
            >
              {rightPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </button>
          </div>
        </div>
      </div>

      {showTabStrip && (
        <div className="flex items-center gap-1 overflow-x-auto border-b border-stroke/20 bg-surface-hover/[0.04] px-3 py-2 backdrop-blur-sm scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/50">
        {threadEntries.map(([threadId, threadState]) => {
          const sessionMeta = sessions.find(s => s.sessionId === threadId)
          return (
            <SessionTab
              key={threadId}
              threadId={threadId}
              threadState={threadState}
              isActive={threadId === focusedThreadId}
              isSwitching={threadId === switchingTabId}
              isGloballyLoading={isLoading}
              onClick={() => handleTabClick(threadId)}
              onClose={(e) => handleCloseClick(e, threadId)}
              sessionTitle={sessionMeta?.title || null}
              sessionTasksJson={sessionMeta?.tasksJson || null}
              sessionStatus={sessionMeta?.status || 'idle'}
            />
          )
        })}

        {canAddSession() && onNewSession && (
          <button
            onClick={handleNewSessionClick}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs',
              'text-text-3 hover:text-text-1 hover:bg-surface-hover/[0.12]',
              'transition-colors duration-150'
            )}
            title={`New Session (${threadEntries.length}/${maxSessions})`}
          >
            <Plus size={14} />
          </button>
        )}

        <span className="ml-auto text-[10px] text-text-3/70 tabular-nums">
          {threadEntries.length}/{maxSessions}
        </span>
        </div>
      )}

      <CloseSessionDialog
        isOpen={closeDialogOpen}
        threadId={threadToClose}
        onClose={() => {
          setCloseDialogOpen(false)
          setThreadToClose(null)
        }}
      />
    </>
  )
}

interface SessionTabProps {
  threadId: string
  threadState: SingleThreadState
  isActive: boolean
  isSwitching: boolean
  isGloballyLoading: boolean
  onClick: () => void
  onClose: (e: React.MouseEvent) => void
  sessionTitle: string | null
  sessionTasksJson: string | null
  sessionStatus: SessionStatus
}

const SessionTab = memo(function SessionTab({
  threadState,
  isActive,
  isSwitching,
  isGloballyLoading,
  onClick,
  onClose,
  sessionTitle,
  sessionTasksJson,
  sessionStatus
}: SessionTabProps) {
  const { thread, turnStatus, pendingApprovals } = threadState

  const project = useProjectsStore((state) =>
    state.projects.find(p => thread.cwd?.startsWith(p.path))
  )

  // Memoize expensive label computation
  const label = useMemo(() =>
    sessionTitle || project?.displayName || thread.cwd?.split('/').pop() || 'Session'
  , [sessionTitle, project?.displayName, thread.cwd])

  const displayLabel = useMemo(() =>
    label.length > 20 ? label.slice(0, 18) + '...' : label
  , [label])

  // Memoize status indicators
  const isRunning = useMemo(() =>
    turnStatus === 'running'
  , [turnStatus])

  const hasPendingApprovals = useMemo(() =>
    pendingApprovals.length > 0
  , [pendingApprovals.length])

  // Wrap handlers in useCallback
  const handleClick = useCallback(() => {
    onClick()
  }, [onClick])

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClose(e)
  }, [onClose])

  // Determine if this tab is in a loading state
  const isLoading = isSwitching || (isGloballyLoading && !isActive)

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium',
        'transition-all duration-150 min-w-[100px] max-w-[200px]',
        'relative overflow-hidden',
        isActive
          ? 'bg-surface-selected/[0.12] text-text-1 border border-stroke/30'
          : 'bg-transparent text-text-3 hover:bg-surface-hover/[0.12] hover:text-text-1 border border-transparent',
        isLoading && 'cursor-not-allowed opacity-70',
        !isLoading && 'cursor-pointer'
      )}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/20 flex items-center justify-center">
          <Loader2 size={14} className="animate-spin text-primary" />
        </div>
      )}

      {/* Status icon */}
      <span className={cn('flex-shrink-0', isLoading && 'opacity-40')}>
        {isRunning ? (
          <Loader2 size={12} className="animate-spin text-blue-500" />
        ) : hasPendingApprovals ? (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
          </span>
        ) : (
          <MessageSquare size={12} />
        )}
      </span>

      {/* Label */}
      <span className={cn('truncate flex-1', isLoading && 'opacity-40')}>{displayLabel}</span>

      {/* Task progress indicator (compact) */}
      <span className={cn(isLoading && 'opacity-40')}>
        <TaskProgressCompact
          tasksJson={sessionTasksJson}
          status={sessionStatus}
        />
      </span>

      {/* Close button */}
      <button
        onClick={handleClose}
        disabled={isLoading}
        className={cn(
          'flex-shrink-0 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          isActive && 'opacity-60',
          isLoading && 'cursor-not-allowed opacity-0'
        )}
        title="Close session"
      >
        <X size={12} />
      </button>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo - pure function without side effects
  return (
    prevProps.threadId === nextProps.threadId &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isSwitching === nextProps.isSwitching &&
    prevProps.isGloballyLoading === nextProps.isGloballyLoading &&
    prevProps.threadState.turnStatus === nextProps.threadState.turnStatus &&
    prevProps.threadState.pendingApprovals.length === nextProps.threadState.pendingApprovals.length &&
    prevProps.threadState.thread.cwd === nextProps.threadState.thread.cwd &&
    prevProps.sessionTitle === nextProps.sessionTitle &&
    prevProps.sessionTasksJson === nextProps.sessionTasksJson &&
    prevProps.sessionStatus === nextProps.sessionStatus
  )
})
