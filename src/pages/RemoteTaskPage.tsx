import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Cloud,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  GitBranch,
  FileCode,
  ArrowUpRight,
  Download,
  RotateCcw,

} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { cn } from '../lib/utils'

type TaskStatus = 'queued' | 'running' | 'completed' | 'failed'
type TurnStatus = 'pending' | 'running' | 'completed' | 'failed'

type TaskTurn = {
  id: string
  index: number
  status: TurnStatus
  message: string
  timestamp: string
  diff?: {
    filesChanged: number
    additions: number
    deletions: number
  }
}

type RemoteTask = {
  id: string
  title: string
  status: TaskStatus
  createdAt: string
  completedAt?: string
  workspace: string
  branch: string
  turns: TaskTurn[]
}

const SAMPLE_TASK: RemoteTask = {
  id: 'task-abc123',
  title: 'Implement user authentication flow',
  status: 'completed',
  createdAt: '2025-02-05T10:00:00Z',
  completedAt: '2025-02-05T10:15:00Z',
  workspace: '/Users/colin/Projects/my-app',
  branch: 'feature/auth',
  turns: [
    {
      id: 'turn-1',
      index: 1,
      status: 'completed',
      message: 'Analyzing requirements and existing codebase...',
      timestamp: '10:00:15',
    },
    {
      id: 'turn-2',
      index: 2,
      status: 'completed',
      message: 'Creating authentication middleware and routes...',
      timestamp: '10:05:30',
      diff: { filesChanged: 3, additions: 156, deletions: 12 },
    },
    {
      id: 'turn-3',
      index: 3,
      status: 'completed',
      message: 'Adding JWT token validation and refresh logic...',
      timestamp: '10:10:45',
      diff: { filesChanged: 2, additions: 89, deletions: 5 },
    },
    {
      id: 'turn-4',
      index: 4,
      status: 'completed',
      message: 'Task completed successfully.',
      timestamp: '10:15:00',
    },
  ],
}

const statusConfig = {
  queued: {
    icon: <Clock size={16} className="text-text-3" />,
    label: 'Queued',
    color: 'text-text-3',
    bgColor: 'bg-surface-hover/[0.1]',
  },
  running: {
    icon: <Loader2 size={16} className="text-primary animate-spin" />,
    label: 'Running',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  completed: {
    icon: <CheckCircle2 size={16} className="text-emerald-500" />,
    label: 'Completed',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  failed: {
    icon: <XCircle size={16} className="text-red-500" />,
    label: 'Failed',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
}

const turnStatusIcon = (status: TurnStatus) => {
  switch (status) {
    case 'running':
      return <Loader2 size={14} className="animate-spin text-primary" />
    case 'completed':
      return <CheckCircle2 size={14} className="text-emerald-500" />
    case 'failed':
      return <XCircle size={14} className="text-red-500" />
    default:
      return <Clock size={14} className="text-text-3" />
  }
}

export function RemoteTaskPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  const task = SAMPLE_TASK
  const status = statusConfig[task.status]

  const selectedTurn = useMemo(
    () => task.turns.find((t) => t.id === selectedTurnId) ?? null,
    [task.turns, selectedTurnId]
  )

  const totalDiff = useMemo(() => {
    let files = 0
    let adds = 0
    let dels = 0
    for (const turn of task.turns) {
      if (turn.diff) {
        files += turn.diff.filesChanged
        adds += turn.diff.additions
        dels += turn.diff.deletions
      }
    }
    return { filesChanged: files, additions: adds, deletions: dels }
  }, [task.turns])

  const handleApply = () => {
    setIsApplying(true)
    setTimeout(() => setIsApplying(false), 2000)
  }

  const handleRevert = () => {
    // TODO: Implement revert functionality
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-4 pb-0">
        <div className="rounded-lg border border-status-warning/30 bg-status-warning-muted px-4 py-2 text-sm text-status-warning">
          Development Preview — This page will be connected to the task API in a future update.
        </div>
      </div>
      <div className="border-b border-stroke/20 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', status.bgColor)}>
              <Cloud size={20} className={status.color} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-1">{task.title}</h1>
              <div className="flex items-center gap-2 mt-1 text-xs text-text-3">
                <span className="flex items-center gap-1">
                  {status.icon}
                  {status.label}
                </span>
                <span>•</span>
                <span>Task ID: {taskId ?? task.id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRevert} disabled className="gap-2 opacity-50 cursor-not-allowed">
              <RotateCcw size={14} />
              Revert
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              disabled
              className="gap-2 opacity-50 cursor-not-allowed"
            >
              {isApplying ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Apply Changes
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <aside className="w-[280px] border-r border-stroke/20 flex flex-col">
          <div className="px-4 py-3 border-b border-stroke/10">
            <h2 className="text-sm font-semibold text-text-1">Task Details</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <div className="text-[10px] uppercase text-text-3/70 tracking-wider">Workspace</div>
              <div className="mt-1 text-sm text-text-2 truncate">{task.workspace}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-text-3/70 tracking-wider">Branch</div>
              <div className="mt-1 flex items-center gap-2 text-sm text-text-2">
                <GitBranch size={14} />
                {task.branch}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-text-3/70 tracking-wider">Changes</div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <FileCode size={14} className="text-text-3" />
                <span className="text-text-2">{totalDiff.filesChanged} files</span>
                <span className="text-emerald-500">+{totalDiff.additions}</span>
                <span className="text-red-500">-{totalDiff.deletions}</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-[10px] uppercase text-text-3/70 tracking-wider mb-2">Turns</div>
              <div className="space-y-1">
                {task.turns.map((turn) => (
                  <button
                    key={turn.id}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      selectedTurnId === turn.id
                        ? 'bg-primary/10 text-text-1'
                        : 'hover:bg-surface-hover/[0.08] text-text-2'
                    )}
                    onClick={() => setSelectedTurnId(turn.id)}
                  >
                    {turnStatusIcon(turn.status)}
                    <span className="truncate">Turn {turn.index}</span>
                    <span className="ml-auto text-xs text-text-3">{turn.timestamp}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {selectedTurn ? (
            <div className="max-w-3xl">
              <div className="rounded-2xl border border-stroke/20 bg-surface-solid shadow-[var(--shadow-1)]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-stroke/10">
                  <div className="flex items-center gap-3">
                    {turnStatusIcon(selectedTurn.status)}
                    <span className="text-sm font-medium text-text-1">Turn {selectedTurn.index}</span>
                    <Badge variant="default">{selectedTurn.timestamp}</Badge>
                  </div>
                  {selectedTurn.diff && (
                    <Link
                      to="/diff"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View diff
                      <ArrowUpRight size={12} />
                    </Link>
                  )}
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-text-2 leading-relaxed">{selectedTurn.message}</p>
                  {selectedTurn.diff && (
                    <div className="mt-4 flex items-center gap-4 text-xs text-text-3">
                      <span>{selectedTurn.diff.filesChanged} files changed</span>
                      <span className="text-emerald-500">+{selectedTurn.diff.additions}</span>
                      <span className="text-red-500">-{selectedTurn.diff.deletions}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-text-3">Select a turn to view details.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
