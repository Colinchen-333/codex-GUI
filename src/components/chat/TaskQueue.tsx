/**
 * TaskQueue Component
 * Displays a list of tasks with their status and interactive controls
 */

import { useMemo } from 'react'
import { CheckCircle2, Clock, XCircle, Loader2, X, RotateCcw } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { TaskItem } from './TaskProgress'

interface TaskQueueProps {
  tasksJson: string | null
  status: 'idle' | 'running' | 'completed' | 'failed' | 'interrupted'
  showControls?: boolean
  onCancelTask?: (taskIndex: number) => void
  onRetryTask?: (taskIndex: number) => void
  onCancelAll?: () => void
  onRetryAll?: () => void
  className?: string
  maxVisible?: number
}

// Status icon configuration
const StatusIcon = ({ status, size = 'md' }: { status: TaskItem['status']; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClass = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size]

  switch (status) {
    case 'completed':
      return (
        <CheckCircle2 className={cn(sizeClass, 'text-status-success flex-shrink-0')} />
      )
    case 'in_progress':
      return (
        <Loader2 className={cn(sizeClass, 'text-primary flex-shrink-0 animate-spin')} />
      )
    case 'failed':
      return (
        <XCircle className={cn(sizeClass, 'text-status-error flex-shrink-0')} />
      )
    case 'pending':
    default:
      return (
        <Clock className={cn(sizeClass, 'text-text-3 flex-shrink-0')} />
      )
  }
}

// Status label mapping
const statusLabels: Record<TaskItem['status'], string> = {
  completed: 'Completed',
  in_progress: 'Running',
  failed: 'Failed',
  pending: 'Pending',
}

// Parse tasks JSON safely
function parseTasks(tasksJson: string | null): TaskItem[] {
  if (!tasksJson) return []
  try {
    const parsed = JSON.parse(tasksJson)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    // Invalid tasks JSON — return empty array to avoid rendering errors
    return []
  }
}

export function TaskQueue({
  tasksJson,
  status,
  showControls = false,
  onCancelTask,
  onRetryTask,
  onCancelAll,
  onRetryAll,
  className,
  maxVisible,
}: TaskQueueProps) {
  const tasks = useMemo(() => parseTasks(tasksJson), [tasksJson])

  // Determine visible tasks
  const visibleTasks = maxVisible ? tasks.slice(0, maxVisible) : tasks
  const hasMoreTasks = maxVisible && tasks.length > maxVisible
  const remainingCount = maxVisible ? Math.max(0, tasks.length - maxVisible) : 0

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'completed').length
    const failed = tasks.filter((t) => t.status === 'failed').length
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length
    const pending = tasks.filter((t) => t.status === 'pending').length

    return {
      total: tasks.length,
      completed,
      failed,
      inProgress,
      pending,
    }
  }, [tasks])

  // Don't render if no tasks
  if (tasks.length === 0) {
    return null
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Header with statistics */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-text-1">Task Queue</span>
          <span className="text-text-3">({stats.total})</span>
        </div>

        {/* Global controls */}
        {showControls && status !== 'idle' && (
          <div className="flex items-center gap-1">
            {status === 'running' && onCancelAll && (
              <button
                onClick={onCancelAll}
                className={cn(
                  'px-2 py-1 text-xs rounded hover:bg-destructive/20 hover:text-destructive transition-colors'
                )}
              >
                Cancel all
              </button>
            )}
            {(status === 'failed' || status === 'interrupted') && onRetryAll && (
              <button
                onClick={onRetryAll}
                className={cn(
                  'px-2 py-1 text-xs rounded hover:bg-primary/20 hover:text-primary transition-colors'
                )}
              >
                Retry all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="space-y-1">
        {visibleTasks.map((task, index) => {
          const canCancel = showControls && (task.status === 'pending' || task.status === 'in_progress') && onCancelTask
          const canRetry = showControls && task.status === 'failed' && onRetryTask

          return (
            <div
              key={index}
              className={cn(
                'group flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors',
                'bg-surface-solid hover:bg-surface-hover/[0.06] border border-transparent',
                task.status === 'in_progress' && 'border-primary/20 bg-primary/10',
                task.status === 'completed' && 'border-status-success/20 bg-status-success-muted',
                task.status === 'failed' && 'border-status-error/20 bg-status-error-muted'
              )}
            >
              {/* Status icon */}
              <StatusIcon status={task.status} size="sm" />

              {/* Task content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-1 truncate">{task.content}</span>
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      'bg-surface-hover/[0.08] text-text-3',
                      task.status === 'in_progress' && 'bg-primary/15 text-primary',
                      task.status === 'completed' && 'bg-status-success/15 text-status-success',
                      task.status === 'failed' && 'bg-status-error/15 text-status-error'
                    )}
                  >
                    <span className={cn(task.status === 'in_progress' && 'animate-breathe-text')}>
                      {statusLabels[task.status]}
                    </span>
                  </span>
                </div>
              </div>

              {/* Task controls */}
              {(canCancel || canRetry) && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canCancel && (
                    <button
                      onClick={() => onCancelTask!(index)}
                      className={cn(
                        'p-1 rounded hover:bg-destructive/20 hover:text-destructive transition-colors'
                      )}
                      title="Cancel task"
                      aria-label="Cancel task"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {canRetry && (
                    <button
                      onClick={() => onRetryTask!(index)}
                      className={cn(
                        'p-1 rounded hover:bg-primary/20 hover:text-primary transition-colors'
                      )}
                      title="Retry task"
                      aria-label="Retry task"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Show remaining count */}
        {hasMoreTasks && (
          <div className="px-2 py-1.5 text-sm text-text-3 text-center">
            And {remainingCount} more…
          </div>
        )}
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between px-1 pt-1 text-xs text-text-3">
        <div className="flex items-center gap-3">
          <span>Completed: {stats.completed}</span>
          <span>Running: {stats.inProgress}</span>
          <span>Pending: {stats.pending}</span>
          {stats.failed > 0 && (
            <span className="text-status-error">Failed: {stats.failed}</span>
          )}
        </div>
        {stats.total > 0 && (
          <span className="tabular-nums">
            {Math.round((stats.completed / stats.total) * 100)}%
          </span>
        )}
      </div>
    </div>
  )
}

// Compact horizontal version for inline display
interface TaskQueueCompactProps {
  tasksJson: string | null
  className?: string
  maxTasks?: number
}

export function TaskQueueCompact({
  tasksJson,
  className,
  maxTasks = 3,
}: TaskQueueCompactProps) {
  const tasks = useMemo(() => parseTasks(tasksJson), [tasksJson])
  const visibleTasks = tasks.slice(0, maxTasks)

  if (tasks.length === 0) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {visibleTasks.map((task, index) => (
        <div
          key={index}
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
            'bg-surface-hover/[0.06] border border-transparent',
            task.status === 'in_progress' && 'bg-primary/10 border-primary/20',
            task.status === 'completed' && 'bg-status-success-muted border-status-success/20',
            task.status === 'failed' && 'bg-status-error-muted border-status-error/20'
          )}
          title={task.content}
        >
          <StatusIcon status={task.status} size="sm" />
          <span className="max-w-[80px] truncate">{task.content}</span>
        </div>
      ))}
      {tasks.length > maxTasks && (
        <span className="text-xs text-text-3">+{tasks.length - maxTasks}</span>
      )}
    </div>
  )
}

export default TaskQueue
