/**
 * TurnStatusIndicator - Turn execution status component
 *
 * Displays running turn status with elapsed time, token rate, and pending approvals.
 * Memoized to prevent unnecessary re-renders.
 */
import { memo, useEffect, useState, useRef } from 'react'
import { Clock, Zap } from 'lucide-react'
import { useThreadStore } from '../../../stores/thread'
import { selectTurnStatus, selectTurnTiming, selectTokenUsage, selectPendingApprovals } from '../../../stores/thread/selectors'
import { useAppStore } from '../../../stores/app'

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
  const setScrollToItemId = useAppStore((s) => s.setScrollToItemId)

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
    const initialTokens = selectTokenUsage(useThreadStore.getState()).totalTokens
    prevTokensRef.current = initialTokens
    prevTimeRef.current = Date.now()

    // Update elapsed time every 50ms for CLI-like smooth display
    const interval = setInterval(() => {
      const now = Date.now()
      const startedAt = selectTurnTiming(useThreadStore.getState()).startedAt
      if (startedAt) {
        setElapsedMs(now - startedAt)
      }

      // Calculate token rate every 500ms for stability
      const timeDelta = (now - prevTimeRef.current) / 1000
      if (timeDelta >= 0.5) {
        const currentTokens = selectTokenUsage(useThreadStore.getState()).totalTokens
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
    <div className="flex items-center gap-1.5 text-text-2">
      {/* Shimmer effect spinner */}
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>

      {/* Shimmer text effect */}
      <span className="uppercase tracking-[0.2em] text-[10px] font-medium opacity-80 animate-breathe-text">
        Thinking
      </span>

      {/* Pending approvals badge */}
      {pendingApprovals.length > 0 && (
        <button
          type="button"
          className="flex items-center gap-1 rounded-md bg-surface-hover/[0.08] px-1.5 py-0.5 text-xs font-semibold text-text-2 hover:bg-surface-hover/[0.12] transition-colors"
          onClick={() => setScrollToItemId(pendingApprovals[0].itemId)}
          title="Jump to pending approval"
          aria-label="Jump to pending approval"
        >
          {pendingApprovals.length} pending
        </button>
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
      <span className="text-xs text-text-3 opacity-70">esc</span>
    </div>
  )
})
