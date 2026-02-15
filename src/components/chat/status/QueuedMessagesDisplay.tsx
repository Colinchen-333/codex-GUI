/**
 * QueuedMessagesDisplay - Shows messages waiting to be processed
 * Memoized to prevent unnecessary re-renders when only turnStatus changes
 */
import { memo } from 'react'
import { ArrowUp, CornerDownLeft, Trash2 } from 'lucide-react'
import { useThreadStore, type QueuedMessage, selectFocusedThread } from '../../../stores/thread'

export const QueuedMessagesDisplay = memo(function QueuedMessagesDisplay() {
  // Use proper selector to avoid re-render loops from getter-based state access
  const focusedThread = useThreadStore(selectFocusedThread)
  const removeQueuedMessage = useThreadStore((state) => state.removeQueuedMessage)
  const promoteQueuedMessage = useThreadStore((state) => state.promoteQueuedMessage)

  const queuedMessages = focusedThread?.queuedMessages ?? []
  if (queuedMessages.length === 0) return null

  return (
    <div className="mb-3 animate-in fade-in slide-in-from-bottom-1 duration-150">
      <div className="rounded-2xl border border-stroke/15 bg-surface-solid shadow-[var(--shadow-1)] overflow-visible">
        {queuedMessages.map((msg: QueuedMessage, index) => (
          <div
            key={msg.id}
            className={index === queuedMessages.length - 1
              ? 'flex items-center justify-between gap-3 px-4 py-2 text-[13px]'
              : 'flex items-center justify-between gap-3 px-4 py-2 text-[13px] border-b border-stroke/10'}
          >
            <div className="flex min-w-0 items-center gap-3 text-text-2">
              <CornerDownLeft size={14} className="text-text-3" />
              <span className="truncate text-text-1">{msg.text}</span>
            </div>
            <div className="flex items-center gap-2.5 text-text-3">
              <button
                className="rounded-full p-1 transition-colors hover:bg-surface-hover/[0.12] hover:text-text-1 disabled:opacity-40"
                onClick={() => promoteQueuedMessage(msg.id)}
                title="Move to top"
                aria-label="Move queued message to top"
                disabled={index === 0}
              >
                <ArrowUp size={14} />
              </button>
              <button
                className="rounded-full p-1 transition-colors hover:bg-destructive/10 hover:text-destructive"
                onClick={() => removeQueuedMessage(msg.id)}
                title="Remove"
                aria-label="Remove queued message"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
