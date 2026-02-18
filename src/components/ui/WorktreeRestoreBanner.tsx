import { useState } from 'react'
import { RotateCcw, X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

type RestoreStatus = 'idle' | 'restoring' | 'success' | 'error'

interface WorktreeRestoreBannerProps {
  snapshotDate?: string
  onRestore?: () => Promise<void>
  onDismiss?: () => void
  className?: string
}

export function WorktreeRestoreBanner({
  snapshotDate,
  onRestore,
  onDismiss,
  className,
}: WorktreeRestoreBannerProps) {
  const [status, setStatus] = useState<RestoreStatus>('idle')

  const handleRestore = async () => {
    if (!onRestore) return
    setStatus('restoring')
    try {
      await onRestore()
      setStatus('success')
    } catch {
      // Restore failed; surface error state in UI
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border border-status-success/30 bg-status-success-muted px-4 py-3',
          className
        )}
      >
        <CheckCircle2 size={16} className="text-status-success flex-shrink-0" />
        <span className="text-sm text-status-success">
          Worktree restored successfully
        </span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-xl border border-status-error/30 bg-status-error-muted px-4 py-3',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={16} className="text-status-error flex-shrink-0" />
          <span className="text-sm text-status-error">
            Failed to restore worktree. Please try again.
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setStatus('idle')}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl border border-status-warning/30 bg-status-warning-muted px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <RotateCcw size={16} className="text-status-warning flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-1">
            Worktree restore available
          </p>
          <p className="text-xs text-text-2 truncate">
            {snapshotDate
              ? `Restore workspace state from ${snapshotDate}`
              : 'Restore the workspace state from the latest snapshot'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRestore}
          loading={status === 'restoring'}
          className="bg-status-warning text-status-warning-foreground hover:bg-status-warning/90 border-0"
        >
          Restore
        </Button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-status-warning hover:text-status-warning/80 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
