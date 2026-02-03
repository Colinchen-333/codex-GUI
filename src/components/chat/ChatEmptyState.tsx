/**
 * ChatEmptyState - Empty state component for chat message list
 *
 * Provides a friendly empty state with helpful hints and animations.
 * Improves user experience when there are no messages yet.
 */
import { memo } from 'react'
import { MessageSquare, Sparkles, Keyboard } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface ChatEmptyStateProps {
  /** Whether the list is filtered */
  isFiltered?: boolean
  /** Optional custom message */
  message?: string
  /** Additional CSS classes */
  className?: string
}

export const ChatEmptyState = memo(function ChatEmptyState({
  isFiltered = false,
  message,
  className,
}: ChatEmptyStateProps) {
  // Show different content based on state
  if (isFiltered) {
    return (
      <div
        className={cn(
          'h-full flex flex-col items-center justify-center text-text-3 gap-4',
          className
        )}
      >
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-surface-hover/[0.12]">
            <MessageSquare size={22} className="text-text-2" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-text-1">No matching messages</p>
          <p className="text-xs text-text-3 mt-1">
            Try adjusting your search or filter
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'h-full flex flex-col items-center justify-center text-text-3 gap-6',
        className
      )}
    >
      {/* Animated icon */}
      <div className="relative">
        <div className="flex h-14 w-14 items-center justify-center rounded-md bg-surface-hover/[0.12]">
          <Sparkles size={20} className="text-text-2" />
        </div>
      </div>

      {/* Welcome message */}
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-text-1">
          {message || 'Start a conversation'}
        </p>
        <p className="text-xs text-text-3 max-w-xs">
          Type a message below to begin working with Codex
        </p>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="flex items-center gap-2 text-xs text-text-3 bg-surface-hover/[0.08] px-3 py-2 rounded-md border border-stroke/20">
        <Keyboard size={14} />
        <span>
          Press <kbd className="px-1.5 py-0.5 bg-surface-solid rounded text-[10px] font-mono">?</kbd> for shortcuts
        </span>
      </div>
    </div>
  )
})
