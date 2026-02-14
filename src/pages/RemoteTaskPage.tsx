import { useNavigate, useParams } from 'react-router-dom'
import { Cloud, ArrowLeft, ExternalLink } from 'lucide-react'
import { PageScaffold } from '../components/layout/PageScaffold'
import { Button } from '../components/ui/Button'

export function RemoteTaskPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()

  return (
    <PageScaffold
      title="Remote Task"
      description="Remote tasks are not wired up yet."
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-status-warning/30 bg-status-warning-muted px-4 py-3 text-sm text-status-warning">
          This is a placeholder route. Remote tasks will be connected to the task API in a future update.
        </div>

        <div className="rounded-2xl border border-stroke/20 bg-surface-solid shadow-[var(--shadow-1)]">
          <div className="flex items-center justify-between border-b border-stroke/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-hover/[0.08]">
                <Cloud size={18} className="text-text-2" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-1">Remote Task</div>
                <div className="mt-1 text-xs text-text-3 font-mono">
                  {taskId ? `Task ID: ${taskId}` : 'Task ID: (missing)'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/')}>
                <ArrowLeft size={14} />
                Back
              </Button>
              <Button variant="primary" size="sm" className="gap-2" onClick={() => navigate('/debug')}>
                Debug
                <ExternalLink size={14} />
              </Button>
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="text-sm text-text-2 leading-relaxed">
              Planned scope:
              <ul className="mt-2 list-disc pl-5 text-text-3">
                <li>Task list and details</li>
                <li>Diff browsing and apply/revert</li>
                <li>Retries, logs, and timeline</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageScaffold>
  )
}
