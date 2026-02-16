import { Bot } from 'lucide-react'
import { Switch } from '../../ui/Switch'
import { useSwarmStore } from '../../../stores/swarm'
import { cancelSwarm } from '../../../lib/swarmOrchestrator'

export function SwarmToggle() {
  const isActive = useSwarmStore((s) => s.isActive)
  const activate = useSwarmStore((s) => s.activate)
  const deactivate = useSwarmStore((s) => s.deactivate)

  return (
    <div className="group flex h-10 w-full cursor-default items-center justify-between rounded-md px-3 text-[16px] text-text-1 transition-colors hover:bg-surface-hover/[0.06]">
      <div className="flex items-center gap-2.5">
        <Bot
          size={19}
          className="text-text-2 transition-colors group-hover:text-text-1"
          strokeWidth={1.8}
        />
        <span className="text-[16px] tracking-tight">Self-Driving</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded border border-stroke/20 px-1.5 py-0.5 text-[10px] font-medium text-text-3">
          Alpha
        </span>
        <Switch
          size="sm"
          checked={isActive}
          onChange={(checked) => {
            if (checked) {
              activate()
            } else {
              const { phase } = useSwarmStore.getState()
              if (phase !== 'idle' && phase !== 'completed' && phase !== 'failed') {
                if (window.confirm('Cancel Self-Driving? This will stop all workers and discard pending changes.')) {
                  cancelSwarm()
                }
              } else {
                deactivate()
              }
            }
          }}
          aria-label="Toggle Self-Driving mode"
        />
      </div>
    </div>
  )
}
