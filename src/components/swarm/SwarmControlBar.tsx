import { useSwarmStore, type SwarmPhase } from '../../stores/swarm'
import { cancelSwarm } from '../../lib/swarmOrchestrator'
import { X } from 'lucide-react'
import { IconButton } from '../ui/IconButton'
import { useEffect, useState } from 'react'

const PHASES: SwarmPhase[] = [
  'exploring',
  'planning',
  'spawning',
  'working',
  'reviewing',
  'testing',
  'completed',
]

const PHASE_LABELS: Record<SwarmPhase, string> = {
  idle: 'Idle',
  exploring: 'Exploring',
  planning: 'Planning',
  spawning: 'Spawning',
  working: 'Working',
  reviewing: 'Reviewing',
  testing: 'Testing',
  completed: 'Completed',
  failed: 'Failed',
  cleaning_up: 'Cleaning Up',
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const sec = totalSec % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function SwarmControlBar() {
  const phase = useSwarmStore((s) => s.phase)
  const startedAt = useSwarmStore((s) => s.startedAt)
  const deactivate = useSwarmStore((s) => s.deactivate)
  const error = useSwarmStore((s) => s.error)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt || phase === 'completed' || phase === 'failed') return
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt)
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt, phase])

  const currentPhaseIdx = PHASES.indexOf(phase)

  const handleCancel = () => {
    if (phase === 'idle' || phase === 'completed' || phase === 'failed') {
      deactivate()
    } else {
      if (window.confirm('Cancel Self-Driving? This will stop all workers and discard pending changes.')) {
        cancelSwarm()
      }
    }
  }

  return (
    <div className="flex h-12 items-center justify-between border-b border-stroke/10 px-4">
      <div className="flex items-center gap-3">
        {/* Phase dots */}
        <div
          className="flex items-center gap-1.5"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={PHASES.length - 1}
          aria-valuenow={currentPhaseIdx >= 0 ? currentPhaseIdx : 0}
          aria-valuetext={PHASE_LABELS[phase] || phase}
        >
          {PHASES.map((p, i) => {
            let color = 'bg-surface-solid'

            if (phase === 'cleaning_up') {
              // Keep dots at their last state during cleanup
              if (i < currentPhaseIdx) color = 'bg-status-success'
              else if (i === currentPhaseIdx) color = 'bg-primary'
            } else if (phase === 'failed') {
              // Color completed phases green, failed phase red
              if (i < currentPhaseIdx) color = 'bg-status-success'
              else if (i === currentPhaseIdx) color = 'bg-status-error'
            } else {
              if (i < currentPhaseIdx) color = 'bg-status-success'
              else if (i === currentPhaseIdx && phase !== 'idle') color = 'bg-primary'
            }

            return (
              <div key={p} className="flex items-center gap-1.5">
                <div
                  className={`h-2 w-2 rounded-full ${color} transition-colors`}
                  title={PHASE_LABELS[p]}
                />
                {i < PHASES.length - 1 && (
                  <div
                    className={`h-px w-3 ${i < currentPhaseIdx ? 'bg-status-success' : 'bg-surface-solid'}`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Phase label */}
        <span className="text-[13px] font-medium text-text-1" aria-live="polite">
          {PHASE_LABELS[phase] || phase}
        </span>

        {/* Error */}
        {error && (
          <span
            className="max-w-[300px] truncate text-[12px] text-status-error"
            title={error}
            role="alert"
          >
            {error}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Timer */}
        {startedAt && (
          <span className="text-[12px] tabular-nums text-text-3">
            {formatElapsed(elapsed)}
          </span>
        )}

        {/* Cancel button */}
        {phase !== 'idle' && phase !== 'completed' && (
          <IconButton
            size="sm"
            onClick={handleCancel}
            aria-label="Cancel Self-Driving"
            title="Cancel"
          >
            <X size={14} />
          </IconButton>
        )}
      </div>
    </div>
  )
}
