import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type IconButtonVariant = 'ghost' | 'outline' | 'solid'
type IconButtonSize = 'sm' | 'md' | 'lg'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant
  size?: IconButtonSize
  active?: boolean
}

const variantStyles: Record<IconButtonVariant, string> = {
  ghost: 'text-text-3 hover:text-text-1 hover:bg-surface-hover/[0.08]',
  outline: 'text-text-2 border border-stroke/30 hover:bg-surface-hover/[0.06] hover:text-text-1',
  solid: 'bg-surface-solid text-text-2 hover:text-text-1 hover:bg-surface-hover/[0.08]',
}

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'h-7 w-7 rounded-[var(--radius-sm)]',
  md: 'h-8 w-8 rounded-[var(--radius-md)]',
  lg: 'h-10 w-10 rounded-[var(--radius-lg)]',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', size = 'md', active, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          active && 'text-text-1 bg-surface-hover/[0.08]',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
