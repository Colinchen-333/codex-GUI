/**
 * TurnStatusIndicator - Turn execution status component
 *
 * Displays running turn status with elapsed time, token rate, and pending approvals.
 * Memoized to prevent unnecessary re-renders.
 */
import { memo, useEffect, useState, useRef } from 'react'
import { Clock, Zap } from 'lucide-react'
import { useThreadStore } from '../../../stores/thread'
import { selectTurnStatus, selectTurnTiming, selectPendingApprovals } from '../../../stores/thread/selectors'

// Format elapsed time compactly like CLI: "0s", "1m 30s", "1h 05m 30s"
function formatElapsedCompact(ms: number): string {
  const totalSecs = Math.floor(ms / 1000)
  if (totalSecs < 60) return `${totalSecs}s`
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  if (mins < 60) return `${mins}m ${secs.toString().padStart(2, '0')}s`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return `${hours}h ${remMins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
}

export const TurnStatusIndicator = memo(function TurnStatusIndicator() {
  const turnStatus = useThreadStore(selectTurnStatus)
  const turnTiming = useThreadStore(selectTurnTiming)
  const pendingApprovals = useThreadStore(selectPendingApprovals)

  const [elapsedMs, setElapsedMs] = useState(0)
  const [tokenRate, setTokenRate] = useState(0)
  const prevTokensRef = useRef(0)
  const prevTimeRef = useRef(0)

  // Real-time elapsed time + token rate update when running (50ms for smooth display)
  useEffect(() => {
    // Only setup interval when running
    if (turnStatus !== 'running' || !turnTiming.startedAt) {
      return
    }

    // Reset refs when starting - use getState() to avoid dependency on tokenUsage
    const initialTokens = useThreadStore.getState().tokenUsage.totalTokens
    prevTokensRef.current = initialTokens
    prevTimeRef.current = Date.now()

    // Update elapsed time every 50ms for CLI-like smooth display
    const interval = setInterval(() => {
      const now = Date.now()
      const startedAt = useThreadStore.getState().turnTiming.startedAt
      if (startedAt) {
        setElapsedMs(now - startedAt)
      }

      // Calculate token rate every 500ms for stability
      const timeDelta = (now - prevTimeRef.current) / 1000
      if (timeDelta >= 0.5) {
        const currentTokens = useThreadStore.getState().tokenUsage.totalTokens
        const tokenDelta = currentTokens - prevTokensRef.current
        if (tokenDelta > 0 && timeDelta > 0) {
          setTokenRate(Math.round(tokenDelta / timeDelta))
        }
        prevTokensRef.current = currentTokens
        prevTimeRef.current = now
      }
    }, 50)
    return () => clearInterval(interval)
  }, [turnStatus, turnTiming.startedAt])

  // Reset elapsed when turn completes
  /* eslint-disable react-hooks/set-state-in-effect -- Intentional: reset state when turn status changes */
  useEffect(() => {
    if (turnStatus !== 'running') {
      setElapsedMs(0)
      setTokenRate(0)
    }
  }, [turnStatus])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Don't render if not running
  if (turnStatus !== 'running') {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-text-2">
      {/* Shimmer effect spinner */}
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-text-3/60 opacity-60 animate-ping" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-text-2/80" />
      </span>

      {/* Shimmer text effect */}
      <span className="uppercase tracking-widest text-xs font-medium">
        Working
      </span>

      {/* Pending approvals badge */}
      {pendingApprovals.length > 0 && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-surface-hover/[0.16] text-text-2 text-xs font-medium">
          {pendingApprovals.length} pending
        </span>
      )}

      {/* Token rate */}
      {tokenRate > 0 && (
        <span className="flex items-center gap-1 text-xs text-text-3">
          <Zap size={10} />
          {tokenRate} tok/s
        </span>
      )}

      {/* Elapsed time */}
      <span className="flex items-center gap-1 text-xs text-text-3">
        <Clock size={11} />
        {formatElapsedCompact(elapsedMs)}
      </span>

      {/* Interrupt hint */}
      <span className="text-xs text-text-3/70">esc</span>
    </div>
  )
})
