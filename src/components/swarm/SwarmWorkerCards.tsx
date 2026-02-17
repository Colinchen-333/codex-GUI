import { useSwarmStore, type SwarmWorker } from '../../stores/swarm'

const STATUS_DOT: Record<string, string> = {
  starting: 'bg-status-warning',
  working: 'bg-primary animate-pulse',
  idle: 'bg-surface-solid',
  merging: 'bg-primary',
  done: 'bg-status-success',
  failed: 'bg-status-error',
}

/** Format a token count in compact notation: 0, 1.2k, 10k, 1.2M, etc. */
function formatTokens(count: number): string {
  if (count < 1000) return `${count}`
  if (count < 10_000) return `${(count / 1000).toFixed(1)}k`
  if (count < 1_000_000) return `${Math.round(count / 1000)}k`
  return `${(count / 1_000_000).toFixed(1)}M`
}

function WorkerCard({ worker }: { worker: SwarmWorker }) {
  const tasks = useSwarmStore((s) => s.tasks)
  const workerTokens = useSwarmStore((s) => s.tokenUsage.perWorker[worker.id] ?? 0)
  const currentTask = worker.currentTaskId
    ? tasks.find((t) => t.id === worker.currentTaskId)
    : null

  return (
    <div className="flex items-center gap-2 rounded-lg border border-stroke/10 bg-surface px-3 py-2 transition-colors hover:border-stroke/20">
      <div
        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[worker.status] || 'bg-surface-solid'}`}
        title={worker.status}
        aria-hidden="true"
      />
      <span className="sr-only">{worker.status}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[12px] font-medium text-text-1">
            {worker.name}
          </span>
          {workerTokens > 0 && (
            <span className="shrink-0 text-[10px] text-text-3">
              {formatTokens(workerTokens)} tok
            </span>
          )}
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
  const totalTokens = useSwarmStore((s) => s.tokenUsage.totalTokens)

  if (workers.length === 0) return null

  return (
    <div className="relative border-t border-stroke/10 px-4 py-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-3">
          Workers ({workers.length})
        </span>
        {totalTokens > 0 && (
          <span className="text-[11px] text-text-3">
            Total: {formatTokens(totalTokens)} tokens
          </span>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {workers.map((w) => (
          <WorkerCard key={w.id} worker={w} />
        ))}
      </div>
      {workers.length > 3 && (
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l from-[hsl(var(--bg))] to-transparent" />
      )}
    </div>
  )
}
