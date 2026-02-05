import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full min-h-[80px] rounded-[var(--radius-md)] border bg-surface-solid px-3 py-2',
          'text-[13px] text-text-1 placeholder:text-text-3',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-ring/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-none',
          error
            ? 'border-destructive focus:border-destructive'
            : 'border-stroke/20 focus:border-stroke/40',
          className
        )}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
