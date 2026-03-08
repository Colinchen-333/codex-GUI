import { memo, useMemo, useState, useCallback, type CSSProperties } from 'react'
import { ChevronDown, Folder, MessageSquare, Settings, Pin, PinOff, MailOpen, ArrowRight } from 'lucide-react'
import { List } from 'react-window'
import { cn, formatSessionTime } from '../../../lib/utils'
import { useProjectsStore } from '../../../stores/projects'
import { useSessionsStore } from '../../../stores/sessions'
import type { Session } from './SessionList'
import { IconButton } from '../../ui/IconButton'
import { ContextMenu, type ContextMenuItem } from '../../ui/ContextMenu'
import { useToast } from '../../ui/Toast'

const UNREAD_STORAGE_KEY = 'codex:unread-sessions'

function readUnreadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(UNREAD_STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function writeUnreadSet(set: Set<string>): void {
  try {
    localStorage.setItem(UNREAD_STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    // localStorage unavailable — state lives in memory
  }
}

/** Hook that manages the unread sessions set in localStorage */
function useUnreadSessions() {
  const [unread, setUnread] = useState<Set<string>>(() => readUnreadSet())

  const markUnread = useCallback((sessionId: string) => {
    setUnread((prev) => {
      const next = new Set(prev)
      next.add(sessionId)
      writeUnreadSet(next)
      return next
    })
  }, [])

  const markRead = useCallback((sessionId: string) => {
    setUnread((prev) => {
      if (!prev.has(sessionId)) return prev
      const next = new Set(prev)
      next.delete(sessionId)
      writeUnreadSet(next)
      return next
    })
  }, [])

  const isUnread = useCallback((sessionId: string) => unread.has(sessionId), [unread])

  return { markUnread, markRead, isUnread }
}

interface GroupedSessionListProps {
  sessions: Session[]
  selectedSessionId: string | null
  onSelectSession: (sessionId: string | null, projectId?: string) => void
  onOpenProjectSettings?: (projectId: string) => void
  isLoading: boolean
  onToggleFavorite?: (sessionId: string, current: boolean) => void
}

interface ProjectGroup {
  projectId: string
  projectName: string
  sessions: Session[]
}

/** A flattened row: either a project group header or a session item */
type FlatRow =
  | { type: 'header'; group: ProjectGroup; isExpanded: boolean }
  | { type: 'session'; session: Session; isSelected: boolean; displayName: string; timeStr: string; isRunning: boolean; isUnread: boolean }
  | { type: 'empty'; projectId: string }

const HEADER_HEIGHT = 36
const SESSION_HEIGHT = 32
const EMPTY_HEIGHT = 28

/** Threshold: only virtualize when there are many rows */
const VIRTUALIZATION_THRESHOLD = 50

/** Props passed via rowProps to each virtualized row */
interface GroupedRowCustomProps {
  flatRows: FlatRow[]
  onToggleProject: (projectId: string) => void
  onSelectSession: (sessionId: string | null, projectId?: string) => void
  onOpenProjectSettings?: (projectId: string) => void
  onToggleFavorite?: (sessionId: string, current: boolean) => void
  onMarkUnread: (sessionId: string) => void
  onMarkRead: (sessionId: string) => void
  onShowToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void
}

function GroupedRowComponent({
  index,
  style,
  flatRows,
  onToggleProject,
  onSelectSession,
  onOpenProjectSettings,
  onToggleFavorite,
  onMarkUnread,
  onMarkRead,
  onShowToast,
}: {
  index: number
  style: CSSProperties
  ariaAttributes: {
    'aria-posinset': number
    'aria-setsize': number
    role: 'listitem'
  }
} & GroupedRowCustomProps) {
  const row = flatRows[index]

  if (row.type === 'header') {
    const { group, isExpanded } = row
    return (
      <div style={style}>
        <div className="flex h-9 w-full items-center rounded-md transition-colors hover:bg-surface-hover/[0.06]">
          <button
            type="button"
            onClick={() => onToggleProject(group.projectId)}
            className="flex h-9 flex-1 items-center gap-1.5 px-2.5 text-left"
          >
            <span
              className="text-text-3 transition-transform duration-200"
              style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
            >
              <ChevronDown size={14} />
            </span>
            <Folder size={15} className="text-text-2" />
            <span className="flex-1 truncate text-[14px] font-semibold text-text-1">{group.projectName}</span>
            <span className="text-[11px] text-text-3">{group.sessions.length}</span>
          </button>
          {onOpenProjectSettings && (
            <IconButton
              size="sm"
              variant="ghost"
              className="mr-1 h-7 w-7 text-text-3 hover:bg-surface-hover/[0.06] hover:text-text-1"
              title="Project Settings"
              aria-label="Project Settings"
              onClick={() => onOpenProjectSettings(group.projectId)}
            >
              <Settings size={14} />
            </IconButton>
          )}
        </div>
      </div>
    )
  }

  if (row.type === 'empty') {
    return (
      <div style={style}>
        <div className="rounded-md px-2.5 py-1.5 text-[12px] text-text-3 pl-5">No sessions yet</div>
      </div>
    )
  }

  // session row
  const { session, isSelected, displayName, timeStr, isRunning, isUnread } = row

  const contextMenuItems: ContextMenuItem[] = [
    {
      label: session.isFavorite ? 'Unpin thread' : 'Pin thread',
      icon: session.isFavorite ? <PinOff size={14} /> : <Pin size={14} />,
      onClick: () => onToggleFavorite?.(session.sessionId, session.isFavorite),
      disabled: !onToggleFavorite,
    },
    {
      label: 'Mark as unread',
      icon: <MailOpen size={14} />,
      onClick: () => onMarkUnread(session.sessionId),
    },
    {
      label: 'Move to local',
      icon: <ArrowRight size={14} />,
      onClick: () => onShowToast('Move to local — coming soon', 'info'),
    },
    {
      label: 'Move to worktree',
      icon: <ArrowRight size={14} />,
      onClick: () => onShowToast('Move to worktree — coming soon', 'info'),
    },
  ]

  return (
    <div style={style}>
      <div className="pl-5">
        <ContextMenu items={contextMenuItems}>
          <button
            onClick={() => {
              onMarkRead(session.sessionId)
              onSelectSession(session.sessionId, session.projectId)
            }}
            className={cn(
              'flex w-full items-center gap-2 rounded-2xl px-2.5 py-1.5 text-left transition-colors',
              isSelected
                ? 'bg-surface-hover/[0.08] text-text-1'
                : 'text-text-2 hover:bg-surface-hover/[0.06]'
            )}
          >
            {session.isFavorite && (
              <Pin size={10} className="shrink-0 text-text-3 fill-text-3/50" strokeWidth={1.5} />
            )}
            {isUnread && !isSelected && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
            )}
            <span className={cn(
              'min-w-0 flex-1 truncate text-[15px] leading-6',
              isSelected ? 'font-semibold text-text-1' : 'font-medium',
              isUnread && !isSelected && 'font-semibold text-text-1'
            )}>
              {displayName}
            </span>

            {isRunning && <span className="thinking-indicator shrink-0" />}

            {timeStr && (
              <span className="shrink-0 text-[12px] text-text-3">{timeStr}</span>
            )}
          </button>
        </ContextMenu>
      </div>
    </div>
  )
}

export const GroupedSessionList = memo(function GroupedSessionList({
  sessions,
  selectedSessionId,
  onSelectSession,
  onOpenProjectSettings,
  isLoading,
  onToggleFavorite,
}: GroupedSessionListProps) {
  const { projects } = useProjectsStore()
  const { getSessionDisplayName } = useSessionsStore()
  const { showToast } = useToast()
  const { markUnread, markRead, isUnread } = useUnreadSessions()
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(projects.map((p) => p.id)))

  const groupedSessions = useMemo(() => {
    const groups: Record<string, ProjectGroup> = {}

    for (const project of projects) {
      groups[project.id] = {
        projectId: project.id,
        projectName: project.displayName || project.path.split('/').pop() || 'Unknown',
        sessions: [],
      }
    }

    for (const session of sessions) {
      if (groups[session.projectId]) {
        groups[session.projectId].sessions.push(session)
      }
    }

    return Object.values(groups).map((group) => ({
      ...group,
      sessions: [...group.sessions].sort((a, b) => {
        if (a.status === 'running' && b.status !== 'running') return -1
        if (a.status !== 'running' && b.status === 'running') return 1
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
        const timeA = a.lastAccessedAt || a.createdAt
        const timeB = b.lastAccessedAt || b.createdAt
        return timeB - timeA
      }),
    }))
  }, [projects, sessions])

  const hasAnySessions = sessions.length > 0

  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }, [])

  /** Flatten groups into a single list for virtualization */
  const flatRows = useMemo((): FlatRow[] => {
    const rows: FlatRow[] = []
    for (const group of groupedSessions) {
      const isExpanded = expandedProjects.has(group.projectId)
      rows.push({ type: 'header', group, isExpanded })
      if (isExpanded) {
        if (group.sessions.length === 0) {
          rows.push({ type: 'empty', projectId: group.projectId })
        } else {
          for (const session of group.sessions) {
            const isSelected = selectedSessionId === session.sessionId
            const displayName = getSessionDisplayName(session)
            const timestamp = session.lastAccessedAt || session.createdAt
            const timeStr = formatSessionTime(timestamp)
            const isRunning = session.status === 'running'
            const unread = isUnread(session.sessionId)
            rows.push({ type: 'session', session, isSelected, displayName, timeStr, isRunning, isUnread: unread })
          }
        }
      }
    }
    return rows
  }, [groupedSessions, expandedProjects, selectedSessionId, getSessionDisplayName, isUnread])

  const shouldVirtualize = flatRows.length > VIRTUALIZATION_THRESHOLD

  const getRowHeight = useCallback((index: number): number => {
    const row = flatRows[index]
    if (row.type === 'header') return HEADER_HEIGHT
    if (row.type === 'empty') return EMPTY_HEIGHT
    return SESSION_HEIGHT
  }, [flatRows])

  const rowProps: GroupedRowCustomProps = useMemo(
    () => ({
      flatRows,
      onToggleProject: toggleProject,
      onSelectSession,
      onOpenProjectSettings,
      onToggleFavorite,
      onMarkUnread: markUnread,
      onMarkRead: markRead,
      onShowToast: showToast,
    }),
    [flatRows, toggleProject, onSelectSession, onOpenProjectSettings, onToggleFavorite, markUnread, markRead, showToast]
  )

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-text-3">
        <div className="mr-2 animate-spin">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        Loading...
      </div>
    )
  }

  if (!hasAnySessions) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-surface-hover/[0.12] text-text-3">
            <MessageSquare size={16} className="text-text-2" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-text-2">No sessions yet</p>
          <p className="text-xs text-text-3">Start a new session to begin</p>
        </div>
      </div>
    )
  }

  if (shouldVirtualize) {
    return (
      <div className="h-full min-h-0 flex-1 pb-2">
        <List<GroupedRowCustomProps>
          style={{ height: '100%', width: '100%' }}
          rowCount={flatRows.length}
          rowHeight={getRowHeight}
          rowProps={rowProps}
          rowComponent={GroupedRowComponent}
          overscanCount={8}
          defaultHeight={SESSION_HEIGHT * 10}
        />
      </div>
    )
  }

  // Non-virtualized rendering for small lists
  return (
    <div className="space-y-3 pb-2">
      {groupedSessions.map((group) => {
        const isExpanded = expandedProjects.has(group.projectId)
        return (
          <div key={group.projectId}>
            <div className="flex h-9 w-full items-center rounded-md transition-colors hover:bg-surface-hover/[0.06]">
              <button
                type="button"
                onClick={() => toggleProject(group.projectId)}
                className="flex h-9 flex-1 items-center gap-1.5 px-2.5 text-left"
              >
                <span
                  className="text-text-3 transition-transform duration-200"
                  style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                >
                  <ChevronDown size={14} />
                </span>
                <Folder size={15} className="text-text-2" />
                <span className="flex-1 truncate text-[14px] font-semibold text-text-1">{group.projectName}</span>
                <span className="text-[11px] text-text-3">{group.sessions.length}</span>
              </button>
              {onOpenProjectSettings && (
                <IconButton
                  size="sm"
                  variant="ghost"
                  className="mr-1 h-7 w-7 text-text-3 hover:bg-surface-hover/[0.06] hover:text-text-1"
                  title="Project Settings"
                  aria-label="Project Settings"
                  onClick={() => onOpenProjectSettings(group.projectId)}
                >
                  <Settings size={14} />
                </IconButton>
              )}
            </div>

            {isExpanded && (
              <div className="mt-1 space-y-0.5 pl-5">
                {group.sessions.length === 0 && (
                  <div className="rounded-md px-2.5 py-1.5 text-[12px] text-text-3">No sessions yet</div>
                )}

                {group.sessions.map((session) => {
                  const isSelected = selectedSessionId === session.sessionId
                  const displayName = getSessionDisplayName(session)
                  const timestamp = session.lastAccessedAt || session.createdAt
                  const timeStr = formatSessionTime(timestamp)
                  const isRunning = session.status === 'running'
                  const unread = isUnread(session.sessionId)

                  const items: ContextMenuItem[] = [
                    {
                      label: session.isFavorite ? 'Unpin thread' : 'Pin thread',
                      icon: session.isFavorite ? <PinOff size={14} /> : <Pin size={14} />,
                      onClick: () => onToggleFavorite?.(session.sessionId, session.isFavorite),
                      disabled: !onToggleFavorite,
                    },
                    {
                      label: 'Mark as unread',
                      icon: <MailOpen size={14} />,
                      onClick: () => markUnread(session.sessionId),
                    },
                    {
                      label: 'Move to local',
                      icon: <ArrowRight size={14} />,
                      onClick: () => showToast('Move to local — coming soon', 'info'),
                    },
                    {
                      label: 'Move to worktree',
                      icon: <ArrowRight size={14} />,
                      onClick: () => showToast('Move to worktree — coming soon', 'info'),
                    },
                  ]

                  return (
                    <ContextMenu key={session.sessionId} items={items}>
                      <button
                        onClick={() => {
                          markRead(session.sessionId)
                          onSelectSession(session.sessionId, session.projectId)
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-2xl px-2.5 py-1.5 text-left transition-colors',
                          isSelected
                            ? 'bg-surface-hover/[0.08] text-text-1'
                            : 'text-text-2 hover:bg-surface-hover/[0.06]'
                        )}
                      >
                        {session.isFavorite && (
                          <Pin size={10} className="shrink-0 text-text-3 fill-text-3/50" strokeWidth={1.5} />
                        )}
                        {unread && !isSelected && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                        )}
                        <span className={cn(
                          'min-w-0 flex-1 truncate text-[15px] leading-6',
                          isSelected ? 'font-semibold text-text-1' : 'font-medium',
                          unread && !isSelected && 'font-semibold text-text-1'
                        )}>
                          {displayName}
                        </span>

                        {isRunning && <span className="thinking-indicator shrink-0" />}

                        {timeStr && (
                          <span className="shrink-0 text-[12px] text-text-3">{timeStr}</span>
                        )}
                      </button>
                    </ContextMenu>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
})
