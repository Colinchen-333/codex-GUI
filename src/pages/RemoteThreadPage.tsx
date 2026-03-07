import { memo, useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Cloud,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Radio,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { threadApi } from '../lib/api'
import type { ThreadInfo } from '../lib/api'

type RemoteTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

interface RemoteTask {
  id: string
  status: RemoteTaskStatus
  title: string
  createdAt: string
  completedAt?: string
  output?: string
  error?: string
}

const STATUS_COLORS: Record<RemoteTaskStatus, string> = {
  queued: 'text-text-3',
  running: 'text-primary',
  completed: 'text-status-success',
  failed: 'text-status-error',
  cancelled: 'text-text-3',
}

function StatusIcon({ status }: { status: RemoteTaskStatus }) {
  switch (status) {
    case 'queued':
      return <Clock size={18} className="text-text-3" />
    case 'running':
      return <Loader2 size={18} className="text-primary animate-spin" />
    case 'completed':
      return <CheckCircle size={18} className="text-status-success" />
    case 'failed':
      return <XCircle size={18} className="text-status-error" />
    case 'cancelled':
    default:
      return <Cloud size={18} className="text-text-3" />
  }
}

function threadInfoToTask(id: string, info: ThreadInfo): RemoteTask {
  return {
    id,
    // Remote threads fetched via read() are readable — treat as completed unless
    // the caller later enriches this with real status from cloud events.
    status: 'completed',
    title: info.preview ?? id,
    createdAt: info.createdAt
      ? new Date(info.createdAt).toISOString()
      : new Date().toISOString(),
  }
}

export const RemoteThreadPage = memo(function RemoteThreadPage() {
  const { taskId, conversationId } = useParams()
  const navigate = useNavigate()
  const id = taskId ?? conversationId

  const [task, setTask] = useState<RemoteTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchTask = useCallback(async () => {
    if (!id) {
      setFetchError('No task or conversation ID provided.')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setFetchError(null)
      const result = await threadApi.read(id)
      setTask(threadInfoToTask(id, result.thread))
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : 'Failed to load remote thread.',
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetchTask()
  }, [fetchTask])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-stroke/20">
        <button
          onClick={() => navigate(-1)}
          className="p-1 rounded hover:bg-surface-hover/[0.08] text-text-2 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <Cloud size={18} className="text-primary" />
        <h1 className="text-base font-semibold text-text-1">Remote Thread</h1>
        {task && (
          <span className={`text-sm ${STATUS_COLORS[task.status]}`}>
            {task.status}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 size={32} className="text-primary animate-spin" />
            <p className="text-text-3 text-sm">Loading remote thread...</p>
          </div>
        )}

        {!loading && fetchError && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <XCircle size={32} className="text-status-error" />
            <p className="text-text-1">{fetchError}</p>
            <Button variant="secondary" size="sm" onClick={() => void fetchTask()}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !fetchError && !task && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Cloud size={32} className="text-text-3" />
            <p className="text-text-3">No remote thread found.</p>
          </div>
        )}

        {!loading && !fetchError && task && (
          <div className="max-w-thread-content mx-auto space-y-6">
            {/* Task card */}
            <div className="bg-surface-solid rounded-xl p-6 border border-stroke/20">
              <div className="flex items-start gap-4">
                <StatusIcon status={task.status} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-text-1 truncate">
                    {task.title}
                  </h2>
                  <p className="text-sm text-text-3 mt-1">
                    Created {new Date(task.createdAt).toLocaleString()}
                  </p>
                  {task.completedAt && (
                    <p className="text-sm text-text-3">
                      Completed {new Date(task.completedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                {task.status === 'running' && (
                  <Button variant="secondary" size="sm">
                    <Radio size={14} className="mr-1.5" />
                    Follow
                  </Button>
                )}
              </div>
            </div>

            {/* Output */}
            {task.output && (
              <div className="bg-surface rounded-xl p-4 border border-stroke/10">
                <h3 className="text-sm font-medium text-text-2 mb-2">Output</h3>
                <pre className="text-sm text-text-1 whitespace-pre-wrap font-mono overflow-x-auto">
                  {task.output}
                </pre>
              </div>
            )}

            {/* Error detail */}
            {task.error && (
              <div className="bg-status-error-muted rounded-xl p-4 border border-status-error/20">
                <h3 className="text-sm font-medium text-status-error mb-2">Error</h3>
                <pre className="text-sm text-status-error whitespace-pre-wrap font-mono overflow-x-auto">
                  {task.error}
                </pre>
              </div>
            )}

            {/* Queued empty state */}
            {task.status === 'queued' && (
              <div className="text-center py-12">
                <Clock size={48} className="text-text-3 mx-auto mb-4" />
                <p className="text-text-2">This task is queued and waiting to run.</p>
                <p className="text-text-3 text-sm mt-1">
                  It will start automatically when resources are available.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
