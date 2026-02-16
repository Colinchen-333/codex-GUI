/**
 * RateLimitWarning - Shows when approaching quota (like CLI's "Heads up...")
 * Memoized to prevent unnecessary re-renders when only unrelated state changes
 */
import { memo, useState, useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { useAccountStore } from '../../../stores/account'

export const RateLimitWarning = memo(function RateLimitWarning() {
  const rateLimits = useAccountStore((state) => state.rateLimits)
  // refreshRateLimits is called via getState() to avoid dependency issues
  const [dismissed, setDismissed] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  // Refresh rate limits periodically when mounted
  useEffect(() => {
    // Use getState() to avoid dependency on refreshRateLimits function
    void useAccountStore.getState().refreshRateLimits()
    const interval = setInterval(() => {
      void useAccountStore.getState().refreshRateLimits()
    }, 60000) // Every minute
    return () => clearInterval(interval)
  }, []) // No dependencies - uses getState()

  // Reset dismissed state when limits change significantly
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting dismissed state when limits change
    setDismissed(false)
  }, [rateLimits?.primary?.usedPercent])

  // Update now periodically to keep time current
  useEffect(() => {
    const updateNow = () => {
      setNow(Date.now())
    }
    const nowInterval = setInterval(updateNow, 1000) // Update every second
    return () => clearInterval(nowInterval)
  }, [])

  if (dismissed || !rateLimits) return null

  const primary = rateLimits.primary
  const secondary = rateLimits.secondary

  // Show warning if primary or secondary is above 70%
  const primaryHigh = primary && primary.usedPercent >= 70
  const secondaryHigh = secondary && secondary.usedPercent >= 70

  if (!primaryHigh && !secondaryHigh) return null

  const formatResetTime = (resetsAt?: number | null) => {
    if (!resetsAt) return null
    const diffMs = resetsAt - now
    if (diffMs <= 0) return 'soon'
    const mins = Math.ceil(diffMs / 60000)
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  const resetTime = formatResetTime(primary?.resetsAt)

  return (
    <div className="mb-3 px-4 py-3 rounded-2xl bg-status-warning-muted border border-status-warning/30 shadow-[var(--shadow-1)] animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-status-warning shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-status-warning">
            Heads up: Approaching rate limit
          </div>
          <div className="text-xs text-text-3 mt-1 space-y-0.5">
            {primaryHigh && (
              <div>
                Primary: {Math.round(primary!.usedPercent)}% used
                {resetTime && ` • resets in ${resetTime}`}
              </div>
            )}
            {secondaryHigh && <div>Secondary: {Math.round(secondary!.usedPercent)}% used</div>}
            {rateLimits.planType && (
              <div className="opacity-70">Plan: {rateLimits.planType}</div>
            )}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 -m-1 rounded-md text-text-3 hover:text-text-1 hover:bg-surface-hover/[0.06] transition-colors"
          aria-label="Dismiss rate limit warning"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
})
