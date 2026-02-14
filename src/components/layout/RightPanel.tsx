import { ChevronLeft } from 'lucide-react'
import { ReviewPane } from '../review/ReviewPane'
import { cn } from '../../lib/utils'

interface RightPanelProps {
  isOpen: boolean
  onClose: () => void
  onCommit?: () => void
}

export function RightPanel({ isOpen, onClose, onCommit }: RightPanelProps) {
  return <ReviewPane isOpen={isOpen} onClose={onClose} onCommit={onCommit} />
}

export function RightPanelToggle({ onClick, hasChanges }: { onClick: () => void; hasChanges?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors",
        hasChanges
          ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          : "border-stroke/30 bg-surface-solid text-text-2 hover:bg-surface-hover/[0.08]"
      )}
      title="Show changes panel"
    >
      <ChevronLeft size={12} />
      Changes
    </button>
  )
}
