import { ListChecks } from 'lucide-react'
import { useSwarmStore, type SwarmTask } from '../../stores/swarm'

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-surface-solid text-text-3',
  in_progress: 'bg-status-warning/10 text-status-warning',
  merging: 'bg-primary/10 text-primary',
  merged: 'bg-status-success/10 text-status-success',
  failed: 'bg-status-error/10 text-status-error',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  merging: 'Merging',
  merged: 'Merged',
  failed: 'Failed',
}

function TaskCard({ task, index }: { task: SwarmTask; index: number }) {
  const workers = useSwarmStore((s) => s.workers)
  const tasks = useSwarmStore((s) => s.tasks)
  const assignedWorker = task.assignedWorker
    ? workers.find((w) => w.id === task.assignedWorker)
    : null

  const dependencyLabels = task.dependsOn.map((depId) => {
    const depIdx = tasks.findIndex((t) => t.id === depId || t.title === depId)
    return depIdx >= 0 ? `#${depIdx + 1}` : depId
  })

  return (
    <div className="rounded-lg border border-stroke/10 bg-surface p-3 transition-colors hover:border-stroke/20" role="listitem">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-text-3">
            #{index + 1}
          </span>
          <span className="text-[13px] font-medium text-text-1">
            {task.title}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[task.status] || 'bg-surface-solid text-text-3'}`}
        >
          {STATUS_LABELS[task.status] || task.status}
        </span>
      </div>
      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-text-3">
          {task.description}
        </p>
      )}
      <div className="mt-2 flex items-center gap-3 text-[11px] text-text-3">
        {assignedWorker && <span>{assignedWorker.name}</span>}
        {dependencyLabels.length > 0 && (
          <span>Depends on: {dependencyLabels.join(', ')}</span>
        )}
      </div>
    </div>
  )
}

export function SwarmTaskBoard() {
  const tasks = useSwarmStore((s) => s.tasks)

  if (tasks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-text-3">
        <ListChecks size={24} strokeWidth={1.5} />
        <p className="text-[13px]">Tasks will appear once planning completes</p>
      </div>
    )
  }

  const merged = tasks.filter((t) => t.status === 'merged').length

  return (
    <div className="space-y-2">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-text-3">
        Tasks <span className="ml-1 font-normal">({tasks.length})</span>
      </h3>
      {tasks.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-solid">
            <div
              className="h-full rounded-full bg-status-success transition-all"
              style={{ width: `${(merged / tasks.length) * 100}%` }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-text-3">
            {merged}/{tasks.length}
          </span>
        </div>
      )}
      <div className="space-y-2" role="list" aria-label="Task board">
        {tasks.map((task, i) => (
          <TaskCard key={task.id} task={task} index={i} />
        ))}
      </div>
    </div>
  )
}
