/**
 * ErrorCard - Shows stream errors
 * Memoized to prevent unnecessary re-renders
 */
import { memo } from 'react'
import { AlertCircle, Copy } from 'lucide-react'
import { formatTimestamp } from '../utils'
import { cn } from '../../../lib/utils'
import { copyTextToClipboard } from '../../../lib/clipboard'
import { IconButton } from '../../ui/IconButton'
import { useToast } from '../../ui/useToast'
import type { MessageItemProps, ErrorContentType } from '../types'

const HTTP_STATUS_LABELS: Record<number, string> = {
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Access denied',
  404: 'Not found',
  408: 'Request timed out',
  409: 'Conflict',
  413: 'Request too large',
  429: 'Too many requests',
  500: 'Server error',
  502: 'Bad gateway',
  503: 'Service unavailable',
  504: 'Gateway timeout',
}

const formatHttpStatus = (statusCode?: number) => {
  if (!statusCode) return null
  const label = HTTP_STATUS_LABELS[statusCode] ?? 'Request failed'
  return `${label} (${statusCode})`
}

export const ErrorCard = memo(
  function ErrorCard({ item }: MessageItemProps) {
    const content = item.content as ErrorContentType
    const statusText = formatHttpStatus(content.httpStatusCode)
    const { toast } = useToast()

    const errorText = [
      `Error${content.errorType ? ` (${content.errorType})` : ''}`,
      statusText ? statusText : null,
      content.willRetry ? 'Will retry...' : null,
      '',
      content.message,
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n')

    const handleCopy = async () => {
      const ok = await copyTextToClipboard(errorText)
      if (ok) toast.success('Copied error')
      else toast.error('Copy failed')
    }

    return (
      <div className="flex justify-start pr-12 animate-in slide-in-from-bottom-2 duration-150">
        <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-l-4 border-l-status-error border-y-stroke/20 border-r-stroke/20 bg-surface-solid shadow-[var(--shadow-1)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stroke/20 bg-status-error-muted px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-status-error-muted p-1 text-status-error shadow-[var(--shadow-1)]">
                <AlertCircle size={14} />
              </div>
              <span className="text-xs font-semibold text-text-1">Error</span>
              {content.errorType && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-status-error-muted text-status-error">
                  {content.errorType}
                </span>
              )}
              {statusText && (
                <span className="text-[10px] text-text-3">
                  {statusText}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <IconButton
                size="sm"
                variant="ghost"
                onClick={() => void handleCopy()}
                title="Copy error"
                aria-label="Copy error"
              >
                <Copy size={14} />
              </IconButton>
              {content.willRetry && (
                <span className="text-[10px] text-status-warning">
                  Will retry...
                </span>
              )}
              {/* Timestamp */}
              <span className="text-[10px] text-text-3/70">
                {formatTimestamp(item.createdAt)}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className={cn('text-sm leading-relaxed', 'text-text-1')}>
              {content.message}
            </p>
          </div>
        </div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison: error cards are immutable once created
    return prevProps.item === nextProps.item
  }
)
