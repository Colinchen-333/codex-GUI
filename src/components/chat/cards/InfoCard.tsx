/**
 * InfoCard - Shows informational messages
 * Memoized to prevent unnecessary re-renders
 */
import { memo } from 'react'
import { ChevronRight } from 'lucide-react'
import { isInfoContent } from '../../../lib/typeGuards'
import { log } from '../../../lib/logger'
import { formatTimestamp } from '../utils'
import type { MessageItemProps } from '../types'

export const InfoCard = memo(
  function InfoCard({ item }: MessageItemProps) {
    if (!isInfoContent(item.content)) {
      log.warn(`Invalid info content for item ${item.id}`, 'InfoCard')
      return null
    }
    const content = item.content
    return (
      <div className="flex justify-start pr-12 animate-in slide-in-from-bottom-2 duration-150">
        <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-stroke/20 bg-surface-solid shadow-[var(--shadow-1)]">
          <div className="flex items-center justify-between border-b border-stroke/20 bg-surface-hover/[0.06] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-surface-solid p-1 text-text-3 shadow-[var(--shadow-1)]">
                <ChevronRight size={14} />
              </div>
              <span className="text-xs font-semibold text-text-1">{content.title}</span>
            </div>
            {/* Timestamp */}
            <span className="text-[10px] text-text-3/70">
              {formatTimestamp(item.createdAt)}
            </span>
          </div>
          {content.details && (
            <pre className="p-4 text-xs text-text-3 whitespace-pre-wrap font-mono">
              {content.details}
            </pre>
          )}
        </div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison: info cards are immutable once created
    return prevProps.item === nextProps.item
  }
)
