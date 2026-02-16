/**
 * ServerStatusIndicator - Server connection status component
 *
 * Displays server running/stopped status with restart functionality.
 * Memoized to prevent unnecessary re-renders.
 */
import { memo, useCallback, useEffect } from 'react'
import { Activity } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useServerConnectionStore } from '../../../stores/server-connection'

export interface ServerStatusIndicatorProps {
  onRestart?: () => void
}

export const ServerStatusIndicator = memo(function ServerStatusIndicator({
  onRestart,
}: ServerStatusIndicatorProps) {
  const { status, startMonitoring, attemptReconnect } = useServerConnectionStore()

  useEffect(() => {
    startMonitoring()
  }, [startMonitoring])

  const handleRestart = useCallback(async () => {
    await attemptReconnect({ forceRestart: true })
    onRestart?.()
  }, [attemptReconnect, onRestart])

  const statusKnown = status !== null
  const isRunning = status?.isRunning ?? false

  return (
    <>
      <div className="flex items-center gap-1.5">
        <div className="relative flex h-2 w-2">
          {isRunning && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-success/40 opacity-60" />
          )}
          <span
            className={cn(
              'relative inline-flex h-2 w-2 rounded-full',
              statusKnown
                ? (isRunning ? 'bg-status-success' : 'bg-status-error')
                : 'bg-surface-hover/[0.22]'
            )}
          />
        </div>
        <span className="flex items-center gap-1 text-xs text-text-2">
          <Activity size={11} strokeWidth={2.4} />
          Engine {statusKnown ? (isRunning ? 'online' : 'offline') : 'checking'}
        </span>
      </div>

      {statusKnown && !isRunning && (
        <button
          className="text-xs font-semibold text-text-2 transition-colors hover:text-text-1"
          onClick={() => void handleRestart()}
        >
          Restart
        </button>
      )}
    </>
  )
})
