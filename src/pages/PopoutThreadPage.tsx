import { memo, useState, useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Pin, PinOff, X } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { IconButton } from '../components/ui/IconButton'
import { systemApi } from '../lib/api'
import { useThreadStore } from '../stores/thread'
import { ChatView } from '../components/chat/ChatView'
import { log } from '../lib/logger'

/**
 * PopoutThreadPage — renders a thread in a standalone floating window.
 *
 * The window is created by `pop_out_thread` Rust command. It has:
 *   - A minimal drag-region header with pin and close buttons
 *   - The full ChatView (message list + input area) for the thread
 *
 * The thread must already be loaded in the thread store (resumed in the main
 * window before pop-out). If not loaded, a helpful notice is shown.
 */
export const PopoutThreadPage = memo(function PopoutThreadPage() {
  const { threadId } = useParams<{ threadId: string }>()
  const [pinned, setPinned] = useState(false)
  const [windowLabel, setWindowLabel] = useState<string>('')

  // Read thread state to show the session title
  const threadState = useThreadStore((state) =>
    threadId ? state.threads[threadId] ?? null : null
  )
  const focusedThreadId = useThreadStore((state) => state.focusedThreadId)
  const switchThread = useThreadStore((state) => state.switchThread)

  // Resolve the current window label once on mount
  useEffect(() => {
    try {
      const label = getCurrentWindow().label
      setWindowLabel(label)
    } catch {
      // Not running in Tauri — ignore
    }
  }, [])

  // Make this thread the focused thread in the store so ChatView renders it
  useEffect(() => {
    if (!threadId) return
    if (focusedThreadId !== threadId && threadState) {
      switchThread(threadId)
    }
  }, [threadId, focusedThreadId, threadState, switchThread])

  const handleTogglePin = useCallback(async () => {
    if (!windowLabel) return
    try {
      const newPinned = await systemApi.toggleAlwaysOnTop(windowLabel)
      setPinned(newPinned)
    } catch (err) {
      log.warn(`Failed to toggle always-on-top: ${err}`, 'PopoutThreadPage')
    }
  }, [windowLabel])

  const handleClose = useCallback(() => {
    getCurrentWindow().close().catch((err) => {
      log.warn(`Failed to close popout window: ${err}`, 'PopoutThreadPage')
    })
  }, [])

  const sessionTitle =
    threadState?.thread?.cwd?.split('/').pop() ?? 'Thread'

  const isThreadLoaded = !!threadState

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Minimal header — draggable region */}
      <div
        className="flex h-10 shrink-0 items-center justify-between border-b border-stroke/20 bg-surface-solid/80 px-3"
        data-tauri-drag-region
      >
        <span
          className="min-w-0 truncate text-[13px] font-medium text-text-2"
          data-tauri-drag-region
          title={threadId}
        >
          {sessionTitle}
        </span>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => void handleTogglePin()}
            aria-label={pinned ? 'Unpin from top' : 'Pin window on top'}
            active={pinned}
            title={pinned ? 'Unpin from top' : 'Pin on top'}
          >
            {pinned ? <PinOff size={13} /> : <Pin size={13} />}
          </IconButton>

          <IconButton
            variant="ghost"
            size="sm"
            onClick={handleClose}
            aria-label="Close window"
            title="Close"
          >
            <X size={13} />
          </IconButton>
        </div>
      </div>

      {/* Thread content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {isThreadLoaded ? (
          <ChatView />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-[14px] font-medium text-text-2">Thread not loaded</p>
            <p className="max-w-xs text-[12px] leading-relaxed text-text-3">
              Open this thread in the main window first, then use the pop-out
              button to detach it here.
            </p>
            {threadId && (
              <p className="mt-1 font-mono text-[11px] text-text-3/60">{threadId}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
