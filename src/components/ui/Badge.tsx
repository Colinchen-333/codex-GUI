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
  success: 'bg-green-500/15 text-green-500 border-transparent',
  warning: 'bg-yellow-500/15 text-yellow-600 border-transparent',
  error: 'bg-red-500/15 text-red-500 border-transparent',
  purple: 'bg-purple-500/15 text-purple-500 border-transparent',
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
  purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  green: 'bg-green-500/10 text-green-500 border-green-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  red: 'bg-red-500/10 text-red-500 border-red-500/20',
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
