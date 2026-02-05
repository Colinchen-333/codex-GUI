import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
  secondary: 'bg-surface-solid text-text-1 border border-stroke/30 hover:bg-surface-hover/[0.08]',
  ghost: 'text-text-2 hover:text-text-1 hover:bg-surface-hover/[0.08]',
  outline: 'border border-stroke/30 bg-transparent text-text-1 hover:bg-surface-hover/[0.06]',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-[var(--radius-sm)]',
  md: 'h-9 px-3 text-[13px] gap-2 rounded-[var(--radius-md)]',
  lg: 'h-11 px-4 text-sm gap-2 rounded-[var(--radius-lg)]',
  icon: 'h-8 w-8 rounded-[var(--radius-sm)]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          loading && 'pointer-events-none',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
