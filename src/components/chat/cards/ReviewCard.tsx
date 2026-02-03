/**
 * ReviewCard - Shows code review results
 */
import { AlertCircle } from 'lucide-react'
import { isReviewContent } from '../../../lib/typeGuards'
import { Markdown } from '../../ui/Markdown'
import { log } from '../../../lib/logger'
import { formatTimestamp } from '../utils'
import type { MessageItemProps } from '../types'

export function ReviewCard({ item }: MessageItemProps) {
  if (!isReviewContent(item.content)) {
    log.warn(`Invalid review content for item ${item.id}`, 'ReviewCard')
    return null
  }
  const content = item.content
  return (
    <div className="flex justify-start pr-12 animate-in slide-in-from-bottom-2 duration-150">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-stroke/20 bg-surface-solid shadow-[var(--shadow-1)]">
        <div className="flex items-center justify-between border-b border-stroke/20 bg-surface-hover/[0.06] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-surface-solid p-1 text-text-3 shadow-[var(--shadow-1)]">
              <AlertCircle size={14} />
            </div>
            <span className="text-xs font-semibold text-text-1">
              {content.phase === 'started' ? 'Review started' : 'Review complete'}
            </span>
          </div>
          {/* Timestamp */}
          <span className="text-[10px] text-text-3/70">
            {formatTimestamp(item.createdAt)}
          </span>
        </div>
        <div className="p-4">
          <Markdown content={content.text} />
        </div>
      </div>
    </div>
  )
}
