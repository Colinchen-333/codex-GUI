import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type InputSize = 'sm' | 'md' | 'lg'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: InputSize
  error?: boolean
  icon?: React.ReactNode
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-7 px-2 text-xs rounded-sm',
  md: 'h-9 px-3 text-[13px] rounded-md',
  lg: 'h-11 px-4 text-sm rounded-lg',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = 'md', error, icon, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none">
            {icon}
          </span>
          <input
            ref={ref}
            className={cn(
              'w-full border bg-surface-solid text-text-1 placeholder:text-text-3',
              'transition-[border-color,box-shadow] duration-200 focus:outline-none focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              sizeStyles[inputSize],
              'pl-9',
              error
                ? 'border-destructive focus:border-destructive'
                : 'border-stroke/20 focus:border-stroke/40',
              className
            )}
            {...props}
          />
        </div>
      )
    }

    return (
      <input
        ref={ref}
        className={cn(
          'w-full border bg-surface-solid text-text-1 placeholder:text-text-3',
          'transition-[border-color,box-shadow] duration-200 focus:outline-none focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          sizeStyles[inputSize],
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

Input.displayName = 'Input'
