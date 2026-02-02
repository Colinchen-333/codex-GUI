import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react'
import { cn } from '../../lib/utils'
import {
  ToastContext,
  TOAST_MAX_STACK_SIZE,
  TOAST_PRIORITY,
  type Toast,
  type ToastInput,
} from './ToastContext'
import { useToast } from './useToast'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique toast ID
 */
function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Find an existing toast with the same groupId
 */
function findGroupedToast(toasts: Toast[], groupId: string | undefined): Toast | undefined {
  if (!groupId) return undefined
  return toasts.find((t) => t.groupId === groupId)
}

/**
 * Sort toasts by priority (higher priority first), then by timestamp (newer first)
 */
function sortToastsByPriority(toasts: Toast[]): Toast[] {
  return [...toasts].sort((a, b) => {
    const priorityDiff = TOAST_PRIORITY[b.type] - TOAST_PRIORITY[a.type]
    if (priorityDiff !== 0) return priorityDiff
    return b.timestamp - a.timestamp
  })
}

/**
 * Apply stack limit, removing lowest priority/oldest toasts first
 * High priority toasts are protected from being removed by lower priority ones
 */
function applyStackLimit(toasts: Toast[], newToast: Toast): Toast[] {
  if (toasts.length < TOAST_MAX_STACK_SIZE) {
    return [...toasts, newToast]
  }

  const newPriority = TOAST_PRIORITY[newToast.type]

  // Find the lowest priority toast that can be removed
  // Only remove a toast if the new one has equal or higher priority
  const sortedByRemovalOrder = [...toasts].sort((a, b) => {
    // Lower priority first (candidates for removal)
    const priorityDiff = TOAST_PRIORITY[a.type] - TOAST_PRIORITY[b.type]
    if (priorityDiff !== 0) return priorityDiff
    // Older first among same priority
    return a.timestamp - b.timestamp
  })

  const toastToRemove = sortedByRemovalOrder[0]
  const removePriority = TOAST_PRIORITY[toastToRemove.type]

  // Only remove if new toast has >= priority than the one being removed
  if (newPriority >= removePriority) {
    const filtered = toasts.filter((t) => t.id !== toastToRemove.id)
    return [...filtered, newToast]
  }

  // New toast has lower priority than all existing - don't add it
  return toasts
}

// ============================================================================
// Toast Provider
// ============================================================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((input: ToastInput) => {
    setToasts((prev) => {
      // Check for message grouping
      const existingGrouped = findGroupedToast(prev, input.groupId)

      if (existingGrouped) {
        // Merge with existing grouped toast - increment count and update timestamp
        return prev.map((t) =>
          t.id === existingGrouped.id
            ? {
                ...t,
                count: (t.count ?? 1) + 1,
                timestamp: Date.now(),
                // Update message if provided
                message: input.message ?? t.message,
              }
            : t
        )
      }

      // Create new toast
      const newToast: Toast = {
        ...input,
        id: generateToastId(),
        timestamp: Date.now(),
        count: 1,
      }

      // Apply stack limit with priority protection
      return applyStackLimit(prev, newToast)
    })
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  // Sort toasts for display (high priority first)
  const sortedToasts = sortToastsByPriority(toasts)

  return (
    <ToastContext.Provider value={{ toasts: sortedToasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

// ============================================================================
// Toast Container
// ============================================================================

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-3 pointer-events-none"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={() => removeToast(toast.id)} />
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Toast Item
// ============================================================================

const TOAST_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
} as const

const TOAST_STYLES: Record<Toast['type'], { bg: string; border: string; icon: string; progress: string }> = {
  info: {
    bg: 'bg-card/95 backdrop-blur-sm',
    border: 'border-blue-500/50',
    icon: 'text-blue-500',
    progress: 'bg-blue-500',
  },
  success: {
    bg: 'bg-card/95 backdrop-blur-sm',
    border: 'border-green-500/50',
    icon: 'text-green-500',
    progress: 'bg-green-500',
  },
  warning: {
    bg: 'bg-card/95 backdrop-blur-sm',
    border: 'border-yellow-500/50',
    icon: 'text-yellow-500',
    progress: 'bg-yellow-500',
  },
  error: {
    bg: 'bg-card/95 backdrop-blur-sm',
    border: 'border-red-500/50',
    icon: 'text-red-500',
    progress: 'bg-red-500',
  },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const onDismissRef = useRef(onDismiss)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(100)
  const startTimeRef = useRef(0)
  const remainingTimeRef = useRef(toast.duration ?? 5000)

  useLayoutEffect(() => {
    onDismissRef.current = onDismiss
  })

  useEffect(() => {
    const duration = toast.duration ?? 5000
    if (duration <= 0) return

    let animationFrame: number

    const updateProgress = () => {
      if (isPaused) return

      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, remainingTimeRef.current - elapsed)
      const newProgress = (remaining / duration) * 100

      setProgress(newProgress)

      if (remaining <= 0) {
        onDismissRef.current()
      } else {
        animationFrame = requestAnimationFrame(updateProgress)
      }
    }

    if (!isPaused) {
      startTimeRef.current = Date.now()
      animationFrame = requestAnimationFrame(updateProgress)
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
    }
  }, [toast.duration, toast.timestamp, isPaused])

  const handleMouseEnter = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed)
    setIsPaused(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    startTimeRef.current = Date.now()
    setIsPaused(false)
  }, [])

  const showCount = toast.count !== undefined && toast.count > 1
  const styles = TOAST_STYLES[toast.type]
  const IconComponent = TOAST_ICONS[toast.type]

  return (
    <div
      className={cn(
        'relative flex min-w-[320px] max-w-[420px] items-start gap-3 rounded-xl border p-4 shadow-xl overflow-hidden',
        styles.bg,
        styles.border,
        'animate-in slide-in-from-right-full fade-in duration-300'
      )}
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <IconComponent className={cn('h-5 w-5 shrink-0 mt-0.5', styles.icon)} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-foreground">{toast.title}</p>
          {showCount && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              ×{toast.count}
            </span>
          )}
        </div>
        {toast.message && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{toast.message}</p>
        )}
      </div>

      <button
        type="button"
        className="shrink-0 p-1 -m-1 text-muted-foreground/60 hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>

      {(toast.duration ?? 5000) > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30">
          <div
            className={cn('h-full transition-all duration-100', styles.progress)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// Re-export useToast for convenience
// eslint-disable-next-line react-refresh/only-export-components
export { useToast } from './useToast'
