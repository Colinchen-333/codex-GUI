import { memo, useMemo, useCallback } from 'react'
import { Star, Pin, PinOff, Archive, Pencil, Trash2, Copy } from 'lucide-react'
import { List } from 'react-window'
import { AutoSizer } from 'react-virtualized-auto-sizer'
import { cn, formatAbsoluteTime } from '../../../lib/utils'
import type { SessionStatus } from '../../../lib/api'
import { useSessionsStore } from '../../../stores/sessions'
import { useProjectsStore } from '../../../stores/projects'
import { ContextMenu, type ContextMenuItem } from '../../ui/ContextMenu'
import { StatusIcon, getStatusLabel } from '../../ui/StatusIndicator'
import { TaskProgressIndicator } from '../../chat/TaskProgress'

export interface Session {
  sessionId: string
  projectId: string
  title: string | null
  tags: string | null
  isFavorite: boolean
  isArchived: boolean
  lastAccessedAt: number | null
  createdAt: number
  status: SessionStatus
  firstMessage: string | null
  tasksJson: string | null
}

export interface SessionListProps {
  sessions: Session[]
  selectedId: string | null
  /** onSelect receives sessionId and optionally projectId (for cross-project switching in global search) */
  onSelect: (id: string | null, projectId?: string) => void
  onToggleFavorite: (sessionId: string, isFavorite: boolean) => void
  onRename: (sessionId: string, currentTitle: string) => void
  onArchive: (sessionId: string, sessionName: string) => void
  onDelete: (sessionId: string, sessionName: string) => void
  isLoading: boolean
  hasProject: boolean
  isGlobalSearch?: boolean
  /**
   * Threshold for enabling virtualization.
   * Virtualization is only enabled when the number of sessions exceeds this value.
   * This avoids virtualization overhead for small lists while providing performance
   * benefits for large lists.
   */
  virtualizationThreshold?: number
}

/**
 * P0 Fix: SessionRow component props for react-window v2
 */
interface SessionRowCustomProps {
  sessions: Session[]
  selectedId: string | null
  onSelect: (id: string | null, projectId?: string) => void
  onToggleFavorite: (sessionId: string, isFavorite: boolean) => void
  onRename: (sessionId: string, currentTitle: string) => void
  onArchive: (sessionId: string, sessionName: string) => void
  onDelete: (sessionId: string, sessionName: string) => void
  getSessionDisplayName: (session: Session) => string
  getProjectName: (projectId: string) => string | null
  getProjectPath: (projectId: string) => string | null
  isGlobalSearch: boolean
}

// Full props including react-window v2's injected props
interface SessionRowProps extends SessionRowCustomProps {
  index: number
  style: React.CSSProperties
  ariaAttributes: {
    'aria-posinset': number
    'aria-setsize': number
    role: 'listitem'
  }
}

function SessionRowInner({
  index,
  style,
  ariaAttributes,
  sessions,
  selectedId,
  onSelect,
  onToggleFavorite,
  onRename,
  onArchive,
  onDelete,
  getSessionDisplayName,
  getProjectName,
  getProjectPath,
  isGlobalSearch,
}: SessionRowProps) {
  const session = sessions[index]
  const displayName = getSessionDisplayName(session)
  const timestamp = session.lastAccessedAt || session.createdAt
  const timeStr = formatAbsoluteTime(timestamp)
  const statusLabel = getStatusLabel(session.status)
  const isRunning = session.status === 'running'
  const isSelected = selectedId === session.sessionId
  const projectName = isGlobalSearch ? getProjectName(session.projectId) : null

  const projectPath = getProjectPath(session.projectId)
  const contextMenuItems: ContextMenuItem[] = [
    {
      label: session.isFavorite ? 'Unpin thread' : 'Pin thread',
      icon: session.isFavorite ? <PinOff size={14} /> : <Pin size={14} />,
      onClick: () => onToggleFavorite(session.sessionId, session.isFavorite),
    },
    {
      label: 'Rename thread',
      icon: <Pencil size={14} />,
      onClick: () => onRename(session.sessionId, displayName),
    },
    {
      label: 'Archive thread',
      icon: <Archive size={14} />,
      onClick: () => onArchive(session.sessionId, displayName),
    },
    ...(projectPath
      ? [
          {
            label: 'Copy working directory',
            icon: <Copy size={14} />,
            onClick: () => void navigator.clipboard?.writeText(projectPath),
          },
        ]
      : []),
    {
      label: 'Copy session id',
      icon: <Copy size={14} />,
      onClick: () => void navigator.clipboard?.writeText(session.sessionId),
    },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      onClick: () => onDelete(session.sessionId, displayName),
      variant: 'danger',
    },
  ]

  return (
    <div style={style} className="px-1" {...ariaAttributes}>
      <ContextMenu items={contextMenuItems}>
        <button
          className={cn(
            'group w-full h-12 rounded-md px-3 py-1.5 text-left transition-colors relative overflow-hidden flex flex-col justify-center',
            isSelected
              ? 'bg-surface-selected/[0.08] text-text-1'
              : 'text-text-1 hover:bg-surface-hover/[0.06]',
            isRunning &&
              !isSelected &&
              'border border-stroke/40 bg-surface-hover/[0.12]'
          )}
          onClick={() => onSelect(session.sessionId, isGlobalSearch ? session.projectId : undefined)}
          role="option"
          aria-selected={isSelected}
        >
          {/* First row: Status icon + Session name + Task progress */}
          <div className="flex items-center gap-2">
            <StatusIcon status={session.status} />
            {session.isFavorite && (
              <Star size={12} className="text-text-3 flex-shrink-0 fill-text-3/70" />
            )}
            <span className={cn("truncate text-[14px] leading-tight flex-1", isSelected ? "font-semibold" : "font-medium")}>{displayName}</span>
            <TaskProgressIndicator tasksJson={session.tasksJson} status={session.status} />
          </div>
          {/* Second row: Status label + Timestamp + Project name */}
          <div className="flex items-center gap-1.5 mt-0.5 text-[12px] leading-tight">
            <span
              className={cn(
                'text-text-3 transition-colors',
                isSelected && 'text-text-2'
              )}
            >
              {statusLabel}
            </span>
            {timeStr && (
              <>
                <span
                  className={cn(
                    'text-text-3/70',
                    isSelected && 'text-text-3/80'
                  )}
                >
                  ·
                </span>
                <span
                  className={cn(
                    'text-text-3',
                    isSelected && 'text-text-2'
                  )}
                >
                  {timeStr}
                </span>
              </>
            )}
            {projectName && (
              <>
                <span
                  className={cn(
                    'text-text-3/70',
                    isSelected && 'text-text-3/80'
                  )}
                >
                  ·
                </span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded bg-surface-hover/[0.12] text-text-3 truncate max-w-[80px]',
                    isSelected && 'bg-surface-hover/[0.18] text-text-2'
                  )}
                >
                  {projectName}
                </span>
              </>
            )}
          </div>
        </button>
      </ContextMenu>
    </div>
  )
}

/**
 * SessionList - Displays sorted list of sessions with context menu actions
 *
 * Features:
 * - Sorted by: running first, then favorites, then by last accessed time
 * - Context menu for rename, toggle favorite, delete
 * - Status indicator with label
 * - Task progress display
 * - Project name badge in global search mode
 * - Loading and empty states
 * - Optimized with React.memo and useMemo for sorting
 * - Virtualized rendering for large lists using react-window
 */
export const SessionList = memo(function SessionList({
  sessions,
  selectedId,
  onSelect,
  onToggleFavorite,
  onRename,
  onDelete,
  isLoading,
  hasProject,
  isGlobalSearch,
  // P0 Fix: Temporarily disable virtualization (set high threshold) until layout issues are resolved
  // The parent container uses overflow-y-auto which conflicts with AutoSizer's height measurement
  virtualizationThreshold = 1000,
}: SessionListProps) {
  // Hooks must be called unconditionally at the top
  const { getSessionDisplayName } = useSessionsStore()
  const { projects } = useProjectsStore()

  // Helper to get project display name by ID (for global search results)
  const getProjectName = useCallback(
    (projectId: string): string | null => {
      const project = projects.find((p) => p.id === projectId)
      if (!project) return null
      return project.displayName || project.path.split('/').pop() || null
    },
    [projects]
  )

  const getProjectPath = useCallback(
    (projectId: string): string | null => {
      const project = projects.find((p) => p.id === projectId)
      return project?.path ?? null
    },
    [projects]
  )

  // Memoize sorted sessions to avoid recalculating on every render
  // Sort order: running first, then favorites, then by last accessed or created time
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      // Running sessions always first
      if (a.status === 'running' && b.status !== 'running') return -1
      if (a.status !== 'running' && b.status === 'running') return 1
      // Then favorites
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1
      }
      // Then by time
      const timeA = a.lastAccessedAt || a.createdAt
      const timeB = b.lastAccessedAt || b.createdAt
      return timeB - timeA
    })
  }, [sessions])

  // P0 Fix: Enable virtualization for large lists
  const shouldVirtualize = sortedSessions.length > virtualizationThreshold

  // Memoize row props to prevent re-renders (react-window v2 API)
  const rowProps: SessionRowCustomProps = useMemo(
    () => ({
      sessions: sortedSessions,
      selectedId,
      onSelect,
      onToggleFavorite,
      onRename,
      onArchive,
      onDelete,
      getSessionDisplayName,
      getProjectName,
      getProjectPath,
      isGlobalSearch: !!isGlobalSearch,
    }),
    [
      sortedSessions,
      selectedId,
      onSelect,
      onToggleFavorite,
      onRename,
      onArchive,
      onDelete,
      getSessionDisplayName,
      getProjectName,
      getProjectPath,
      isGlobalSearch,
    ]
  )

  // Row height: 80px per row (consistent height)
  const rowHeight = 48

  // Render non-virtualized list for small datasets
  const renderStandardList = () => {
    return (
      <div
        className="space-y-0.5"
        role="listbox"
        aria-label="Sessions list"
        id="sessions-panel"
        aria-labelledby="sessions-tab"
      >
        {sortedSessions.map((session) => {
          const displayName = getSessionDisplayName(session)
          const timestamp = session.lastAccessedAt || session.createdAt
          const timeStr = formatAbsoluteTime(timestamp)
          const statusLabel = getStatusLabel(session.status)
          const isRunning = session.status === 'running'
          const isSelected = selectedId === session.sessionId
          // Get project name for global search results display
          const projectName = isGlobalSearch
            ? getProjectName(session.projectId)
            : null

          const projectPath = getProjectPath(session.projectId)
          const contextMenuItems: ContextMenuItem[] = [
            {
              label: session.isFavorite ? 'Unpin thread' : 'Pin thread',
              icon: session.isFavorite ? <PinOff size={14} /> : <Pin size={14} />,
              onClick: () =>
                onToggleFavorite(session.sessionId, session.isFavorite),
            },
            {
              label: 'Rename thread',
              icon: <Pencil size={14} />,
              onClick: () => onRename(session.sessionId, displayName),
            },
            {
              label: 'Archive thread',
              icon: <Archive size={14} />,
              onClick: () => onArchive(session.sessionId, displayName),
            },
            ...(projectPath
              ? [
                  {
                    label: 'Copy working directory',
                    icon: <Copy size={14} />,
                    onClick: () => void navigator.clipboard?.writeText(projectPath),
                  },
                ]
              : []),
            {
              label: 'Copy session id',
              icon: <Copy size={14} />,
              onClick: () => void navigator.clipboard?.writeText(session.sessionId),
            },
            {
              label: 'Delete',
              icon: <Trash2 size={14} />,
              onClick: () => onDelete(session.sessionId, displayName),
              variant: 'danger',
            },
          ]

          return (
            <ContextMenu key={session.sessionId} items={contextMenuItems}>
              <button
                className={cn(
                  'group w-full h-12 rounded-md px-3 py-1.5 text-left transition-colors relative overflow-hidden flex flex-col justify-center',
                  isSelected
                    ? 'bg-surface-selected/[0.08] text-text-1'
                    : 'text-text-1 hover:bg-surface-hover/[0.06]',
                  isRunning &&
                    !isSelected &&
                    'border border-stroke/40 bg-surface-hover/[0.12]'
                )}
                onClick={() =>
                  onSelect(
                    session.sessionId,
                    isGlobalSearch ? session.projectId : undefined
                  )
                }
                role="option"
                aria-selected={isSelected}
              >
                {/* First row: Status icon + Session name + Task progress */}
                <div className="flex items-center gap-2">
                  <StatusIcon status={session.status} />
                  {session.isFavorite && (
                    <Star
                      size={12}
                      className="text-text-3 flex-shrink-0 fill-text-3/70"
                    />
                  )}
                  <span className={cn("truncate text-[14px] leading-tight flex-1", isSelected ? "font-semibold" : "font-medium")}>
                    {displayName}
                  </span>
                  {/* Task progress indicator */}
                  <TaskProgressIndicator
                    tasksJson={session.tasksJson}
                    status={session.status}
                  />
                </div>
                {/* Second row: Status label + Timestamp + Project name (for global search) */}
                <div className="flex items-center gap-1.5 mt-0.5 text-[12px] leading-tight">
                  <span
                    className={cn(
                      'text-text-3 transition-colors',
                      isSelected && 'text-text-2'
                    )}
                  >
                    {statusLabel}
                  </span>
                  {timeStr && (
                    <>
                      <span
                        className={cn(
                          'text-text-3/70',
                          isSelected && 'text-text-3/80'
                        )}
                      >
                        ·
                      </span>
                      <span
                        className={cn(
                          'text-text-3',
                          isSelected && 'text-text-2'
                        )}
                      >
                        {timeStr}
                      </span>
                    </>
                  )}
                  {/* Show project name in global search results */}
                  {projectName && (
                    <>
                      <span
                        className={cn(
                          'text-text-3/70',
                          isSelected && 'text-text-3/80'
                        )}
                      >
                        ·
                      </span>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded bg-surface-hover/[0.12] text-text-3 truncate max-w-[120px]',
                          isSelected &&
                            'bg-surface-hover/[0.18] text-text-2'
                        )}
                      >
                        {projectName}
                      </span>
                    </>
                  )}
                </div>
              </button>
            </ContextMenu>
          )
        })}
      </div>
    )
  }

  // P0 Fix: Virtualized list for large datasets using react-window v2 API
  const renderVirtualizedList = () => {
    return (
      <div className="h-full min-h-0 flex-1">
        <AutoSizer
          renderProp={({ height, width }) => {
            // Guard against undefined dimensions during initial render
            if (height === undefined || width === undefined || height === 0 || width === 0) {
              return (
                <div
                  style={{ height: rowHeight * 5, width: '100%' }}
                  className="flex items-center justify-center text-text-3"
                >
                  Loading...
                </div>
              )
            }
            return (
              <List<SessionRowCustomProps>
                style={{ height, width }}
                rowCount={sortedSessions.length}
                rowHeight={rowHeight}
                rowProps={rowProps}
                rowComponent={SessionRowInner}
                overscanCount={5}
                defaultHeight={rowHeight * 5}
                role="listbox"
                aria-label="Sessions list (virtualized)"
                id="sessions-panel"
                aria-labelledby="sessions-tab"
              />
            )
          }}
        />
      </div>
    )
  }

  // Early returns after all hooks
  // When doing global search, don't require project selection
  if (!hasProject && !isGlobalSearch) {
    return (
      <div className="flex h-36 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-surface-hover/[0.12] text-text-3">
            <span className="text-base">📁</span>
          </div>
          <p className="text-sm font-medium text-text-2">Select a project</p>
          <p className="text-xs text-text-3">Choose a project to see sessions</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        className="flex h-32 items-center justify-center text-sm text-text-3"
        role="status"
        aria-busy="true"
        aria-label={isGlobalSearch ? 'Searching sessions' : 'Loading sessions'}
      >
        <div className="animate-spin mr-2" aria-hidden="true">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        {isGlobalSearch ? 'Searching...' : 'Loading sessions...'}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-surface-hover/[0.12] text-text-3">
            <span className="text-base">💬</span>
          </div>
          <p className="text-sm font-medium text-text-2">
            {isGlobalSearch ? 'No matching sessions' : 'No sessions yet'}
          </p>
          <p className="text-xs text-text-3">
            {isGlobalSearch ? 'Try a different keyword' : 'Start a new session to begin'}
          </p>
        </div>
      </div>
    )
  }

  // Choose rendering method based on dataset size
  // P0 Fix: Use virtualization for large lists to improve performance
  return shouldVirtualize ? renderVirtualizedList() : renderStandardList()
})
