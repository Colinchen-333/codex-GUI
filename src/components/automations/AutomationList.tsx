import { Plus, Zap } from 'lucide-react'
import { Button } from '../ui/Button'
import { AutomationCard } from './AutomationCard'
import { useAutomationsStore } from '../../stores/automations'

interface AutomationListProps {
  onCreateNew: () => void
  onEdit: (id: string) => void
}

export function AutomationList({ onCreateNew, onEdit }: AutomationListProps) {
  const { automations, toggleAutomation, deleteAutomation } = useAutomationsStore()

  if (automations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="rounded-full bg-surface-hover/[0.12] p-3">
          <Zap size={20} className="text-text-3" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-text-1">No automations yet</div>
          <div className="text-xs text-text-3">
            Create an automation to run skills on a schedule or trigger.
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={onCreateNew}>
          <Plus size={14} />
          Create Automation
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-3">{automations.length} automations</span>
        <Button variant="secondary" size="sm" onClick={onCreateNew}>
          <Plus size={14} />
          New
        </Button>
      </div>
      <div className="space-y-2">
        {automations.map((automation) => (
          <AutomationCard
            key={automation.id}
            automation={automation}
            onToggle={toggleAutomation}
            onEdit={onEdit}
            onDelete={deleteAutomation}
          />
        ))}
      </div>
    </div>
  )
}
