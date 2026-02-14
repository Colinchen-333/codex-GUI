import { useEffect, useRef, useState, useMemo, useCallback, useReducer, type ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ArrowUp, ChevronDown, FolderOpen, GitBranch, GitCommit, Mic, Plus, ShieldAlert, Sparkles, Gamepad2, FileText, Newspaper } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { useProjectsStore } from '../../stores/projects'
import { useThreadStore, selectFocusedThread } from '../../stores/thread'
import { useSessionsStore } from '../../stores/sessions'
import {
  useSettingsStore,
  mergeProjectSettings,
  getEffectiveWorkingDirectory,
} from '../../stores/settings'
import { ChatView } from '../chat/ChatView'
import { logError, parseError } from '../../lib/errorUtils'
import { SessionTabs } from '../sessions/SessionTabs'
import { TerminalPanel } from '../terminal/TerminalPanel'
import { log } from '../../lib/logger'
import { useToast } from '../ui/Toast'
import { cn } from '../../lib/utils'

interface AppShellContext {
  onToggleRightPanel?: () => void
  rightPanelOpen?: boolean
  onOpenCommitDialog?: () => void
}

interface LandingSuggestion {
  icon: ReactNode
  prompt: string
}

const LANDING_SUGGESTIONS: LandingSuggestion[] = [
  { icon: <Gamepad2 size={18} className="text-token-text-tertiary" aria-hidden="true" />, prompt: 'Build a classic Snake game in this repo.' },
  { icon: <FileText size={18} className="text-token-text-tertiary" aria-hidden="true" />, prompt: 'Create a one-page PDF that summarizes this app.' },
  { icon: <Newspaper size={18} className="text-token-text-tertiary" aria-hidden="true" />, prompt: "Summarize last week's PRs by teammate and theme." },
]

// Timeout for resume operations to prevent permanent blocking
const RESUME_TIMEOUT_MS = 30000

type SessionStatus = 'idle' | 'transitioning' | 'resuming'

interface QueuedSessionSwitch {
  sessionId: string
  timestamp: number
}

interface SessionSwitchState {
  status: SessionStatus
  targetSessionId: string | null
  prevSessionId: string | null
  queue: QueuedSessionSwitch[]
  timeoutId: ReturnType<typeof setTimeout> | null
}

type SessionSwitchEvent =
  | { type: 'SELECT_SESSION'; sessionId: string }
  | { type: 'SESSION_ALREADY_LOADED' }
  | { type: 'START_RESUME'; timeoutId: ReturnType<typeof setTimeout> }
  | { type: 'RESUME_COMPLETE'; sessionId: string }
  | { type: 'RESUME_FAILED' }
  | { type: 'RESUME_TIMEOUT' }
  | { type: 'PROCESS_QUEUE' }
  | { type: 'CLEAR_SESSION' }
  | { type: 'CLEANUP' }

const initialSessionState: SessionSwitchState = {
  status: 'idle',
  targetSessionId: null,
  prevSessionId: null,
  queue: [],
  timeoutId: null,
}

function pruneQueuedSessions(queue: QueuedSessionSwitch[]): QueuedSessionSwitch[] {
  const now = Date.now()
  return queue.filter((entry) => now - entry.timestamp <= RESUME_TIMEOUT_MS)
}

function sessionSwitchReducer(
  state: SessionSwitchState,
  event: SessionSwitchEvent
): SessionSwitchState {
  switch (event.type) {
    case 'SELECT_SESSION': {
      const { sessionId } = event
      if (state.prevSessionId === sessionId) {
        return state
      }

      if (state.status !== 'idle') {
        const filteredQueue = state.queue.filter((q) => q.sessionId !== sessionId)
        const prunedQueue = pruneQueuedSessions(filteredQueue)
        return {
          ...state,
          queue: [...prunedQueue, { sessionId, timestamp: Date.now() }],
        }
      }

      return {
        ...state,
        status: 'transitioning',
        targetSessionId: sessionId,
      }
    }

    case 'SESSION_ALREADY_LOADED': {
      return {
        ...state,
        status: 'idle',
        prevSessionId: state.targetSessionId,
      }
    }

    case 'START_RESUME': {
      return {
        ...state,
        status: 'resuming',
        timeoutId: event.timeoutId,
      }
    }

    case 'RESUME_COMPLETE': {
      return {
        ...state,
        status: 'idle',
        prevSessionId: event.sessionId,
        targetSessionId: null,
        timeoutId: null,
      }
    }

    case 'RESUME_FAILED':
    case 'RESUME_TIMEOUT': {
      return {
        ...state,
        status: 'idle',
        targetSessionId: null,
        timeoutId: null,
      }
    }

    case 'PROCESS_QUEUE': {
      const prunedQueue = pruneQueuedSessions(state.queue)
      if (prunedQueue.length === 0 || state.status !== 'idle') {
        return state
      }

      const [next, ...rest] = prunedQueue
      return {
        ...state,
        status: 'transitioning',
        targetSessionId: next.sessionId,
        queue: rest,
      }
    }

    case 'CLEAR_SESSION': {
      return {
        ...state,
        status: 'idle',
        targetSessionId: null,
        prevSessionId: null,
      }
    }

    case 'CLEANUP': {
      return {
        ...initialSessionState,
        timeoutId: null,
      }
    }

    default:
      return state
  }
}

export function MainArea() {
  const selectedProjectId = useProjectsStore((state) => state.selectedProjectId)
  const threads = useThreadStore((state) => state.threads)
  const focusedThreadState = useThreadStore(selectFocusedThread)
  const activeThread = focusedThreadState?.thread ?? null
  const selectedSessionId = useSessionsStore((state) => state.selectedSessionId)
  const settings = useSettingsStore((state) => state.settings)
  const startThread = useThreadStore((state) => state.startThread)
  const canAddSession = useThreadStore((state) => state.canAddSession)
  const context = useOutletContext<AppShellContext>() ?? {}
  const { showToast } = useToast()
  const [terminalVisible, setTerminalVisible] = useState(false)

  const [sessionState, dispatch] = useReducer(sessionSwitchReducer, initialSessionState)
  const sessionStateRef = useRef(sessionState)
  const isMountedRef = useRef(true)

  useEffect(() => {
    sessionStateRef.current = sessionState
  }, [sessionState])

  // Listen for terminal toggle events (from KeyboardShortcuts Cmd+J)
  useEffect(() => {
    const handleToggle = () => setTerminalVisible((prev) => !prev)
    window.addEventListener('codex:toggle-terminal', handleToggle)
    return () => window.removeEventListener('codex:toggle-terminal', handleToggle)
  }, [])

  useEffect(() => {
    if (selectedProjectId) {
      const currentProjects = useProjectsStore.getState().projects
      const project = currentProjects.find((p) => p.id === selectedProjectId)
      if (project) {
        void useProjectsStore.getState().fetchGitInfo(selectedProjectId, project.path)
      }
    }
  }, [selectedProjectId])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (sessionStateRef.current.timeoutId) {
        clearTimeout(sessionStateRef.current.timeoutId)
      }
      dispatch({ type: 'CLEANUP' })
    }
  }, [])

  useEffect(() => {
    const { status, targetSessionId } = sessionState

    if (status !== 'transitioning' || !targetSessionId) {
      return
    }

    const processTransition = async () => {
      const threadState = useThreadStore.getState()
      const isLoaded = !!threadState.threads[targetSessionId]

      if (isLoaded) {
        if (threadState.focusedThreadId !== targetSessionId) {
          threadState.switchThread(targetSessionId)
        }
        dispatch({ type: 'SESSION_ALREADY_LOADED' })
        return
      }

      if (!threadState.canAddSession()) {
        log.warn(`[MainArea] Maximum sessions reached, cannot resume: ${targetSessionId}`, 'MainArea')
        dispatch({ type: 'RESUME_FAILED' })
        return
      }

      const timeoutId = setTimeout(() => {
        log.warn('[MainArea] Resume operation timed out after 30s', 'MainArea')
        if (isMountedRef.current) {
          dispatch({ type: 'RESUME_TIMEOUT' })
        }
      }, RESUME_TIMEOUT_MS)

      dispatch({ type: 'START_RESUME', timeoutId })

      try {
        await useThreadStore.getState().resumeThread(targetSessionId)
        clearTimeout(timeoutId)
        if (isMountedRef.current) {
          dispatch({ type: 'RESUME_COMPLETE', sessionId: targetSessionId })
        }
      } catch (error) {
        clearTimeout(timeoutId)
        logError(error, {
          context: 'MainArea',
          source: 'layout',
          details: 'Failed to resume session',
        })
        if (isMountedRef.current) {
          dispatch({ type: 'RESUME_FAILED' })
        }
      }
    }

    void processTransition()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only specific properties from sessionState are used, not the entire object
  }, [sessionState.status, sessionState.targetSessionId])

  useEffect(() => {
    if (sessionState.status === 'idle' && sessionState.queue.length > 0) {
      const timerId = setTimeout(() => {
        dispatch({ type: 'PROCESS_QUEUE' })
      }, 0)
      return () => clearTimeout(timerId)
    }
  }, [sessionState.status, sessionState.queue])

  useEffect(() => {
    if (!selectedSessionId) {
      dispatch({ type: 'CLEAR_SESSION' })
      return
    }

    dispatch({ type: 'SELECT_SESSION', sessionId: selectedSessionId })
  }, [selectedSessionId])

  const handleNewSession = useCallback(() => {
    if (!selectedProjectId) {
      showToast('Please select a project first', 'error')
      return
    }
    if (!canAddSession()) {
      showToast('Maximum sessions reached. Close one and retry.', 'error')
      return
    }

    const project = useProjectsStore.getState().projects.find((p) => p.id === selectedProjectId)
    if (!project) {
      return
    }

    const effective = mergeProjectSettings(settings, project.settingsJson)
    const cwd = getEffectiveWorkingDirectory(project.path, project.settingsJson)

    void startThread(
      selectedProjectId,
      cwd,
      effective.model,
      effective.sandboxMode,
      effective.approvalPolicy
    ).catch((error) => {
      log.error(`Failed to start new session from tabs: ${error}`, 'MainArea')
      showToast(`Failed to start session: ${parseError(error)}`, 'error')
    })
  }, [canAddSession, selectedProjectId, settings, showToast, startThread])

  // Compute terminal working directory
  const terminalCwd = useMemo(() => {
    if (!selectedProjectId) return ''
    const project = useProjectsStore.getState().projects.find((p) => p.id === selectedProjectId)
    if (!project) return ''
    return getEffectiveWorkingDirectory(project.path, project.settingsJson)
  }, [selectedProjectId])

  const handleToggleTerminal = useCallback(() => {
    setTerminalVisible((prev) => !prev)
  }, [])

  if (!selectedProjectId) {
    return <NewThreadLanding projectId={null} onOpenCommitDialog={context.onOpenCommitDialog} />
  }

  const hasActiveThreads = Object.keys(threads).length > 0

  if (!hasActiveThreads) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <NewThreadLanding projectId={selectedProjectId} onOpenCommitDialog={context.onOpenCommitDialog} />
        {terminalCwd && (
          <TerminalPanel
            cwd={terminalCwd}
            visible={terminalVisible}
            onClose={handleToggleTerminal}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <SessionTabs
        onNewSession={handleNewSession}
        onToggleRightPanel={context.onToggleRightPanel}
        rightPanelOpen={context.rightPanelOpen}
        onOpenCommitDialog={context.onOpenCommitDialog}
        terminalVisible={terminalVisible}
        onToggleTerminal={handleToggleTerminal}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {activeThread ? (
          <ChatView />
        ) : (
          <NewThreadLanding projectId={selectedProjectId} onOpenCommitDialog={context.onOpenCommitDialog} />
        )}

        {terminalCwd && (
          <TerminalPanel
            cwd={terminalCwd}
            visible={terminalVisible}
            onClose={handleToggleTerminal}
          />
        )}
      </div>
    </div>
  )
}

interface NewThreadLandingProps {
  projectId: string | null
  onOpenCommitDialog?: () => void
}

function NewThreadLanding({ projectId, onOpenCommitDialog }: NewThreadLandingProps) {
  const { projects, addProject } = useProjectsStore()
  const settings = useSettingsStore((state) => state.settings)
  const startThread = useThreadStore((state) => state.startThread)
  const sendMessage = useThreadStore((state) => state.sendMessage)
  const canAddSession = useThreadStore((state) => state.canAddSession)
  const maxSessions = useThreadStore((state) => state.maxSessions)
  const isLoading = useThreadStore((state) => state.isLoading)
  const globalError = useThreadStore((state) => state.globalError)
  const { showToast } = useToast()

  const [draft, setDraft] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const draftRef = useRef<HTMLTextAreaElement | null>(null)

  const project = useMemo(
    () => (projectId ? projects.find((item) => item.id === projectId) ?? null : null),
    [projectId, projects]
  )

  const effectiveSettings = useMemo(
    () => mergeProjectSettings(settings, project?.settingsJson ?? null),
    [settings, project?.settingsJson]
  )

  const handleAddProject = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Select Project Folder' })
      if (selected && typeof selected === 'string') {
        await addProject(selected)
      }
    } catch (error) {
      log.error(`Failed to add project from landing: ${error}`, 'MainArea')
      showToast('Failed to add project', 'error')
    }
  }, [addProject, showToast])

  const startSessionWithPrompt = useCallback(
    async (prompt: string) => {
      if (!projectId || !project) {
        await handleAddProject()
        return
      }

      setLocalError(null)

      if (!canAddSession()) {
        setLocalError(`Maximum sessions (${maxSessions}) reached. Close one and retry.`)
        return
      }

      const message = prompt.trim()
      if (!message) {
        showToast('Enter a prompt to start the thread', 'info')
        return
      }

      const cwd = getEffectiveWorkingDirectory(project.path, project.settingsJson)

      try {
        await startThread(
          projectId,
          cwd,
          effectiveSettings.model,
          effectiveSettings.sandboxMode,
          effectiveSettings.approvalPolicy
        )

        const activeThreadId = useThreadStore.getState().activeThread?.id
        if (activeThreadId) {
          await sendMessage(message, undefined, undefined, activeThreadId)
        }

        setDraft('')
      } catch (error) {
        const parsed = parseError(error)
        setLocalError(parsed)
        showToast(`Failed to start thread: ${parsed}`, 'error')
      }
    },
    [
      canAddSession,
      effectiveSettings.approvalPolicy,
      effectiveSettings.model,
      effectiveSettings.sandboxMode,
      handleAddProject,
      maxSessions,
      project,
      projectId,
      sendMessage,
      showToast,
      startThread,
    ]
  )

  const handleSubmitDraft = useCallback(() => {
    void startSessionWithPrompt(draft)
  }, [draft, startSessionWithPrompt])

  const displayProjectName = project?.displayName || project?.path.split('/').pop() || 'Projects'
  const displayError = localError || globalError

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-token-bg-primary">
      <div className="h-12 shrink-0 border-b border-token-border bg-token-surface-tertiary/50 px-6">
        <div className="flex h-full items-center justify-between">
          <h1 className="text-[28px] font-semibold text-token-foreground">New thread</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleAddProject()}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-token-border bg-token-surface-tertiary px-3 text-[12px] font-medium text-token-foreground transition-colors hover:bg-token-list-hover-background"
            >
              <FolderOpen size={13} />
              Open
              <ChevronDown size={12} className="text-token-text-tertiary" />
            </button>
            <button
              type="button"
              onClick={onOpenCommitDialog}
              disabled={!project}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-token-border bg-token-surface-tertiary px-3 text-[12px] font-medium text-token-foreground transition-colors hover:bg-token-list-hover-background disabled:cursor-not-allowed disabled:opacity-40"
            >
              <GitCommit size={13} />
              Commit
              <ChevronDown size={12} className="text-token-text-tertiary" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-[940px]">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-token-border bg-token-surface-tertiary text-token-text-tertiary">
              <Sparkles size={20} />
            </div>
            <h2 className="text-5xl font-bold tracking-tight text-token-foreground">Let's build</h2>
            <button
              type="button"
              onClick={() => {
                if (projectId) {
                  draftRef.current?.focus()
                } else {
                  void handleAddProject()
                }
              }}
              className="mt-1 inline-flex items-center gap-1 text-4xl font-semibold text-token-text-tertiary transition-colors hover:text-token-foreground"
            >
              {displayProjectName}
              <ChevronDown size={22} />
            </button>
          </div>

          <div className="mb-3 text-right text-[13px] font-medium text-token-text-tertiary">Explore more</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {LANDING_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.prompt}
                type="button"
                onClick={() => void startSessionWithPrompt(suggestion.prompt)}
                className="rounded-3xl border border-token-border bg-token-surface-tertiary p-5 text-left transition-colors hover:bg-token-list-hover-background"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-token-border bg-token-bg-primary">
                  {suggestion.icon}
                </div>
                <p className="text-[16px] font-medium leading-7 text-token-foreground">{suggestion.prompt}</p>
              </button>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-token-border bg-token-surface-tertiary p-3 shadow-[var(--shadow-1)]">
            <textarea
              ref={draftRef}
              rows={2}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  handleSubmitDraft()
                }
              }}
              placeholder="Ask Codex anything, @ to add files, / for commands"
              className="w-full resize-none border-0 bg-transparent px-2 py-1 text-[16px] leading-7 text-token-foreground placeholder:text-token-text-tertiary focus:outline-none"
            />

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px]">
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-token-border bg-token-bg-primary px-2.5 text-token-description-foreground transition-colors hover:bg-token-list-hover-background"
                >
                  <Plus size={13} />
                </button>
                <span className="inline-flex h-8 items-center rounded-full border border-token-border bg-token-bg-primary px-3 text-token-description-foreground">
                  GPT-5.3-Codex
                  <ChevronDown size={12} className="ml-1 text-token-text-tertiary" />
                </span>
                <span className="inline-flex h-8 items-center rounded-full border border-token-border bg-token-bg-primary px-3 text-token-description-foreground">
                  Extra High
                  <ChevronDown size={12} className="ml-1 text-token-text-tertiary" />
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-token-border bg-token-bg-primary text-token-description-foreground transition-colors hover:bg-token-list-hover-background hover:text-token-foreground"
                  title="Voice input"
                >
                  <Mic size={15} />
                </button>

                <button
                  type="button"
                  onClick={handleSubmitDraft}
                  disabled={isLoading}
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                    isLoading
                      ? 'cursor-not-allowed bg-token-list-hover-background text-token-text-tertiary'
                      : 'bg-token-foreground text-token-bg-primary hover:bg-token-foreground/85'
                  )}
                  title="Start thread"
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between px-1 text-[12px] text-token-text-tertiary">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                Local
                <ChevronDown size={11} />
              </span>
              <span className="inline-flex items-center gap-1 text-orange-500">
                <ShieldAlert size={11} />
                Full access
              </span>
            </div>
            <span className="inline-flex items-center gap-1">
              <GitBranch size={11} />
              main
              <ChevronDown size={11} />
            </span>
          </div>

          {displayError && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[12px] text-destructive">
              {displayError}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { NewThreadLanding }
