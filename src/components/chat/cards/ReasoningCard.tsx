/**
 * ReasoningCard - Shows AI's thinking process (only when completed, streaming is shown in WorkingStatusBar)
 */
import { useState } from 'react'
import { Brain, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { formatTimestamp, parseReasoningSummary } from '../utils'
import type { MessageItemProps, ReasoningContentType } from '../types'

export function ReasoningCard({ item }: MessageItemProps) {
  const content = item.content as ReasoningContentType
  const [isExpanded, setIsExpanded] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)

  // Don't show card while streaming - it's displayed in WorkingStatusBar
  if (content.isStreaming) {
    return null
  }

  const hasFullContent = content.fullContent && content.fullContent.length > 0

  // Parse summaries to remove **header** format
  const parsedSummaries = content.summary?.map(parseReasoningSummary) || []

  return (
    <div className="flex justify-start pr-12 animate-in slide-in-from-bottom-2 duration-150">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-stroke/20 bg-surface-solid shadow-[var(--shadow-1)] transition-all">
        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-stroke/20 bg-surface-hover/[0.06] px-4 py-2.5 cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div className="rounded-md p-1 shadow-[var(--shadow-1)] bg-surface-solid text-text-3">
              <Brain size={14} />
            </div>
            <span className="text-xs font-semibold text-text-1">Reasoning</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Timestamp */}
            <span className="text-[10px] text-text-3/70">
              {formatTimestamp(item.createdAt)}
            </span>
            <span className="text-text-3 text-xs">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="p-4 space-y-3">
            {/* View mode toggle - only if fullContent exists */}
            {hasFullContent && (
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFullContent(false)
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded transition-colors',
                    !showFullContent
                      ? 'bg-surface-hover/[0.12] text-text-1'
                      : 'text-text-3 hover:bg-surface-hover/[0.08]'
                  )}
                >
                  Summary
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFullContent(true)
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded transition-colors',
                    showFullContent
                      ? 'bg-surface-hover/[0.12] text-text-1'
                      : 'text-text-3 hover:bg-surface-hover/[0.08]'
                  )}
                >
                  Full Thinking
                </button>
              </div>
            )}

            {/* Summary content - parsed to remove **header** */}
            {(!showFullContent || !hasFullContent) && parsedSummaries.length > 0 && (
              <div className="space-y-2">
                {parsedSummaries.map((text, i) => (
                  <div key={i} className="text-sm text-text-3 leading-relaxed">
                    • {text}
                  </div>
                ))}
              </div>
            )}

            {/* Full content */}
            {showFullContent && hasFullContent && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {content.fullContent!.map((text, i) => (
                  <p key={i} className="text-sm text-text-2 leading-relaxed">
                    {text}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsed preview - parsed to remove **header** */}
        {!isExpanded && parsedSummaries.length > 0 && (
          <div className="px-4 py-2 text-xs text-text-3 truncate">
            {parsedSummaries[0]?.slice(0, 100)}...
          </div>
        )}
      </div>
    </div>
  )
}
