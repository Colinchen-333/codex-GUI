import { memo, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ChipVariant = 'default' | 'primary' | 'success' | 'warning' | 'error'
type ChipSize = 'sm' | 'md'

interface InlineChipProps {
  children: ReactNode
  variant?: ChipVariant
  size?: ChipSize
  icon?: ReactNode
  onRemove?: () => void
  className?: string
}

const variantStyles: Record<ChipVariant, string> = {
  default:  'bg-surface-solid text-text-2 border-stroke/20',
  primary:  'bg-primary/10 text-primary border-primary/20',
  success:  'bg-status-success-muted text-status-success border-status-success/25',
  warning:  'bg-status-warning-muted text-status-warning border-status-warning/25',
  error:    'bg-status-error-muted text-status-error border-status-error/25',
}

const sizeStyles: Record<ChipSize, string> = {
  sm: 'h-5 px-1.5 text-xs gap-1',
  md: 'h-6 px-2 text-sm gap-1.5',
}

const iconSizeStyles: Record<ChipSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
}

export const InlineChip = memo<InlineChipProps>(
  ({ children, variant = 'default', size = 'sm', icon, onRemove, className }) => {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border font-medium',
          'whitespace-nowrap leading-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
      >
        {icon && (
          <span className={cn('shrink-0 flex items-center', iconSizeStyles[size])}>
            {icon}
          </span>
        )}

        {children}

        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            aria-label="Remove"
            className={cn(
              'shrink-0 -mr-0.5 ml-0.5 rounded-full flex items-center justify-center',
              'opacity-60 hover:opacity-100 transition-opacity duration-fast',
              iconSizeStyles[size],
            )}
          >
            <X className="h-full w-full" strokeWidth={2.5} />
          </button>
        )}
      </span>
    )
  }
)

InlineChip.displayName = 'InlineChip'
