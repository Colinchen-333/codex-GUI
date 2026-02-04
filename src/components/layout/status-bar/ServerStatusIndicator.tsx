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
      <div className="flex items-center gap-2">
        <div className="relative flex h-2.5 w-2.5">
          {isRunning && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-text-3/60 opacity-60" />
          )}
          <span
            className={cn(
              'relative inline-flex h-2.5 w-2.5 rounded-full',
              statusKnown ? (isRunning ? 'bg-text-2' : 'bg-text-3/70') : 'bg-text-3/40'
            )}
          />
        </div>
        <span className="flex items-center gap-1.5 text-xs text-text-2">
          <Activity size={12} strokeWidth={2.5} />
          Engine: {statusKnown ? (isRunning ? 'Running' : 'Stopped') : 'Checking'}
        </span>
      </div>

      {statusKnown && !isRunning && (
        <button
          className="text-text-2 hover:text-text-1 transition-colors text-xs font-medium"
          onClick={() => void handleRestart()}
        >
          Restart
        </button>
      )}
    </>
  )
})
