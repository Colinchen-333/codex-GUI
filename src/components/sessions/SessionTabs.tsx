import { useState, memo, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  X,
  Plus,
  MessageSquare,
  Loader2,
  MoreHorizontal,
  ChevronDown,
  GitCommit,
  PanelRightClose,
  PanelRightOpen,
  SquareTerminal,
  FolderOpen,
  Code2,
  Square,
  Download,
  Pencil,
  Copy,
  GitBranch,
  CheckCircle2,
  XCircle,
  CircleSlash2,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { copyTextToClipboard } from '../../lib/clipboard'
import { useAppStore } from '../../stores/app'
import { useThreadStore, type SingleThreadState } from '../../stores/thread'
import { selectAllThreads } from '../../stores/thread/selectors'
import { useProjectsStore } from '../../stores/projects'
import { useSessionsStore } from '../../stores/sessions'
import { openInTerminal, openInVSCode, revealInFinder } from '../../lib/hostActions'
import { APP_EVENTS } from '../../lib/appEvents'
import { isTauriAvailable } from '../../lib/tauri'
import { CloseSessionDialog } from './CloseSessionDialog'
import { PendingApprovalDotButton } from './PendingApprovalDotButton'
import { ExportDialog } from './ExportDialog'
import { TaskProgressCompact } from '../chat/TaskProgress'
import { Dropdown } from '../ui/Dropdown'
import { RenameDialog } from '../ui/RenameDialog'
import { useToast } from '../ui/useToast'
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
  const threadStates = useThreadStore(selectAllThreads)
  const threads = useMemo(() => Object.fromEntries(threadStates.map(t => [t.thread.id, t])), [threadStates])
  const focusedThreadId = useThreadStore((state) => state.focusedThreadId)
  const switchThread = useThreadStore((state) => state.switchThread)
  const canAddSession = useThreadStore((state) => state.canAddSession)
  const maxSessions = useThreadStore((state) => state.maxSessions)
  const isLoading = useThreadStore((state) => state.isLoading)
  const sessions = useSessionsStore((state) => state.sessions)
  const updateSession = useSessionsStore((state) => state.updateSession)
  const projects = useProjectsStore((state) => state.projects)
  const { toast } = useToast()
  const tauriAvailable = isTauriAvailable()

  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [threadToClose, setThreadToClose] = useState<string | null>(null)
  const [switchingTabId, setSwitchingTabId] = useState<string | null>(null)
  const switchingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tabRefMap = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const threadIdsRef = useRef<string[]>([])
  const focusedThreadIdRef = useRef<string | null>(null)
  const switchingTabIdRef = useRef<string | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [threadToExport, setThreadToExport] = useState<string | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [threadToRename, setThreadToRename] = useState<string | null>(null)

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (switchingTimeoutRef.current) {
        clearTimeout(switchingTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleOpenExport = () => {
      const threadId = useThreadStore.getState().focusedThreadId
      if (!threadId) {
        toast.error('No active session')
        return
      }
      setThreadToExport(threadId)
      setExportDialogOpen(true)
    }
    window.addEventListener(APP_EVENTS.OPEN_EXPORT_SESSION, handleOpenExport)
    return () => window.removeEventListener(APP_EVENTS.OPEN_EXPORT_SESSION, handleOpenExport)
  }, [toast])

  useEffect(() => {
    const handleOpenRename = () => {
      const threadId = useThreadStore.getState().focusedThreadId
      if (!threadId) {
        toast.error('No active session')
        return
      }
      setThreadToRename(threadId)
      setRenameDialogOpen(true)
    }
    window.addEventListener(APP_EVENTS.OPEN_RENAME_SESSION, handleOpenRename)
    return () => window.removeEventListener(APP_EVENTS.OPEN_RENAME_SESSION, handleOpenRename)
  }, [toast])

  useEffect(() => {
    const handleOpenClose = () => {
      const threadId = useThreadStore.getState().focusedThreadId
      if (!threadId) {
        toast.error('No active session')
        return
      }
      setThreadToClose(threadId)
      setCloseDialogOpen(true)
    }
    window.addEventListener(APP_EVENTS.OPEN_CLOSE_SESSION, handleOpenClose)
    return () => window.removeEventListener(APP_EVENTS.OPEN_CLOSE_SESSION, handleOpenClose)
  }, [toast])

  useEffect(() => {
    focusedThreadIdRef.current = focusedThreadId
  }, [focusedThreadId])

  useEffect(() => {
    switchingTabIdRef.current = switchingTabId
  }, [switchingTabId])

  const handleTabClick = useCallback((threadId: string) => {
    // Prevent clicking if already switching or if it's the current tab
    if (threadId === focusedThreadIdRef.current || switchingTabIdRef.current !== null) {
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
  }, [switchThread])

  const registerTabRef = useCallback((threadId: string, el: HTMLDivElement | null) => {
    if (el) {
      tabRefMap.current.set(threadId, el)
    } else {
      tabRefMap.current.delete(threadId)
    }
  }, [])

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
  const threadIds = useMemo(() => threadStates.map(t => t.thread.id), [threadStates])

  useEffect(() => {
    threadIdsRef.current = threadIds
  }, [threadIds])

  const activeSession = sessions.find(s => s.sessionId === focusedThreadId)
  const activeThreadState = focusedThreadId ? threads[focusedThreadId] : null
  const sessionTitle = activeSession?.title || activeThreadState?.thread?.cwd?.split('/').pop() || 'New session'
  const activeWorktreeBranch = activeSession?.mode === 'worktree' ? (activeSession.worktreeBranch ?? null) : null
  const activeWorktreePath = activeSession?.mode === 'worktree' ? (activeSession.worktreePath ?? null) : null
  const activeProjectName = useMemo(() => {
    const cwd = activeThreadState?.thread?.cwd
    if (!cwd) return null
    const project = projects.find((item) => cwd.startsWith(item.path))
    return project?.displayName || project?.path.split('/').pop() || null
  }, [activeThreadState?.thread?.cwd, projects])

  const isRunning = activeThreadState?.turnStatus === 'running'
  const showTabStrip = threadEntries.length > 1

  const projectCwd = activeThreadState?.thread?.cwd ?? null

  const requireTauri = useCallback((): boolean => {
    if (isTauriAvailable()) return true
    toast.error('Unavailable in web mode')
    return false
  }, [toast])

  const handleRevealInFinder = useCallback(async () => {
    if (!projectCwd) return
    if (!requireTauri()) return
    try {
      await revealInFinder(projectCwd)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reveal in Finder')
    }
  }, [projectCwd, requireTauri, toast])

  const handleOpenInTerminal = useCallback(async () => {
    if (!projectCwd) return
    if (!requireTauri()) return
    try {
      await openInTerminal(projectCwd)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open in Terminal')
    }
  }, [projectCwd, requireTauri, toast])

  const handleOpenInVSCode = useCallback(async () => {
    if (!projectCwd) return
    if (!requireTauri()) return
    try {
      await openInVSCode(projectCwd)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open in VS Code')
    }
  }, [projectCwd, requireTauri, toast])

  const handleRevealWorktreeInFinder = useCallback(async () => {
    if (!activeWorktreePath) return
    if (!requireTauri()) return
    try {
      await revealInFinder(activeWorktreePath)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reveal worktree in Finder')
    }
  }, [activeWorktreePath, requireTauri, toast])

  const handleOpenWorktreeInTerminal = useCallback(async () => {
    if (!activeWorktreePath) return
    if (!requireTauri()) return
    try {
      await openInTerminal(activeWorktreePath)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open worktree in Terminal')
    }
  }, [activeWorktreePath, requireTauri, toast])

  const handleOpenWorktreeInVSCode = useCallback(async () => {
    if (!activeWorktreePath) return
    if (!requireTauri()) return
    try {
      await openInVSCode(activeWorktreePath)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open worktree in VS Code')
    }
  }, [activeWorktreePath, requireTauri, toast])

  const handleStop = useCallback(() => {
    void useThreadStore.getState().interrupt()
  }, [])

  const handleExportSession = useCallback(() => {
    if (!focusedThreadId) return
    setThreadToExport(focusedThreadId)
    setExportDialogOpen(true)
  }, [focusedThreadId])

  const handleCopySessionId = useCallback(async () => {
    if (!focusedThreadId) return
    try {
      const ok = await copyTextToClipboard(focusedThreadId)
      if (!ok) throw new Error('Clipboard unavailable')
      toast.success('Session ID copied')
    } catch {
      toast.error('Failed to copy session ID')
    }
  }, [focusedThreadId, toast])

  const handleOpenRename = useCallback(() => {
    if (!focusedThreadId) return
    setThreadToRename(focusedThreadId)
    setRenameDialogOpen(true)
  }, [focusedThreadId])

  const handleTabArrowNavigate = useCallback((currentThreadId: string, direction: 'prev' | 'next') => {
    if (switchingTabIdRef.current !== null) return
    const ids = threadIdsRef.current
    if (ids.length < 2) return
    const currentIndex = ids.indexOf(currentThreadId)
    if (currentIndex < 0) return
    const targetIndex =
      direction === 'next'
        ? (currentIndex + 1) % ids.length
        : (currentIndex - 1 + ids.length) % ids.length
    const targetThreadId = ids[targetIndex]
    handleTabClick(targetThreadId)
    window.requestAnimationFrame(() => {
      tabRefMap.current.get(targetThreadId)?.focus()
    })
  }, [handleTabClick])

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
            {activeWorktreeBranch && (
              <span
                className="hidden sm:inline-flex items-center gap-1 rounded-md border border-stroke/20 bg-surface-hover/[0.08] px-2 py-0.5 text-[11px] font-medium text-text-2"
                title={`Worktree branch: ${activeWorktreeBranch}`}
              >
                <GitBranch size={12} className="text-text-3" />
                <span className="max-w-[160px] truncate font-mono">{activeWorktreeBranch}</span>
              </span>
            )}
            <Dropdown.Root>
              <Dropdown.Trigger
                className="text-text-3 transition-colors hover:text-text-1"
                aria-label="Session menu"
                title="Session menu"
              >
                <MoreHorizontal size={15} />
              </Dropdown.Trigger>
              <Dropdown.Content side="bottom" align="start" sideOffset={6}>
                <Dropdown.Item onClick={handleOpenRename} disabled={!focusedThreadId}>
                  <Pencil size={14} className="text-text-3" />
                  Rename session
                </Dropdown.Item>
                <Dropdown.Item onClick={handleExportSession} disabled={!focusedThreadId}>
                  <Download size={14} className="text-text-3" />
                  Export session
                </Dropdown.Item>
                <Dropdown.Item onClick={() => void handleCopySessionId()} disabled={!focusedThreadId}>
                  <Copy size={14} className="text-text-3" />
                  Copy session id
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Root>
          </div>

          <div className="flex items-center gap-2">
            {activeThreadState && (
              <>
                {isRunning && (
                  <button
                    onClick={handleStop}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-status-error/40 bg-status-error-muted text-status-error transition-colors hover:bg-status-error/20"
                    title="Stop (Esc)"
                  >
                    <Square size={12} />
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
                    <Dropdown.Item onClick={() => void handleRevealInFinder()} disabled={!tauriAvailable}>
                      <FolderOpen size={14} className="text-text-3" />
                      Reveal in Finder
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => void handleOpenInTerminal()} disabled={!tauriAvailable}>
                      <SquareTerminal size={14} className="text-text-3" />
                      Open in Terminal
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => void handleOpenInVSCode()} disabled={!tauriAvailable}>
                      <Code2 size={14} className="text-text-3" />
                      Open in VS Code
                    </Dropdown.Item>
                    {activeWorktreePath && (
                      <>
                        <Dropdown.Separator />
                        <Dropdown.Item onClick={() => void handleRevealWorktreeInFinder()} disabled={!tauriAvailable}>
                          <FolderOpen size={14} className="text-text-3" />
                          Reveal worktree in Finder
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => void handleOpenWorktreeInTerminal()} disabled={!tauriAvailable}>
                          <SquareTerminal size={14} className="text-text-3" />
                          Open worktree in Terminal
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => void handleOpenWorktreeInVSCode()} disabled={!tauriAvailable}>
                          <Code2 size={14} className="text-text-3" />
                          Open worktree in VS Code
                        </Dropdown.Item>
                      </>
                    )}
                  </Dropdown.Content>
                </Dropdown.Root>

                <button
                  onClick={onOpenCommitDialog}
                  disabled={!tauriAvailable}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-stroke/30 bg-surface-solid px-3 text-[12px] font-semibold text-text-1 transition-colors hover:bg-surface-hover/[0.08]"
                  title={tauriAvailable ? undefined : 'Unavailable in web mode'}
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
        <div
          className="flex items-center gap-1 overflow-x-auto border-b border-stroke/20 bg-surface-hover/[0.04] px-3 py-2 backdrop-blur-sm scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/50"
          role="tablist"
          aria-label="Sessions"
        >
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
              onArrowNavigate={handleTabArrowNavigate}
              registerTabRef={registerTabRef}
              sessionTitle={sessionMeta?.title || null}
              sessionTasksJson={sessionMeta?.tasksJson || null}
              sessionStatus={sessionMeta?.status || 'idle'}
              sessionMode={sessionMeta?.mode || null}
              worktreeBranch={sessionMeta?.worktreeBranch || null}
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

      <ExportDialog
        isOpen={exportDialogOpen}
        threadId={threadToExport}
        onClose={() => {
          setExportDialogOpen(false)
          setThreadToExport(null)
        }}
      />

      <RenameDialog
        isOpen={renameDialogOpen}
        title="Rename session"
        currentName={activeSession?.title || sessionTitle}
        onCancel={() => {
          setRenameDialogOpen(false)
          setThreadToRename(null)
        }}
        onConfirm={(newName) => {
          const targetId = threadToRename
          setRenameDialogOpen(false)
          setThreadToRename(null)
          if (!targetId) return
          void updateSession(targetId, { title: newName })
            .then(() => toast.success('Session renamed'))
            .catch(() => toast.error('Failed to rename session'))
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
  onArrowNavigate: (currentThreadId: string, direction: 'prev' | 'next') => void
  registerTabRef: (threadId: string, el: HTMLDivElement | null) => void
  sessionTitle: string | null
  sessionTasksJson: string | null
  sessionStatus: SessionStatus
  sessionMode: 'local' | 'worktree' | null
  worktreeBranch: string | null
}

const SessionTab = memo(function SessionTab({
  threadId,
  threadState,
  isActive,
  isSwitching,
  isGloballyLoading,
  onClick,
  onClose,
  onArrowNavigate,
  registerTabRef,
  sessionTitle,
  sessionTasksJson,
  sessionStatus,
  sessionMode,
  worktreeBranch
}: SessionTabProps) {
  const { thread, turnStatus, pendingApprovals } = threadState
  const setScrollToItemId = useAppStore((state) => state.setScrollToItemId)

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

  const nextPendingApproval = useMemo(() => {
    if (pendingApprovals.length === 0) return null
    let earliest = pendingApprovals[0]
    for (let i = 1; i < pendingApprovals.length; i++) {
      const candidate = pendingApprovals[i]
      if (candidate.createdAt < earliest.createdAt) {
        earliest = candidate
      }
    }
    return earliest
  }, [pendingApprovals])

  const handleJumpToPendingApproval = useCallback(() => {
    if (!nextPendingApproval) return
    setScrollToItemId(nextPendingApproval.itemId)
    handleClick()
  }, [nextPendingApproval, setScrollToItemId, handleClick])

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClose(e)
  }, [onClose])

  // Determine if this tab is in a loading state
  const isLoading = isSwitching || (isGloballyLoading && !isActive)

  const branchLabel = useMemo(() => {
    if (sessionMode !== 'worktree') return null
    const branch = worktreeBranch?.trim()
    return branch || 'worktree'
  }, [sessionMode, worktreeBranch])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    if (isLoading) return

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onArrowNavigate(threadId, 'prev')
      return
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      onArrowNavigate(threadId, 'next')
      return
    }
  }, [handleClick, isLoading, onArrowNavigate, threadId])

  return (
    <div
      onClick={handleClick}
      ref={(node) => registerTabRef(threadId, node)}
      data-thread-id={threadId}
      role="tab"
      aria-selected={isActive}
      aria-disabled={isLoading}
      tabIndex={isLoading ? -1 : isActive ? 0 : -1}
      onKeyDown={handleKeyDown}
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
          <Loader2 size={12} className="animate-spin text-status-info" />
        ) : hasPendingApprovals ? (
          <PendingApprovalDotButton
            count={pendingApprovals.length}
            disabled={isLoading}
            onJump={handleJumpToPendingApproval}
          />
        ) : sessionStatus === 'completed' ? (
          <CheckCircle2 size={12} className="text-status-success" />
        ) : sessionStatus === 'failed' ? (
          <XCircle size={12} className="text-status-error" />
        ) : sessionStatus === 'interrupted' ? (
          <CircleSlash2 size={12} className="text-status-warning" />
        ) : (
          <MessageSquare size={12} />
        )}
      </span>

      {/* Label */}
      <span className={cn('truncate flex-1', isLoading && 'opacity-40')}>{displayLabel}</span>

      {branchLabel && (
        <span
          className={cn(
            'hidden sm:inline-flex items-center gap-1 rounded-md border border-stroke/20 bg-surface-hover/[0.06] px-1.5 py-0.5',
            isLoading && 'opacity-40'
          )}
          title={`Worktree: ${branchLabel}`}
        >
          <GitBranch size={12} className="text-text-3" />
          <span className="max-w-[96px] truncate font-mono text-[10px] text-text-2">{branchLabel}</span>
        </span>
      )}

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
    getPendingApprovalsKey(prevProps.threadState.pendingApprovals) === getPendingApprovalsKey(nextProps.threadState.pendingApprovals) &&
    prevProps.threadState.thread.cwd === nextProps.threadState.thread.cwd &&
    prevProps.sessionTitle === nextProps.sessionTitle &&
    prevProps.sessionTasksJson === nextProps.sessionTasksJson &&
    prevProps.sessionStatus === nextProps.sessionStatus &&
    prevProps.sessionMode === nextProps.sessionMode &&
    prevProps.worktreeBranch === nextProps.worktreeBranch
  )
})

function getPendingApprovalsKey(approvals: { createdAt: number, itemId: string }[]) {
  if (approvals.length === 0) return '0'
  let earliest = approvals[0]
  for (let i = 1; i < approvals.length; i++) {
    const candidate = approvals[i]
    if (candidate.createdAt < earliest.createdAt) {
      earliest = candidate
    }
  }
  return `${approvals.length}:${earliest.createdAt}:${earliest.itemId}`
}
