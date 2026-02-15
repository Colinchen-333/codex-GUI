/**
 * WebSearchCard - Shows web search queries and results
 */
import { ExternalLink } from 'lucide-react'
import { formatTimestamp } from '../utils'
import type { MessageItemProps, WebSearchContentType } from '../types'

export function WebSearchCard({ item }: MessageItemProps) {
  const content = item.content as WebSearchContentType

  return (
    <div className="flex justify-start pr-12 animate-in slide-in-from-bottom-2 duration-150">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-stroke/20 bg-surface-solid shadow-[var(--shadow-1)]">
        <div className="flex items-center justify-between border-b border-stroke/20 bg-surface-hover/[0.06] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-surface-solid p-1 text-text-3 shadow-[var(--shadow-1)]">
              <ExternalLink size={14} />
            </div>
            <span className="text-xs font-semibold text-text-1">Web Search</span>
          </div>
          <div className="flex items-center gap-2">
            {content.isSearching && (
              <span className="flex items-center gap-1 text-[10px] text-status-info">
                <span className="h-1.5 w-1.5 rounded-full bg-status-info animate-pulse" />
                Searching...
              </span>
            )}
            {/* Timestamp */}
            <span className="text-[10px] text-text-3/70">
              {formatTimestamp(item.createdAt)}
            </span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-sm text-text-3">Query: {content.query}</div>
          {content.results && content.results.length > 0 && (
            <div className="space-y-2 text-xs">
              {content.results.map((result, i) => (
                <div key={i} className="rounded-md border border-stroke/20 p-3 bg-surface-hover/[0.04]">
                  <div className="font-medium text-text-1">{result.title}</div>
                  <div className="text-text-3 truncate">{result.url}</div>
                  <div className="text-text-3 mt-1">{result.snippet}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
