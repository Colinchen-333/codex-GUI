/**
 * McpToolCard - Shows external MCP tool calls
 */
import { useState } from 'react'
import { Copy, Wrench, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { copyTextToClipboard } from '../../../lib/clipboard'
import { formatTimestamp } from '../utils'
import type { MessageItemProps, McpToolContentType } from '../types'
import { IconButton } from '../../ui/IconButton'
import { useToast } from '../../ui/useToast'

export function McpToolCard({ item }: MessageItemProps) {
  const content = item.content as McpToolContentType
  const { toast } = useToast()
  const [isExpanded, setIsExpanded] = useState(false)

  // Compute JSON strings inline - React Compiler will optimize this
  // Only computed when isExpanded is true
  const argumentsJson = content.arguments ? JSON.stringify(content.arguments, null, 2) : ''
  const resultJson =
    content.result && typeof content.result !== 'string'
      ? JSON.stringify(content.result, null, 2)
      : null
  const resultText = typeof content.result === 'string' ? content.result : (resultJson ?? '')

  const copy = async (label: string, text: string) => {
    const ok = await copyTextToClipboard(text)
    if (ok) toast.success(`Copied ${label}`)
    else toast.error('Copy failed')
  }

  return (
    <div className="flex justify-start pr-12 animate-in slide-in-from-bottom-2 duration-150">
      <div
        className={cn(
          'w-full max-w-2xl overflow-hidden rounded-xl border bg-surface-solid shadow-[var(--shadow-1)] transition-all',
          content.isRunning
            ? 'border-l-4 border-l-status-info border-y-stroke/20 border-r-stroke/20'
            : content.error
              ? 'border-l-4 border-l-status-error border-y-stroke/20 border-r-stroke/20'
              : 'border-stroke/20'
        )}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-stroke/20 bg-surface-hover/[0.06] px-4 py-2.5 cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'rounded-md p-1 shadow-[var(--shadow-1)]',
                content.isRunning
                  ? 'bg-status-info-muted text-status-info'
                  : 'bg-surface-solid text-text-3'
              )}
            >
              <Wrench size={14} className={content.isRunning ? 'animate-spin' : ''} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-3">{content.server}</span>
              <span className="text-text-3/70">/</span>
              <code className="text-xs font-medium text-text-1 font-mono">{content.tool}</code>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {content.isRunning && (
              <span className="flex items-center gap-1 text-[10px] text-status-info">
                <span className="h-1.5 w-1.5 rounded-full bg-status-info animate-pulse" />
                Running...
              </span>
            )}
            {content.error && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-status-error-muted text-status-error">
                Failed
              </span>
            )}
            {!content.isRunning && !content.error && content.durationMs !== undefined && (
              <span className="text-[10px] text-text-3">
                {content.durationMs < 1000
                  ? `${content.durationMs}ms`
                  : `${(content.durationMs / 1000).toFixed(1)}s`}
              </span>
            )}
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
            {content.progress && content.progress.length > 0 && (
              <div>
                <div className="mb-1 text-[11px] font-medium text-text-3 uppercase tracking-wider">
                  Progress
                </div>
                <div className="space-y-1 text-xs text-text-3">
                  {content.progress.map((line: string, i: number) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}
            {/* Arguments */}
            {argumentsJson && (
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-medium text-text-3 uppercase tracking-wider">
                    Arguments
                  </div>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => void copy('arguments', argumentsJson)}
                    title="Copy arguments"
                    aria-label="Copy arguments"
                  >
                    <Copy size={14} />
                  </IconButton>
                </div>
                <pre className="max-h-40 overflow-auto rounded-lg bg-surface-hover/[0.08] p-3 font-mono text-xs text-text-2 border border-stroke/20">
                  {argumentsJson}
                </pre>
              </div>
            )}

            {/* Result */}
            {content.result !== undefined && content.result !== null && (
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-medium text-status-success uppercase tracking-wider">
                    Result
                  </div>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => void copy('result', resultText)}
                    disabled={!resultText}
                    title="Copy result"
                    aria-label="Copy result"
                  >
                    <Copy size={14} />
                  </IconButton>
                </div>
                <pre className="max-h-60 overflow-auto rounded-lg bg-status-success-muted p-3 font-mono text-xs text-text-1 border border-stroke/20">
                  {typeof content.result === 'string' ? content.result : resultJson}
                </pre>
              </div>
            )}

            {/* Error */}
            {content.error && (
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="text-[11px] font-medium text-status-error uppercase tracking-wider">
                    Error
                  </div>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => void copy('error', content.error ?? '')}
                    title="Copy error"
                    aria-label="Copy error"
                  >
                    <Copy size={14} />
                  </IconButton>
                </div>
                <pre className="max-h-40 overflow-auto rounded-lg bg-status-error-muted p-3 font-mono text-xs text-text-1 border border-stroke/20">
                  {content.error}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
