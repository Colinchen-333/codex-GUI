import { useSwarmStore, type SwarmWorker } from '../../stores/swarm'

const STATUS_DOT: Record<string, string> = {
  starting: 'bg-status-warning',
  working: 'bg-primary animate-pulse',
  idle: 'bg-surface-solid',
  merging: 'bg-primary',
  done: 'bg-status-success',
  failed: 'bg-status-error',
}

function WorkerCard({ worker }: { worker: SwarmWorker }) {
  const tasks = useSwarmStore((s) => s.tasks)
  const currentTask = worker.currentTaskId
    ? tasks.find((t) => t.id === worker.currentTaskId)
    : null

  return (
    <div className="flex items-center gap-2 rounded-lg border border-stroke/10 bg-surface px-3 py-2">
      <div
        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[worker.status] || 'bg-surface-solid'}`}
      />
      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium text-text-1">
          {worker.name}
        </div>
        <div className="truncate text-[11px] text-text-3">
          {currentTask ? currentTask.title : worker.status}
        </div>
      </div>
    </div>
  )
}

export function SwarmWorkerCards() {
  const workers = useSwarmStore((s) => s.workers)

  if (workers.length === 0) return null

  return (
    <div className="border-t border-stroke/10 px-4 py-2">
      <div className="flex gap-2 overflow-x-auto">
        {workers.map((w) => (
          <WorkerCard key={w.id} worker={w} />
        ))}
      </div>
    </div>
  )
}
