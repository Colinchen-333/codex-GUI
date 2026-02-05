/**
 * InfoCard - Shows informational messages
 * Memoized to prevent unnecessary re-renders
 */
import { memo } from 'react'
import { ChevronRight, FileText } from 'lucide-react'
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
    const isCompactionNotice =
      item.id.startsWith('compact-') ||
      content.title?.toLowerCase().includes('compacted') ||
      content.title?.toLowerCase().includes('compaction')

    if (isCompactionNotice) {
      const detailLines = content.details
        ? content.details.split('\n').map((line) => line.trim()).filter(Boolean)
        : []

      return (
        <div className="flex justify-start pr-12 animate-in slide-in-from-bottom-2 duration-150">
          <div className="w-full space-y-4">
            <div className="flex items-center gap-3 text-xs text-text-3">
              <div className="h-px flex-1 bg-stroke/20" />
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-text-3" />
                <span className="font-medium">{content.title || 'Context automatically compacted'}</span>
              </div>
              <div className="h-px flex-1 bg-stroke/20" />
            </div>
            {detailLines.length > 0 && (
              <div className="space-y-1 text-sm text-text-3">
                {detailLines.map((line, idx) => (
                  <div key={`${item.id}-detail-${idx}`}>{line}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }

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
