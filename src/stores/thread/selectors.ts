/**
 * Thread Store Selectors
 *
 * Centralized selector functions to optimize Zustand store access patterns.
 * These selectors help prevent unnecessary re-renders by ensuring components
 * only subscribe to the specific state they need.
 *
 * Performance Benefits:
 * - Reduces re-renders by selecting only needed state
 * - Provides memoized selectors for expensive computations
 * - Centralizes state access logic for easier maintenance
 */

import type { ThreadState, SingleThreadState, AnyThreadItem, ThreadItemType } from './types'
import { defaultTokenUsage, defaultTurnTiming } from './utils'

const EMPTY_ITEMS: Record<string, AnyThreadItem> = {}
const EMPTY_ITEM_ORDER: string[] = []
const EMPTY_ORDERED_ITEMS: AnyThreadItem[] = []
const EMPTY_PENDING_APPROVALS: SingleThreadState['pendingApprovals'] = []
const EMPTY_QUEUED_MESSAGES: SingleThreadState['queuedMessages'] = []
const EMPTY_SESSION_OVERRIDES: SingleThreadState['sessionOverrides'] = {}

// ==================== Thread State Selectors ====================

/**
 * Select the focused thread's complete state.
 * Use this when you need access to multiple properties of the focused thread.
 */
export function selectFocusedThread(state: ThreadState): SingleThreadState | null {
  const { focusedThreadId, threads } = state
  return focusedThreadId ? threads[focusedThreadId] ?? null : null
}

/**
 * Select the focused thread ID only.
 * Use this when you only need to know which thread is focused.
 */
export function selectFocusedThreadId(state: ThreadState): string | null {
  return state.focusedThreadId
}

/**
 * Select all threads as an array.
 * Returns threads in insertion order (sorted by creation).
 * Memoized: returns the same array reference when threads/focusedThreadId haven't changed.
 */
// Cache for selectAllThreads to prevent new array on every call
let _cachedThreadsRef: Record<string, SingleThreadState> | null = null
let _cachedFocusedId: string | null = null
let _cachedSorted: SingleThreadState[] = []

export function selectAllThreads(state: ThreadState): SingleThreadState[] {
  const { threads, focusedThreadId } = state
  if (threads === _cachedThreadsRef && focusedThreadId === _cachedFocusedId) {
    return _cachedSorted
  }
  _cachedThreadsRef = threads
  _cachedFocusedId = focusedThreadId ?? null
  _cachedSorted = Object.values(threads).sort((a, b) => {
    // Focused thread first
    if (a.thread.id === focusedThreadId) return -1
    if (b.thread.id === focusedThreadId) return 1
    // Then by creation time (newest first)
    const aTime = a.thread.createdAt ?? 0
    const bTime = b.thread.createdAt ?? 0
    return bTime - aTime
  })
  return _cachedSorted
}

/**
 * Select a specific thread by ID.
 * Returns null if thread doesn't exist.
 */
export function selectThreadById(threadId: string) {
  return (state: ThreadState): SingleThreadState | null => {
    return state.threads[threadId] ?? null
  }
}

// ==================== Thread Status Selectors ====================

/**
 * Select the turn status of the focused thread.
 */
export function selectTurnStatus(state: ThreadState): SingleThreadState['turnStatus'] {
  const focusedThread = selectFocusedThread(state)
  return focusedThread?.turnStatus ?? 'idle'
}

/**
 * Select whether the focused thread is currently running a turn.
 */
export function selectIsTurnRunning(state: ThreadState): boolean {
  return selectTurnStatus(state) === 'running'
}

/**
 * Select whether the focused thread is idle.
 */
export function selectIsIdle(state: ThreadState): boolean {
  return selectTurnStatus(state) === 'idle'
}

/**
 * Select the error state of the focused thread.
 */
export function selectThreadError(state: ThreadState): string | null {
  const focusedThread = selectFocusedThread(state)
  return focusedThread?.error ?? null
}

// ==================== Item Selectors ====================

/**
 * Select all items from the focused thread.
 * Returns items in their display order.
 */
export function selectItems(state: ThreadState): Record<string, AnyThreadItem> {
  const focusedThread = selectFocusedThread(state)
  return focusedThread?.items ?? EMPTY_ITEMS
}

/**
 * Select the item order array from the focused thread.
 */
export function selectItemOrder(state: ThreadState): string[] {
  const focusedThread = selectFocusedThread(state)
  return focusedThread?.itemOrder ?? EMPTY_ITEM_ORDER
}

/**
 * Select items as an ordered array.
 * This is more convenient than working with the Record and order array separately.
 */
let cachedOrderedItems: AnyThreadItem[] = []
let cachedItemsRef: Record<string, AnyThreadItem> | null = null
let cachedItemOrderRef: string[] | null = null
let cachedThreadId: string | null = null

export function selectOrderedItems(state: ThreadState): AnyThreadItem[] {
  const focusedThread = selectFocusedThread(state)
  if (!focusedThread) return EMPTY_ORDERED_ITEMS
  const { items, itemOrder } = focusedThread
  if (
    cachedThreadId === focusedThread.thread.id &&
    cachedItemsRef === items &&
    cachedItemOrderRef === itemOrder
  ) {
    return cachedOrderedItems
  }
  cachedThreadId = focusedThread.thread.id
  cachedItemsRef = items
  cachedItemOrderRef = itemOrder
  cachedOrderedItems = itemOrder.map((id) => items[id]).filter((item): item is AnyThreadItem => item !== undefined)
  return cachedOrderedItems
}

/**
 * Select a specific item by ID from the focused thread.
 */
export function selectItemById(itemId: string) {
  return (state: ThreadState): AnyThreadItem | null => {
    const items = selectItems(state)
    return items[itemId] ?? null
  }
}

/**
 * Select items of a specific type from the focused thread.
 */
export function selectItemsByType(itemType: ThreadItemType) {
  // Cache filtered results to ensure selector output is referentially stable.
  // Returning a new array on every call can break useSyncExternalStore expectations
  // and trigger infinite update loops (especially in Strict Mode / tests).
  let cachedOrderedItemsRef: AnyThreadItem[] | null = null
  let cachedFilteredItems: AnyThreadItem[] = []
  return (state: ThreadState): AnyThreadItem[] => {
    const ordered = selectOrderedItems(state)
    if (ordered === cachedOrderedItemsRef) return cachedFilteredItems
    cachedOrderedItemsRef = ordered
    cachedFilteredItems = ordered.filter((item) => item.type === itemType)
    return cachedFilteredItems
  }
}

/**
 * Select only user messages from the focused thread.
 */
export function selectUserMessages(state: ThreadState): AnyThreadItem[] {
  return selectItemsByType('userMessage')(state)
}

/**
 * Select only agent messages from the focused thread.
 */
export function selectAgentMessages(state: ThreadState): AnyThreadItem[] {
  return selectItemsByType('agentMessage')(state)
}

/**
 * Select only command execution items from the focused thread.
 */
export function selectCommandExecutions(state: ThreadState): AnyThreadItem[] {
  return selectItemsByType('commandExecution')(state)
}

/**
 * Select only file change items from the focused thread.
 */
export function selectFileChanges(state: ThreadState): AnyThreadItem[] {
  return selectItemsByType('fileChange')(state)
}

// ==================== Approval Selectors ====================

/**
 * Select all pending approvals from the focused thread.
 */
export function selectPendingApprovals(state: ThreadState): SingleThreadState['pendingApprovals'] {
  const focusedThread = selectFocusedThread(state)
  return focusedThread?.pendingApprovals ?? EMPTY_PENDING_APPROVALS
}

/**
 * Select the count of pending approvals for the focused thread.
 */
export function selectPendingApprovalCount(state: ThreadState): number {
  return selectPendingApprovals(state).length
}

/**
 * Select whether the focused thread has any pending approvals.
 */
export function selectHasPendingApprovals(state: ThreadState): boolean {
  return selectPendingApprovalCount(state) > 0
}

/**
 * Select pending approvals of a specific type.
 */
export function selectPendingApprovalsByType(type: 'command' | 'fileChange') {
  return (state: ThreadState): SingleThreadState['pendingApprovals'] => {
    return selectPendingApprovals(state).filter((p) => p.type === type)
  }
}

// ==================== Cross-Thread Approval Selectors (Multi-Agent) ====================

// Cache for selectPendingApprovalsByThread to prevent new object on every call
let _cachedApprovalsByThreadRef: Record<string, SingleThreadState> | null = null
let _cachedApprovalsByThreadResult: Record<string, SingleThreadState['pendingApprovals']> = {}

export function selectPendingApprovalsByThread(state: ThreadState): Record<string, SingleThreadState['pendingApprovals']> {
  const { threads } = state
  if (threads === _cachedApprovalsByThreadRef) {
    return _cachedApprovalsByThreadResult
  }
  _cachedApprovalsByThreadRef = threads
  const result: Record<string, SingleThreadState['pendingApprovals']> = {}
  for (const threadId of Object.keys(threads)) {
    const threadState = threads[threadId]
    if (threadState && threadState.pendingApprovals.length > 0) {
      result[threadId] = threadState.pendingApprovals
    }
  }
  _cachedApprovalsByThreadResult = result
  return result
}

export function selectGlobalPendingApprovalCount(state: ThreadState): number {
  let count = 0
  for (const threadId of Object.keys(state.threads)) {
    const threadState = state.threads[threadId]
    if (threadState) {
      count += threadState.pendingApprovals.length
    }
  }
  return count
}

export type GlobalPendingApprovalSummary = {
  count: number
  next: SingleThreadState['pendingApprovals'][number] | null
}

/**
 * Select a global (cross-thread) summary of pending approvals:
 * - total count across all threads
 * - the earliest (by createdAt) pending approval, if any
 */
// Cache for selectGlobalPendingApprovalSummary to prevent new object on every call
let _cachedSummaryThreadsRef: Record<string, SingleThreadState> | null = null
let _cachedSummaryResult: GlobalPendingApprovalSummary = { count: 0, next: null }

export function selectGlobalPendingApprovalSummary(state: ThreadState): GlobalPendingApprovalSummary {
  const { threads } = state
  if (threads === _cachedSummaryThreadsRef) {
    return _cachedSummaryResult
  }
  _cachedSummaryThreadsRef = threads

  let count = 0
  let next: SingleThreadState['pendingApprovals'][number] | null = null

  for (const threadState of Object.values(threads)) {
    if (!threadState) continue
    const pending = threadState.pendingApprovals
    if (!pending || pending.length === 0) continue
    count += pending.length
    for (const approval of pending) {
      if (!next || approval.createdAt < next.createdAt) next = approval
    }
  }

  _cachedSummaryResult = { count, next }
  return _cachedSummaryResult
}

export function selectGlobalNextPendingApproval(state: ThreadState): SingleThreadState['pendingApprovals'][number] | null {
  return selectGlobalPendingApprovalSummary(state).next
}

export function selectPendingApprovalsForThread(threadId: string) {
  return (state: ThreadState): SingleThreadState['pendingApprovals'] => {
    return state.threads[threadId]?.pendingApprovals ?? EMPTY_PENDING_APPROVALS
  }
}

// ==================== Queue Selectors ====================

/**
 * Select all queued messages for the focused thread.
 */
export function selectQueuedMessages(state: ThreadState): SingleThreadState['queuedMessages'] {
  const focusedThread = selectFocusedThread(state)
  return focusedThread?.queuedMessages ?? EMPTY_QUEUED_MESSAGES
}

/**
 * Select the count of queued messages for the focused thread.
 */
export function selectQueuedMessageCount(state: ThreadState): number {
  return selectQueuedMessages(state).length
}

/**
 * Select whether the focused thread has any queued messages.
 */
export function selectHasQueuedMessages(state: ThreadState): boolean {
  return selectQueuedMessageCount(state) > 0
}

// ==================== Token Usage Selectors ====================

/**
 * Select token usage information for the focused thread.
 */
export function selectTokenUsage(state: ThreadState): SingleThreadState['tokenUsage'] {
  const focusedThread = selectFocusedThread(state)
  return focusedThread?.tokenUsage ?? defaultTokenUsage
}

/**
 * Select the total token count for the focused thread.
 */
export function selectTotalTokens(state: ThreadState): number {
  return selectTokenUsage(state).totalTokens
}

/**
 * Select the percentage of context window used.
 * Returns null if context window size is unknown.
 */
export function selectContextWindowUsage(state: ThreadState): number | null {
  const { totalTokens, modelContextWindow } = selectTokenUsage(state)
  return modelContextWindow !== null ? (totalTokens / modelContextWindow) * 100 : null
}

// ==================== Turn Timing Selectors ====================

/**
 * Select turn timing information for the focused thread.
 */
export function selectTurnTiming(state: ThreadState): SingleThreadState['turnTiming'] {
  const focusedThread = selectFocusedThread(state)
  return focusedThread?.turnTiming ?? defaultTurnTiming
}

/**
 * Select the current turn duration in milliseconds.
 * Returns null if no turn is in progress.
 */
export function selectTurnDuration(state: ThreadState): number | null {
  const { startedAt, completedAt } = selectTurnTiming(state)
  if (startedAt === null) return null
  const endTime = completedAt ?? Date.now()
  return endTime - startedAt
}

// ==================== Session Override Selectors ====================

/**
 * Select session overrides for the focused thread.
 */
export function selectSessionOverrides(state: ThreadState): SingleThreadState['sessionOverrides'] {
  const focusedThread = selectFocusedThread(state)
  return focusedThread?.sessionOverrides ?? EMPTY_SESSION_OVERRIDES
}

/**
 * Select a specific session override value.
 */
export function selectSessionOverride(key: keyof SingleThreadState['sessionOverrides']) {
  return (state: ThreadState): string | undefined => {
    return selectSessionOverrides(state)[key]
  }
}

// ==================== Multi-Session Selectors ====================

/**
 * Select the maximum number of allowed parallel sessions.
 */
export function selectMaxSessions(state: ThreadState): number {
  return state.maxSessions
}

/**
 * Select the count of active sessions.
 */
export function selectActiveSessionCount(state: ThreadState): number {
  return Object.keys(state.threads).length
}

/**
 * Select whether a new session can be added.
 */
export function selectCanAddSession(state: ThreadState): boolean {
  return selectActiveSessionCount(state) < selectMaxSessions(state)
}

/**
 * Select active thread IDs as an array.
 */
export function selectActiveThreadIds(state: ThreadState): string[] {
  return Object.keys(state.threads)
}

// ==================== Computed Selectors ====================

/**
 * Select whether the application is currently loading.
 */
export function selectIsLoading(state: ThreadState): boolean {
  return state.isLoading
}

/**
 * Select the global error state.
 */
export function selectGlobalError(state: ThreadState): string | null {
  return state.globalError
}

/**
 * Select snapshots array.
 */
export function selectSnapshots(state: ThreadState): ThreadState['snapshots'] {
  return state.snapshots
}

// ==================== Aliases ====================

/**
 * Select the active thread.
 * Alias for selectFocusedThread for convenience.
 */
export const selectActiveThread = selectFocusedThread
