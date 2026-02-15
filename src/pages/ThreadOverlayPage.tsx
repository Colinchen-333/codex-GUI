import { useParams } from 'react-router-dom'
import { Pin, MoreHorizontal, X } from 'lucide-react'
import { IconButton } from '../components/ui/IconButton'

export function ThreadOverlayPage() {
  const { conversationId } = useParams<{ conversationId: string }>()

  return (
    <div className="h-full w-full overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="draggable h-toolbar-sm relative flex items-center px-3 border-b border-stroke/20">
          <div className="text-text-3/25 pointer-events-none absolute inset-x-0 flex justify-center text-base font-medium">
            Session Overlay (Placeholder)
          </div>
          
          <div className="max-w-[70%] truncate text-sm font-medium text-text-1">
            {conversationId ? `Session ${conversationId.slice(0, 8)}...` : 'Session'}
          </div>

          <div className="ml-auto flex items-center gap-0">
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Pin session"
            >
              <Pin size={14} />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="More options"
            >
              <MoreHorizontal size={14} />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Close overlay"
            >
              <X size={14} />
            </IconButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto w-full max-w-[var(--thread-composer-max-width)]">
            <div className="rounded-xl border border-stroke/20 bg-surface-solid p-6 text-center">
              <p className="text-sm text-text-3">
                Placeholder: session overlay is not implemented yet.
              </p>
              <p className="mt-2 text-xs text-text-3/70">
                Session ID: {conversationId ?? 'None'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="mx-auto w-full max-w-[var(--thread-composer-max-width)]">
            <input
              type="text"
              placeholder="Message input (disabled)"
              aria-label="Message input (disabled)"
              disabled
              className="text-text-1 border-stroke rounded-xl border px-3 py-2 text-base shadow-sm outline-none w-full bg-surface-solid"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
