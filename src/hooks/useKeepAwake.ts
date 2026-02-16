/**
 * useKeepAwake - Prevent system sleep via macOS caffeinate
 *
 * Uses Tauri commands to start/stop caffeinate process on the backend.
 * Falls back gracefully if the Tauri runtime is not available.
 */

import { useCallback, useEffect, useState } from 'react'
import { systemApi } from '../lib/api'
import { log } from '../lib/logger'

export interface UseKeepAwakeReturn {
  /** Whether keep awake is currently active */
  isActive: boolean
  /** Whether an operation is in progress */
  isLoading: boolean
  /** Start keep awake (caffeinate) */
  start: () => Promise<void>
  /** Stop keep awake */
  stop: () => Promise<void>
  /** Toggle keep awake state */
  toggle: () => Promise<void>
}

export function useKeepAwake(): UseKeepAwakeReturn {
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check initial state on mount
  useEffect(() => {
    let cancelled = false
    systemApi.isKeepAwakeActive().then((active) => {
      if (!cancelled) setIsActive(active)
    }).catch(() => {
      // Tauri not available, ignore
    })
    return () => { cancelled = true }
  }, [])

  const start = useCallback(async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      await systemApi.startKeepAwake()
      setIsActive(true)
      log.info('Keep awake started', 'system')
    } catch (err) {
      log.error(`Failed to start keep awake: ${err}`, 'system')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  const stop = useCallback(async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      await systemApi.stopKeepAwake()
      setIsActive(false)
      log.info('Keep awake stopped', 'system')
    } catch (err) {
      log.error(`Failed to stop keep awake: ${err}`, 'system')
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  const toggle = useCallback(async () => {
    if (isActive) {
      await stop()
    } else {
      await start()
    }
  }, [isActive, start, stop])

  return {
    isActive,
    isLoading,
    start,
    stop,
    toggle,
  }
}
