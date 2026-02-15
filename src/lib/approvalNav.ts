import { useAppStore } from '../stores/app'
import { useThreadStore } from '../stores/thread'

function getNextPendingApprovalItemId(threadId: string, afterCreatedAt?: number): string | null {
  const threadState = useThreadStore.getState() as unknown as {
    threads?: Record<string, { pendingApprovals?: Array<{ itemId: string; createdAt: number }> }>
  }
  const pending = threadState.threads?.[threadId]?.pendingApprovals ?? []
  if (pending.length === 0) return null

  const sorted = [...pending].sort((a, b) => a.createdAt - b.createdAt)
  if (typeof afterCreatedAt === 'number') {
    const nextAfter = sorted.find((p) => p.createdAt > afterCreatedAt)
    if (nextAfter) return nextAfter.itemId
  }
  return sorted[0]?.itemId ?? null
}

export function focusNextApprovalInThreadOrInput(threadId: string, afterCreatedAt?: number): void {
  const threadState = useThreadStore.getState() as unknown as { focusedThreadId?: string | null }
  // Only move focus within the currently focused thread. Avoid surprising cross-thread jumps.
  if (threadState.focusedThreadId !== threadId) {
    useAppStore.getState().triggerFocusInput()
    return
  }

  const nextItemId = getNextPendingApprovalItemId(threadId, afterCreatedAt)
  if (nextItemId) {
    useAppStore.getState().setScrollToItemId(nextItemId)
    return
  }

  useAppStore.getState().triggerFocusInput()
}
