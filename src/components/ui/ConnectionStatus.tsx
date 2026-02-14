import { useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { Loader2, WifiOff } from 'lucide-react'
import { cn } from '../../lib/utils'
import { log } from '../../lib/logger'
import { useServerConnectionStore } from '../../stores/server-connection'
import { CONNECTION_RETRY } from '../../constants'
import { BaseDialog } from './BaseDialog'
import { Button } from './Button'
import { isTauriAvailable } from '../../lib/tauri'

export function ConnectionStatus() {
  const {
    isConnected,
    hasConnectedOnce,
    isReconnecting,
    retryCount,
    startMonitoring,
    stopMonitoring,
    attemptReconnect,
    markDisconnected,
    markConnected,
  } = useServerConnectionStore()

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    startMonitoring()

    // Listen for server disconnection and reconnection (Tauri only)
    const setupListeners = async () => {
      if (!isTauriAvailable()) {
        return () => {}
      }

      const unlistenDisconnected = await listen('app-server-disconnected', async () => {
        log.debug('[ConnectionStatus] Server disconnected event received', 'ConnectionStatus')
        if (isMountedRef.current) {
          markDisconnected('app-server-disconnected')
          void attemptReconnect()
        }
      })

      const unlistenReconnected = await listen('app-server-reconnected', () => {
        log.debug('[ConnectionStatus] Server reconnected event received', 'ConnectionStatus')
        if (isMountedRef.current) {
          markConnected()
        }
      })

      return () => {
        unlistenDisconnected()
        unlistenReconnected()
      }
    }

    const cleanupPromise = setupListeners()
    return () => {
      isMountedRef.current = false
      stopMonitoring()
      void cleanupPromise.then((cleanup) => cleanup())
    }
  }, [attemptReconnect, markConnected, markDisconnected, startMonitoring, stopMonitoring])

  const shouldShow = !isConnected && (hasConnectedOnce || isReconnecting)

  if (!shouldShow) {
    return null
  }

  const progressPercent = Math.min(
    100,
    Math.max(0, (retryCount / CONNECTION_RETRY.MAX_ATTEMPTS) * 100)
  )

  return (
    <BaseDialog
      isOpen={true}
      onClose={() => {}}
      title={isReconnecting ? 'Reconnecting…' : 'Connection Lost'}
      description="Engine connectivity status."
      titleIcon={
        isReconnecting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <WifiOff size={16} />
        )
      }
      maxWidth="sm"
      variant={isReconnecting ? 'warning' : 'danger'}
      showCloseButton={false}
      closeOnBackdrop={false}
      closeOnEscape={false}
      footer={
        isReconnecting ? undefined : (
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              Reload App
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => void attemptReconnect()}
            >
              Try Again
            </Button>
          </div>
        )
      }
    >
      <div className="p-6">
        {isReconnecting ? (
          <div className="space-y-4">
            <p className="text-sm text-text-3">
              Attempting to reconnect to the Codex engine
              {retryCount > 0 && ` (attempt ${retryCount}/${CONNECTION_RETRY.MAX_ATTEMPTS})`}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-surface-hover/[0.08]">
              <div
                className={cn('h-full bg-primary transition-all duration-500', 'animate-pulse')}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-xs text-text-3">
              This dialog will close automatically once the engine is back online.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-text-3">
              Unable to connect to the Codex engine after multiple attempts.
            </p>
            <div className="text-xs text-text-3">
              If this keeps happening, open the Debug page and copy a diagnostics report.
            </div>
          </div>
        )}
      </div>
    </BaseDialog>
  )
}
