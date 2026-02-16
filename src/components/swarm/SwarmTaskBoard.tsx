import { useSwarmStore, type SwarmTask } from '../../stores/swarm'

const STATUS_STYLES: Record<string, string> = {
  pending: 'text-text-3',
  in_progress: 'text-status-warning',
  merging: 'text-primary',
  merged: 'text-status-success',
  failed: 'text-status-error',
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
    <div className="rounded-lg border border-stroke/10 bg-surface p-3" role="listitem">
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
          className={`text-[11px] font-medium ${STATUS_STYLES[task.status] || 'text-text-3'}`}
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
      <div className="flex h-full items-center justify-center text-[13px] text-text-3">
        Tasks will appear here once planning is complete.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-text-3">
        Tasks
      </h3>
      <div className="space-y-2" role="list" aria-label="Task board">
        {tasks.map((task, i) => (
          <TaskCard key={task.id} task={task} index={i} />
        ))}
      </div>
    </div>
  )
}
