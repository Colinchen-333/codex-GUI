import { memo, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Folder, MessageSquare, Settings } from 'lucide-react'
import { cn, formatSessionTime } from '../../../lib/utils'
import { useProjectsStore } from '../../../stores/projects'
import { useSessionsStore } from '../../../stores/sessions'
import type { Session } from './SessionList'
import { IconButton } from '../../ui/IconButton'

interface GroupedSessionListProps {
  sessions: Session[]
  selectedSessionId: string | null
  onSelectSession: (sessionId: string | null, projectId?: string) => void
  onOpenProjectSettings?: (projectId: string) => void
  isLoading: boolean
}

interface ProjectGroup {
  projectId: string
  projectName: string
  sessions: Session[]
}

export const GroupedSessionList = memo(function GroupedSessionList({
  sessions,
  selectedSessionId,
  onSelectSession,
  onOpenProjectSettings,
  isLoading,
}: GroupedSessionListProps) {
  const { projects } = useProjectsStore()
  const { getSessionDisplayName } = useSessionsStore()
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

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

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
                {isExpanded ? (
                  <ChevronDown size={14} className="text-text-3" />
                ) : (
                  <ChevronRight size={14} className="text-text-3" />
                )}
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

                  return (
                    <button
                      key={session.sessionId}
                      onClick={() => onSelectSession(session.sessionId, session.projectId)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-2xl px-2.5 py-1.5 text-left transition-colors',
                        isSelected
                          ? 'bg-surface-hover/[0.08] text-text-1'
                          : 'text-text-2 hover:bg-surface-hover/[0.06]'
                      )}
                    >
                      <span className={cn(
                        'min-w-0 flex-1 truncate text-[15px] leading-6',
                        isSelected ? 'font-semibold text-text-1' : 'font-medium'
                      )}>
                        {displayName}
                      </span>

                      {isRunning && <span className="h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />}

                      {timeStr && (
                        <span className="shrink-0 text-[12px] text-text-3">{timeStr}</span>
                      )}
                    </button>
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
