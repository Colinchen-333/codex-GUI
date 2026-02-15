import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'error' | 'purple'
type BadgeSize = 'sm' | 'md'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-primary/15 text-primary border-transparent',
  secondary: 'bg-surface-solid text-text-2 border-stroke/20',
  outline: 'bg-transparent text-text-2 border-stroke/30',
  success: 'bg-status-success-muted text-status-success border-transparent',
  warning: 'bg-status-warning-muted text-status-warning border-transparent',
  error: 'bg-status-error-muted text-status-error border-transparent',
  purple: 'bg-status-info-muted text-status-info border-transparent',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-sm',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm border font-medium',
          'whitespace-nowrap',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'

type TagVariant = 'default' | 'primary' | 'purple' | 'green' | 'yellow' | 'red'

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant
  removable?: boolean
  onRemove?: () => void
}

const tagVariantStyles: Record<TagVariant, string> = {
  default: 'bg-surface-solid text-text-2 border-stroke/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  purple: 'bg-status-info-muted text-status-info border-status-info/30',
  green: 'bg-status-success-muted text-status-success border-status-success/30',
  yellow: 'bg-status-warning-muted text-status-warning border-status-warning/30',
  red: 'bg-status-error-muted text-status-error border-status-error/30',
}

export const Tag = forwardRef<HTMLSpanElement, TagProps>(
  ({ className, variant = 'default', removable, onRemove, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5',
          'rounded-full border text-xs font-medium',
          tagVariantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
        {removable && (
          <button
            type="button"
            className="ml-0.5 -mr-0.5 h-3.5 w-3.5 rounded-full hover:bg-current/10 inline-flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation()
              onRemove?.()
            }}
            aria-label="Remove"
          >
            <svg className="h-2.5 w-2.5" viewBox="0 0 10 10" fill="none">
              <path
                d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </span>
    )
  }
)

Tag.displayName = 'Tag'
