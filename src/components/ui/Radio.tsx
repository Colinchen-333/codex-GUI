import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

type RadioSize = 'sm' | 'md'

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  size?: RadioSize
  label?: ReactNode
  description?: ReactNode
}

const sizeStyles: Record<RadioSize, { radio: string; dot: string; label: string; description: string }> = {
  sm: {
    radio: 'h-4 w-4',
    dot: 'h-1.5 w-1.5',
    label: 'text-sm',
    description: 'text-xs',
  },
  md: {
    radio: 'h-5 w-5',
    dot: 'h-2 w-2',
    label: 'text-base',
    description: 'text-sm',
  },
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, size = 'md', label, description, disabled, id, ...props }, ref) => {
    const styles = sizeStyles[size]
    const generatedId = useId()
    const inputId = id || `radio-${generatedId}`

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex items-start gap-2.5 cursor-pointer',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <span className="relative flex items-center justify-center pt-0.5">
          <input
            ref={ref}
            type="radio"
            id={inputId}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <span
            className={cn(
              'flex items-center justify-center rounded-full',
              'border-2 border-stroke/40',
              'transition-all duration-fast',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
              'peer-checked:border-primary peer-checked:bg-primary',
              'peer-disabled:opacity-50',
              styles.radio
            )}
            aria-hidden="true"
          >
            <span
              className={cn(
                'rounded-full bg-primary-foreground',
                'scale-0 transition-transform duration-fast',
                'peer-checked:scale-100',
                styles.dot
              )}
            />
          </span>
        </span>
        {(label || description) && (
          <span className="flex flex-col gap-0.5">
            {label && (
              <span className={cn('text-text-1 font-medium leading-tight', styles.label)}>
                {label}
              </span>
            )}
            {description && (
              <span className={cn('text-text-3 leading-snug', styles.description)}>
                {description}
              </span>
            )}
          </span>
        )}
      </label>
    )
  }
)

Radio.displayName = 'Radio'

interface RadioGroupProps {
  children: ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function RadioGroup({ children, className, orientation = 'vertical' }: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'flex',
        orientation === 'vertical' ? 'flex-col gap-2' : 'flex-row gap-4 flex-wrap',
        className
      )}
    >
      {children}
    </div>
  )
}
