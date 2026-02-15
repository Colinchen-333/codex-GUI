/**
 * GlobalApprovalsIndicator
 *
 * Shows a global (cross-thread) pending approvals count and provides a one-click
 * jump to the next approval (switch thread + scroll to item).
 */
import { memo, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { AlertTriangle } from 'lucide-react'
import { useThreadStore } from '../../../stores/thread'
import { useAppStore } from '../../../stores/app'
import { selectGlobalPendingApprovalSummary } from '../../../stores/thread/selectors'
import { cn } from '../../../lib/utils'

export const GlobalApprovalsIndicator = memo(function GlobalApprovalsIndicator({
  className,
}: {
  className?: string
}) {
  const { count, next } = useThreadStore(useShallow(selectGlobalPendingApprovalSummary))

  const handleJump = useCallback(() => {
    if (!next) return
    useThreadStore.getState().switchThread(next.threadId)
    useAppStore.getState().setScrollToItemId(next.itemId)
  }, [next])

  if (count === 0 || !next) return null

  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-md border px-2 text-text-2 transition-colors',
        'border-status-warning/30 bg-status-warning-muted hover:bg-status-warning-muted/80 hover:text-text-1',
        className
      )}
      onClick={handleJump}
      title="Jump to next approval"
      aria-label="Jump to next approval"
    >
      <AlertTriangle size={12} className="text-status-warning" aria-hidden="true" />
      <span className="text-[11px] font-medium">Approvals: {count}</span>
    </button>
  )
})
