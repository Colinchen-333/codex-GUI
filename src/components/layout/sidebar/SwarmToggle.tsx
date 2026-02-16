import { Bot } from 'lucide-react'
import { Switch } from '../../ui/Switch'
import { useSwarmStore } from '../../../stores/swarm'

export function SwarmToggle() {
  const isActive = useSwarmStore((s) => s.isActive)
  const activate = useSwarmStore((s) => s.activate)
  const deactivate = useSwarmStore((s) => s.deactivate)

  return (
    <div className="group flex h-10 w-full items-center justify-between rounded-md px-3 text-[16px] text-text-1">
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
          onChange={(checked) => (checked ? activate() : deactivate())}
          aria-label="Toggle Self-Driving mode"
        />
      </div>
    </div>
  )
}
