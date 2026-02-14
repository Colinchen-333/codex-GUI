import { forwardRef, type InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

type CheckboxSize = 'sm' | 'md'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  size?: CheckboxSize
  label?: string
  description?: string
}

const sizeStyles: Record<CheckboxSize, { box: string; icon: number; label: string }> = {
  sm: { box: 'h-4 w-4 rounded-xs', icon: 12, label: 'text-sm' },
  md: { box: 'h-5 w-5 rounded-sm', icon: 14, label: 'text-sm' },
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, size = 'md', label, description, checked, disabled, id, ...props }, ref) => {
    const styles = sizeStyles[size]

    return (
      <label
        htmlFor={id}
        className={cn(
          'inline-flex items-start gap-3 cursor-pointer',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <div className="relative flex-shrink-0">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              styles.box,
              'border border-stroke/40 bg-surface-solid transition-all',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
              'peer-checked:border-primary peer-checked:bg-primary',
              'peer-hover:border-primary/60',
              'peer-disabled:cursor-not-allowed peer-disabled:opacity-50'
            )}
          />
          <Check
            size={styles.icon}
            className={cn(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'text-primary-foreground opacity-0 transition-opacity',
              'peer-checked:opacity-100'
            )}
            strokeWidth={3}
          />
        </div>
        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <span className={cn(styles.label, 'font-medium text-text-1')}>
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-text-3">{description}</span>
            )}
          </div>
        )}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'
