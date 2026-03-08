/**
 * AgentMessage - Displays AI agent messages with streaming indicator
 * Memoized to prevent unnecessary re-renders during streaming
 */
import { memo, useMemo } from 'react'
import { isAgentMessageContent } from '../../../lib/typeGuards'
import { Markdown } from '../../ui/Markdown'
import { log } from '../../../lib/logger'
import type { MessageItemProps } from '../types'

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const AgentMessage = memo(
  function AgentMessage({ item }: MessageItemProps) {
    if (!isAgentMessageContent(item.content)) {
      log.warn(`Invalid agent message content for item ${item.id}`, 'AgentMessage')
      return null
    }
    const content = item.content
    const timeStr = useMemo(() => formatTime(item.createdAt), [item.createdAt])

    return (
      <div className="group/msg flex justify-start pr-12 animate-in slide-in-from-bottom-2 duration-150">
        <div className="w-full max-w-[860px]">
          <Markdown content={content.text} className="prose-p:my-1.5 prose-ul:my-2 prose-ol:my-2" />
          {content.isStreaming && (
            <div className="mt-2">
              <span className="thinking-indicator" />
            </div>
          )}
          {!content.isStreaming && (
            <div className="mt-1 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
              <span className="text-[10px] text-text-3">{timeStr}</span>
            </div>
          )}
        </div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison: check if content actually changed
    // Agent messages can update during streaming, so we need deeper comparison
    const prev = prevProps.item
    const next = nextProps.item

    // Fast path: same reference
    if (prev === next) return true

    // Must be same type and status
    if (prev.type !== next.type || prev.status !== next.status) return false

    // For agent messages, check if text or streaming status changed
    if (!isAgentMessageContent(prev.content) || !isAgentMessageContent(next.content)) {
      return false
    }

    const prevContent = prev.content
    const nextContent = next.content

    // Re-render if text changed, streaming status changed, or text length changed (during streaming)
    return (
      prevContent.text === nextContent.text && prevContent.isStreaming === nextContent.isStreaming
    )
  }
)
