import { memo } from 'react'
import { cn } from '../../lib/utils'

export const PendingApprovalDotButton = memo(function PendingApprovalDotButton({
  count,
  disabled,
  onJump,
  className,
}: {
  count: number
  disabled?: boolean
  onJump: () => void
  className?: string
}) {
  if (count <= 0) return null

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'relative flex h-5 w-5 items-center justify-center rounded',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onClick={(e) => {
        e.stopPropagation()
        onJump()
      }}
      title={`Jump to pending approval (${count})`}
      aria-label={`Jump to pending approval (${count})`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-warning opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-status-warning" />
      </span>
    </button>
  )
})

