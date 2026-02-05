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
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3',
          className
        )}
      >
        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
        <span className="text-sm text-emerald-600 dark:text-emerald-400">
          Worktree restored successfully
        </span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-600 dark:text-red-400">
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
        'flex items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <RotateCcw size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Worktree restore available
          </p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/80 truncate">
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
          className="bg-amber-600 text-white hover:bg-amber-700 border-0"
        >
          Restore
        </Button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
