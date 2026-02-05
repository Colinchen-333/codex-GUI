import { memo, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen, AlertCircle, Star, Trash2 } from 'lucide-react'
import { cn, formatAbsoluteTime } from '../../../lib/utils'
import { useProjectsStore } from '../../../stores/projects'
import { useSessionsStore } from '../../../stores/sessions'
import { StatusIcon, getStatusLabel } from '../../ui/StatusIndicator'
import { TaskProgressIndicator } from '../../chat/TaskProgress'
import type { Session } from './SessionList'

interface GroupedSessionListProps {
  sessions: Session[]
  selectedSessionId: string | null
  onSelectSession: (sessionId: string | null, projectId?: string) => void
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
  isLoading,
}: GroupedSessionListProps) {
  const { projects } = useProjectsStore()
  const { getSessionDisplayName } = useSessionsStore()
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(projects.map(p => p.id)))

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

    return Object.values(groups)
      .filter(group => group.sessions.length > 0)
      .map(group => ({
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

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
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
        <div className="animate-spin mr-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        Loading...
      </div>
    )
  }

  if (groupedSessions.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-surface-hover/[0.12] text-text-3">
            <span className="text-base">💬</span>
          </div>
          <p className="text-sm font-medium text-text-2">No sessions yet</p>
          <p className="text-xs text-text-3">Start a new session to begin</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {groupedSessions.map(group => {
        const isExpanded = expandedProjects.has(group.projectId)
        const hasRunning = group.sessions.some(s => s.status === 'running')
        const hasError = group.sessions.some(s => s.status === 'failed')

        return (
          <div key={group.projectId}>
            <button
              onClick={() => toggleProject(group.projectId)}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left rounded-md hover:bg-surface-hover/[0.08] transition-colors"
            >
              {isExpanded ? (
                <ChevronDown size={14} className="text-text-3" />
              ) : (
                <ChevronRight size={14} className="text-text-3" />
              )}
              {isExpanded ? (
                <FolderOpen size={14} className="text-text-2" />
              ) : (
                <Folder size={14} className="text-text-2" />
              )}
              <span className="flex-1 text-sm font-medium text-text-1 truncate">
                {group.projectName}
              </span>
              {hasError && <AlertCircle size={12} className="text-red-500" />}
              {hasRunning && (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </button>

            {isExpanded && (
              <div className="ml-2 mt-0.5">
                {group.sessions.map(session => {
                  const displayName = getSessionDisplayName(session)
                  const timestamp = session.lastAccessedAt || session.createdAt
                  const timeStr = formatAbsoluteTime(timestamp)
                  const isSelected = selectedSessionId === session.sessionId
                  const isRunning = session.status === 'running'
                  const isFailed = session.status === 'failed'

                  return (
                    <button
                      key={session.sessionId}
                      onClick={() => onSelectSession(session.sessionId, session.projectId)}
                      className={cn(
                        'group w-full rounded-lg px-2.5 py-2 text-left transition-all flex items-center gap-2 relative',
                        isSelected
                          ? 'bg-primary/[0.12] text-text-1 border-l-2 border-primary ml-0.5'
                          : 'text-text-2 hover:bg-surface-hover/[0.08] ml-0.5 border-l-2 border-transparent',
                        isRunning && !isSelected && 'border-l-2 border-blue-500/70',
                        isFailed && !isSelected && 'border-l-2 border-red-500/70'
                      )}
                    >
                      <StatusIcon status={session.status} />
                      {session.isFavorite && (
                        <Star size={10} className="text-yellow-500 fill-yellow-500/70 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[13px] truncate flex-1",
                            isSelected ? "font-semibold text-text-1" : "font-medium"
                          )}>
                            {displayName}
                          </span>
                          <TaskProgressIndicator tasksJson={session.tasksJson} status={session.status} />
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                          <span className={cn(
                            isRunning && 'text-blue-400',
                            isFailed && 'text-red-400',
                            !isRunning && !isFailed && 'text-text-3'
                          )}>
                            {getStatusLabel(session.status)}
                          </span>
                          {timeStr && (
                            <>
                              <span className="text-text-3/50">·</span>
                              <span className="text-text-3">{timeStr}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Trash2 size={12} className="text-text-3 hover:text-red-400 transition-colors" />
                      </div>
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
