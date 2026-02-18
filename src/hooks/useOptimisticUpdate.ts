/**
 * useOptimisticUpdate Hook
 *
 * Provides optimistic updates with automatic rollback. Allows UI to update
 * immediately before async operations complete, and automatically rolls back
 * to the previous state on failure.
 *
 * Features:
 * - Optimistic update: Apply state changes immediately
 * - Auto rollback: Restore original state on failure
 * - Nested rollback: Rollback stack for multiple operations
 * - Manual rollback API: Trigger rollback at any time
 *
 * @example
 * const { execute, isLoading, error, rollback } = useOptimisticUpdate({
 *   execute: () => api.updateUser(userId, newData),
 *   optimisticUpdate: () => {
 *     const previousState = store.getState().user
 *     store.setState({ user: newData })
 *     return previousState // Return previous state for rollback
 *   },
 *   onError: (error, rollbackFn) => {
 *     console.error('Update failed:', error)
 *     // Auto rollback is enabled, or manually call rollbackFn()
 *   },
 *   autoRollback: true
 * })
 */

import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Rollback operation record
 */
interface RollbackEntry<T> {
  /** Unique identifier */
  id: string
  /** Previous state */
  previousState: T
  /** Rollback function */
  rollbackFn: (state: T) => void
  /** Creation timestamp */
  timestamp: number
}

/**
 * Optimistic update configuration options
 */
export interface UseOptimisticUpdateOptions<T, R> {
  /**
   * Execute the actual async operation
   */
  execute: () => Promise<R>

  /**
   * Apply optimistic state update
   * Should return the previous state for rollback
   */
  optimisticUpdate: () => T

  /**
   * Rollback function - restores state to the previous value
   * If not provided, default rollback logic will be used
   */
  rollbackFn?: (previousState: T) => void

  /**
   * Success callback
   */
  onSuccess?: (result: R) => void

  /**
   * Error callback
   * @param error - The error that occurred
   * @param rollback - Manual rollback function
   */
  onError?: (error: Error, rollback: () => void) => void

  /**
   * Whether to auto-rollback on failure (default true)
   * If false, rollback must be called manually in onError
   */
  autoRollback?: boolean

  /**
   * Whether to ignore results after unmount (default true)
   */
  ignoreOnUnmount?: boolean

  /**
   * Unique operation identifier for nested rollback
   */
  operationId?: string

  /**
   * Rollback stack scope identifier for component isolation
   */
  scopeId?: string
}

/**
 * Optimistic update hook return value
 */
export interface UseOptimisticUpdateReturn<R> {
  /** Execute the optimistic update operation */
  execute: () => Promise<R | undefined>
  /** Whether the operation is loading */
  isLoading: boolean
  /** Error information */
  error: Error | null
  /** Manually rollback to the previous state */
  rollback: () => void
  /** Rollback to a specific operation */
  rollbackTo: (operationId: string) => void
  /** Clear rollback history */
  clearRollbackHistory: () => void
  /** Get rollback history records */
  getRollbackHistory: () => Array<{ id: string; timestamp: number }>
  /** Check if there is a rollback-able state (function form to avoid ref access during render) */
  getCanRollback: () => boolean
}

/**
 * Global rollback stack manager
 * Supports nested rollback across components
 */
class RollbackStackManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stack: RollbackEntry<any>[] = []
  private maxSize = 50 // Maximum rollback history size

  push<T>(entry: RollbackEntry<T>): void {
    this.stack.push(entry)
    // Limit stack size
    if (this.stack.length > this.maxSize) {
      this.stack.shift()
    }
  }

  pop<T>(): RollbackEntry<T> | undefined {
    return this.stack.pop()
  }

  findById<T>(id: string): RollbackEntry<T> | undefined {
    return this.stack.find((entry) => entry.id === id)
  }

  removeById(id: string): boolean {
    const index = this.stack.findIndex((entry) => entry.id === id)
    if (index !== -1) {
      this.stack.splice(index, 1)
      return true
    }
    return false
  }

  rollbackTo<T>(id: string): RollbackEntry<T>[] {
    const index = this.stack.findIndex((entry) => entry.id === id)
    if (index === -1) return []

    // Rollback all operations from stack top to the target (inclusive)
    const entriesToRollback = this.stack.splice(index)
    return entriesToRollback.reverse()
  }

  getHistory(): Array<{ id: string; timestamp: number }> {
    return this.stack.map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
    }))
  }

  clear(): void {
    this.stack = []
  }

  get size(): number {
    return this.stack.length
  }
}

interface RollbackStackEntry {
  stack: RollbackStackManager
  refs: number
}

const rollbackStacks = new Map<string, RollbackStackEntry>()

function acquireRollbackStack(scopeId: string): RollbackStackManager {
  let entry = rollbackStacks.get(scopeId)
  if (!entry) {
    entry = { stack: new RollbackStackManager(), refs: 0 }
    rollbackStacks.set(scopeId, entry)
  }
  entry.refs += 1
  return entry.stack
}

function releaseRollbackStack(scopeId: string): void {
  const entry = rollbackStacks.get(scopeId)
  if (!entry) return
  entry.refs -= 1
  if (entry.refs <= 0) {
    rollbackStacks.delete(scopeId)
  }
}

export function clearGlobalRollbackStack(): void {
  rollbackStacks.clear()
}

if (import.meta && 'hot' in import.meta) {
  (import.meta as { hot?: { dispose: (cb: () => void) => void } }).hot?.dispose(() => {
    clearGlobalRollbackStack()
  })
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Optimistic update hook
 *
 * Provides a unified optimistic update pattern:
 * - Apply state changes immediately
 * - Auto-rollback on failure
 * - Nested operation rollback management
 * - Manual rollback API
 *
 * @param options - Configuration options
 * @returns Optimistic update control interface
 */
export function useOptimisticUpdate<T, R>(
  options: UseOptimisticUpdateOptions<T, R>
): UseOptimisticUpdateReturn<R> {
  const {
    execute: executeAsync,
    optimisticUpdate,
    rollbackFn,
    onSuccess,
    onError,
    autoRollback = true,
    ignoreOnUnmount = true,
    operationId: customOperationId,
    scopeId,
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Component mount state
  const isMountedRef = useRef(true)
  // Current operation ID
  const currentOperationIdRef = useRef<string | null>(null)
  const scopeIdRef = useRef(scopeId ?? generateId())
  const rollbackStackRef = useRef<RollbackStackManager | null>(null)
  const hasAcquiredRef = useRef(false)
  // Local rollback stack (for component-level rollback)
  const localRollbackStackRef = useRef<RollbackEntry<T>[]>([])

  const ensureRollbackStack = useCallback(() => {
    if (!rollbackStackRef.current) {
      rollbackStackRef.current = acquireRollbackStack(scopeIdRef.current)
      hasAcquiredRef.current = true
    }
    return rollbackStackRef.current
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    ensureRollbackStack()
    // Capture current ref values for cleanup to avoid stale closure
    const scopeId = scopeIdRef.current
    const localStack = localRollbackStackRef.current
    const rollbackStack = rollbackStackRef.current
    return () => {
      isMountedRef.current = false
      if (localStack.length > 0) {
        for (const entry of localStack) {
          rollbackStack?.removeById(entry.id)
        }
        localRollbackStackRef.current = []
      }
      if (hasAcquiredRef.current) {
        releaseRollbackStack(scopeId)
        hasAcquiredRef.current = false
      }
    }
  }, [ensureRollbackStack])

  /**
   * Execute a single rollback operation
   */
  const executeRollback = useCallback(
    (entry: RollbackEntry<T>) => {
      if (rollbackFn) {
        rollbackFn(entry.previousState)
      }
    },
    [rollbackFn]
  )

  /**
   * Manually rollback to the previous state
   */
  const rollback = useCallback(() => {
    // Try local stack rollback first
    const localEntry = localRollbackStackRef.current.pop()
    if (localEntry) {
      executeRollback(localEntry)
      ensureRollbackStack().removeById(localEntry.id)
      return
    }

    // If local stack is empty, rollback from global stack
    const globalEntry = ensureRollbackStack().pop<T>()
    if (globalEntry && rollbackFn) {
      rollbackFn(globalEntry.previousState)
    }
  }, [executeRollback, rollbackFn, ensureRollbackStack])

  /**
   * Rollback to a specific operation
   */
  const rollbackTo = useCallback(
    (targetOperationId: string) => {
      const entries = ensureRollbackStack().rollbackTo<T>(targetOperationId)
      entries.forEach((entry) => {
        if (rollbackFn) {
          rollbackFn(entry.previousState)
        }
      })

      // Sync local stack
      localRollbackStackRef.current = localRollbackStackRef.current.filter(
        (entry) => !entries.some((e) => e.id === entry.id)
      )
    },
    [rollbackFn, ensureRollbackStack]
  )

  /**
   * Clear rollback history
   */
  const clearRollbackHistory = useCallback(() => {
    localRollbackStackRef.current = []
    ensureRollbackStack().clear()
  }, [ensureRollbackStack])

  /**
   * Get rollback history records
   */
  const getRollbackHistory = useCallback(() => {
    return ensureRollbackStack().getHistory()
  }, [ensureRollbackStack])

  /**
   * Execute the optimistic update operation
   */
  const execute = useCallback(async (): Promise<R | undefined> => {
    const operationId = customOperationId || generateId()
    currentOperationIdRef.current = operationId

    setIsLoading(true)
    setError(null)

    // 1. Apply optimistic update and save previous state
    let previousState: T
    try {
      previousState = optimisticUpdate()
    } catch (err) {
      const updateError = err instanceof Error ? err : new Error(String(err))
      setError(updateError)
      setIsLoading(false)
      return undefined
    }

    // 2. Create rollback entry
    const rollbackEntry: RollbackEntry<T> = {
      id: operationId,
      previousState,
      rollbackFn: rollbackFn || (() => {}),
      timestamp: Date.now(),
    }

    // Push to rollback stack
    localRollbackStackRef.current.push(rollbackEntry)
    ensureRollbackStack().push(rollbackEntry)

    try {
      // 3. Execute the actual async operation
      const result = await executeAsync()

      // 4. Operation succeeded, remove from rollback stack
      if (isMountedRef.current || !ignoreOnUnmount) {
        setIsLoading(false)
        setError(null)

        // Clear rollback entry for this operation on success
        localRollbackStackRef.current = localRollbackStackRef.current.filter(
          (entry) => entry.id !== operationId
        )
        ensureRollbackStack().removeById(operationId)

        onSuccess?.(result)
      }

      return result
    } catch (err) {
      const asyncError = err instanceof Error ? err : new Error(String(err))

      if (isMountedRef.current || !ignoreOnUnmount) {
        setError(asyncError)
        setIsLoading(false)

        // Create rollback function for onError callback
        const manualRollback = () => {
          const entry = localRollbackStackRef.current.find(
            (e) => e.id === operationId
          )
          if (entry && rollbackFn) {
            rollbackFn(entry.previousState)
            localRollbackStackRef.current = localRollbackStackRef.current.filter(
              (e) => e.id !== operationId
            )
            ensureRollbackStack().removeById(operationId)
          }
        }

        // 5. If auto-rollback is enabled, execute rollback immediately
        if (autoRollback && rollbackFn) {
          const entry = localRollbackStackRef.current.find(
            (e) => e.id === operationId
          )
          if (entry) {
            rollbackFn(entry.previousState)
            localRollbackStackRef.current = localRollbackStackRef.current.filter(
              (e) => e.id !== operationId
            )
            ensureRollbackStack().removeById(operationId)
          }
        }

        // Call error callback
        onError?.(asyncError, manualRollback)
      }

      return undefined
    }
  }, [
    customOperationId,
    optimisticUpdate,
    rollbackFn,
    executeAsync,
    ignoreOnUnmount,
    onSuccess,
    autoRollback,
    onError,
    ensureRollbackStack,
  ])

  /**
   * Check if there is a rollback-able state
   * Uses function form to avoid accessing ref during render
   */
  const getCanRollback = useCallback(() => {
    return localRollbackStackRef.current.length > 0 || ensureRollbackStack().size > 0
  }, [ensureRollbackStack])

  return {
    execute,
    isLoading,
    error,
    rollback,
    rollbackTo,
    clearRollbackHistory,
    getRollbackHistory,
    getCanRollback,
  }
}

/**
 * Simplified version: optimistic update hook for state updates
 *
 * Designed specifically for Zustand store state updates with a simpler API.
 *
 * @example
 * const { execute, isLoading } = useOptimisticStateUpdate({
 *   getState: () => store.getState().items,
 *   setState: (items) => store.setState({ items }),
 *   asyncOperation: () => api.updateItems(items),
 *   optimisticValue: newItems,
 * })
 */
export interface UseOptimisticStateUpdateOptions<T, R> {
  /** Get current state */
  getState: () => T
  /** Set state */
  setState: (state: T) => void
  /** Async operation */
  asyncOperation: () => Promise<R>
  /** Optimistic update value */
  optimisticValue: T
  /** Success callback */
  onSuccess?: (result: R) => void
  /** Error callback */
  onError?: (error: Error) => void
  /** Whether to auto-rollback on failure (default true) */
  autoRollback?: boolean
}

export function useOptimisticStateUpdate<T, R>(
  options: UseOptimisticStateUpdateOptions<T, R>
): {
  execute: () => Promise<R | undefined>
  isLoading: boolean
  error: Error | null
  rollback: () => void
} {
  const {
    getState,
    setState,
    asyncOperation,
    optimisticValue,
    onSuccess,
    onError,
    autoRollback = true,
  } = options

  return useOptimisticUpdate<T, R>({
    execute: asyncOperation,
    optimisticUpdate: () => {
      const previousState = getState()
      setState(optimisticValue)
      return previousState
    },
    rollbackFn: (previousState) => {
      setState(previousState)
    },
    onSuccess,
    onError,
    autoRollback,
  })
}

/**
 * Create a Zustand store updater with rollback support
 *
 * @example
 * const updateWithRollback = createOptimisticUpdater(useMyStore)
 *
 * // Usage
 * await updateWithRollback({
 *   selector: (state) => state.items,
 *   updater: (set) => set({ items: newItems }),
 *   asyncOperation: () => api.updateItems(newItems),
 * })
 */
export interface OptimisticUpdaterOptions<TStore, TSlice, R> {
  /** Select the state slice to update */
  selector: (state: TStore) => TSlice
  /** Update the state */
  updater: (set: (partial: Partial<TStore>) => void) => void
  /** Async operation */
  asyncOperation: () => Promise<R>
  /** Success callback */
  onSuccess?: (result: R) => void
  /** Error callback */
  onError?: (error: Error) => void
}

/**
 * Batch optimistic update hook
 *
 * Supports atomic rollback for multiple operations. If any operation fails,
 * all previously applied operations will be rolled back.
 *
 * @example
 * const { executeBatch, isLoading } = useBatchOptimisticUpdate()
 *
 * await executeBatch([
 *   {
 *     execute: () => api.updateUser(user),
 *     optimisticUpdate: () => {
 *       const prev = store.getState().user
 *       store.setState({ user: newUser })
 *       return prev
 *     },
 *     rollbackFn: (prev) => store.setState({ user: prev }),
 *   },
 *   {
 *     execute: () => api.updateSettings(settings),
 *     optimisticUpdate: () => {
 *       const prev = store.getState().settings
 *       store.setState({ settings: newSettings })
 *       return prev
 *     },
 *     rollbackFn: (prev) => store.setState({ settings: prev }),
 *   },
 * ])
 */
export interface BatchOptimisticOperation<T, R> {
  execute: () => Promise<R>
  optimisticUpdate: () => T
  rollbackFn: (previousState: T) => void
  onSuccess?: (result: R) => void
}

export interface UseBatchOptimisticUpdateReturn {
  executeBatch: <T, R>(
    operations: BatchOptimisticOperation<T, R>[]
  ) => Promise<R[] | undefined>
  isLoading: boolean
  error: Error | null
  rollbackAll: () => void
}

export function useBatchOptimisticUpdate(): UseBatchOptimisticUpdateReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rollbackStackRef = useRef<Array<{ previousState: any; rollbackFn: (state: any) => void }>>([])
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  /**
   * Rollback all executed operations
   */
  const rollbackAll = useCallback(() => {
    // Rollback in reverse order
    while (rollbackStackRef.current.length > 0) {
      const entry = rollbackStackRef.current.pop()
      if (entry) {
        entry.rollbackFn(entry.previousState)
      }
    }
  }, [])

  /**
   * Execute batch optimistic updates
   */
  const executeBatch = useCallback(
    async <T, R>(
      operations: BatchOptimisticOperation<T, R>[]
    ): Promise<R[] | undefined> => {
      setIsLoading(true)
      setError(null)
      rollbackStackRef.current = []

      const results: R[] = []

      try {
        // 1. Apply all optimistic updates first
        for (const op of operations) {
          const previousState = op.optimisticUpdate()
          rollbackStackRef.current.push({
            previousState,
            rollbackFn: op.rollbackFn,
          })
        }

        // 2. Then execute all async operations
        for (let i = 0; i < operations.length; i++) {
          const op = operations[i]
          const result = await op.execute()
          results.push(result)
          op.onSuccess?.(result)
        }

        // 3. All operations succeeded, clear rollback stack
        if (isMountedRef.current) {
          rollbackStackRef.current = []
          setIsLoading(false)
        }

        return results
      } catch (err) {
        const batchError = err instanceof Error ? err : new Error(String(err))

        if (isMountedRef.current) {
          setError(batchError)
          setIsLoading(false)

          // Rollback all applied optimistic updates
          rollbackAll()
        }

        return undefined
      }
    },
    [rollbackAll]
  )

  return {
    executeBatch,
    isLoading,
    error,
    rollbackAll,
  }
}
