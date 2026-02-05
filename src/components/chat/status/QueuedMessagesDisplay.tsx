/**
 * QueuedMessagesDisplay - Shows messages waiting to be processed
 * Memoized to prevent unnecessary re-renders when only turnStatus changes
 */
import { memo, useEffect, useRef, useState } from 'react'
import { ArrowUp, CornerDownLeft, MoreHorizontal, Trash2 } from 'lucide-react'
import { useThreadStore, type QueuedMessage, selectFocusedThread } from '../../../stores/thread'
import { useToast } from '../../ui/Toast'
import { cn } from '../../../lib/utils'

export const QueuedMessagesDisplay = memo(function QueuedMessagesDisplay() {
  // Use proper selector to avoid re-render loops from getter-based state access
  const focusedThread = useThreadStore(selectFocusedThread)
  const removeQueuedMessage = useThreadStore((state) => state.removeQueuedMessage)
  const promoteQueuedMessage = useThreadStore((state) => state.promoteQueuedMessage)
  const { showToast } = useToast()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (!openMenuId) return
    const handleClickOutside = (event: MouseEvent) => {
      const menuRef = menuRefs.current[openMenuId]
      if (menuRef && !menuRef.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenuId])

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
              <div
                ref={(node) => {
                  menuRefs.current[msg.id] = node
                }}
                className="relative"
              >
                <button
                  className={cn(
                    'rounded-full p-1 transition-colors hover:bg-surface-hover/[0.12] hover:text-text-1',
                    openMenuId === msg.id && 'bg-surface-hover/[0.12] text-text-1'
                  )}
                  onClick={() => setOpenMenuId((prev) => (prev === msg.id ? null : msg.id))}
                  title="More"
                  aria-label="More actions"
                >
                  <MoreHorizontal size={14} />
                </button>
                {openMenuId === msg.id && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-stroke/15 bg-surface-solid p-1.5 shadow-[var(--shadow-2)]">
                    <button
                      className="flex w-full items-center rounded-lg px-3 py-2 text-[13px] text-text-1 hover:bg-surface-hover/[0.12]"
                      onClick={() => {
                        showToast('Edit message not wired yet', 'info')
                        setOpenMenuId(null)
                      }}
                    >
                      Edit message
                    </button>
                    <button
                      className="flex w-full items-center rounded-lg px-3 py-2 text-[13px] text-text-1 hover:bg-surface-hover/[0.12]"
                      onClick={() => {
                        showToast('Turn off queueing not wired yet', 'info')
                        setOpenMenuId(null)
                      }}
                    >
                      Turn off queueing
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
