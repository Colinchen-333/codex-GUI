/**
 * useAsyncOperation Hook
 *
 * Manages async operation state including loading, error handling, and data.
 * Provides a unified async pattern to avoid repetitive try-catch and state management.
 *
 * @example
 * const { execute, isLoading, error, data, reset } = useAsyncOperation(
 *   async (userId: string) => {
 *     const response = await api.getUser(userId)
 *     return response.data
 *   },
 *   {
 *     onSuccess: (user) => console.log('User loaded:', user),
 *     onError: (error) => console.error('Failed to load user:', error),
 *   }
 * )
 *
 * // Usage
 * await execute('user-123')
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'

/**
 * Async operation configuration options
 */
export interface UseAsyncOperationOptions<T> {
  /** Callback on success */
  onSuccess?: (data: T) => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Whether to ignore results after unmount (default true) */
  ignoreOnUnmount?: boolean
}

/**
 * Async operation hook return value
 */
export interface UseAsyncOperationReturn<T, Args extends unknown[]> {
  /** Execute the async operation */
  execute: (...args: Args) => Promise<T | undefined>
  /** Whether the operation is loading */
  isLoading: boolean
  /** Error information */
  error: Error | null
  /** Data returned by the operation */
  data: T | null
  /** Reset state */
  reset: () => void
}

/**
 * Async operation state
 */
interface AsyncState<T> {
  isLoading: boolean
  error: Error | null
  data: T | null
}

/**
 * Async operation management hook
 *
 * Provides unified async operation state management:
 * - Auto-manages loading state
 * - Unified error handling
 * - Success/error callbacks
 * - Prevents state updates after unmount
 *
 * @param asyncFn - The async function to execute
 * @param options - Configuration options
 * @returns Async operation control interface
 */
export function useAsyncOperation<T, Args extends unknown[]>(
  asyncFn: (...args: Args) => Promise<T>,
  options: UseAsyncOperationOptions<T> = {}
): UseAsyncOperationReturn<T, Args> {
  const { onSuccess, onError, ignoreOnUnmount = true } = options

  const [state, setState] = useState<AsyncState<T>>({
    isLoading: false,
    error: null,
    data: null,
  })

  // Track whether the component is still mounted
  const isMountedRef = useRef(true)
  // Cancel stale requests (when a new request is made, old results should be ignored)
  const latestRequestIdRef = useRef(0)

  // Set flag on component unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  /**
   * Execute the async operation
   */
  const execute = useCallback(
    async (...args: Args): Promise<T | undefined> => {
      // Generate a new request ID
      const requestId = ++latestRequestIdRef.current

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }))

      try {
        const result = await asyncFn(...args)

        // Check whether state should be updated
        const shouldUpdate =
          requestId === latestRequestIdRef.current &&
          (isMountedRef.current || !ignoreOnUnmount)

        if (shouldUpdate) {
          setState({
            isLoading: false,
            error: null,
            data: result,
          })
          onSuccess?.(result)
        }

        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))

        // Check whether state should be updated
        const shouldUpdate =
          requestId === latestRequestIdRef.current &&
          (isMountedRef.current || !ignoreOnUnmount)

        if (shouldUpdate) {
          setState({
            isLoading: false,
            error,
            data: null,
          })
          onError?.(error)
        }

        return undefined
      }
    },
    [asyncFn, onSuccess, onError, ignoreOnUnmount]
  )

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    // Increment request ID to cancel any in-flight requests
    latestRequestIdRef.current++
    setState({
      isLoading: false,
      error: null,
      data: null,
    })
  }, [])

  return useMemo(
    () => ({
      execute,
      isLoading: state.isLoading,
      error: state.error,
      data: state.data,
      reset,
    }),
    [execute, state.isLoading, state.error, state.data, reset]
  )
}

/**
 * Simplified version: only tracks execution and loading state
 */
export function useAsyncCallback<Args extends unknown[]>(
  asyncFn: (...args: Args) => Promise<void>,
  options: Omit<UseAsyncOperationOptions<void>, 'onSuccess'> & {
    onSuccess?: () => void
  } = {}
): {
  execute: (...args: Args) => Promise<void>
  isLoading: boolean
} {
  const { execute, isLoading } = useAsyncOperation(asyncFn, options)

  return useMemo(() => ({ execute, isLoading }), [execute, isLoading])
}
