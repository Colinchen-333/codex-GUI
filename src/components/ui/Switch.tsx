import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type SwitchSize = 'sm' | 'md'

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean
  onChange?: (checked: boolean) => void
  size?: SwitchSize
}

const sizeStyles: Record<SwitchSize, { track: string; thumb: string; translate: string }> = {
  sm: {
    track: 'h-4 w-7',
    thumb: 'h-3 w-3',
    translate: 'translate-x-3',
  },
  md: {
    track: 'h-5 w-9',
    thumb: 'h-4 w-4',
    translate: 'translate-x-4',
  },
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onChange, size = 'md', disabled, ...props }, ref) => {
    const styles = sizeStyles[size]

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          styles.track,
          checked ? 'bg-primary' : 'bg-surface-hover/[0.15]',
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none absolute top-0.5 left-0.5 rounded-full bg-switch-knob shadow-sm transition-transform duration-150 ease-out',
            styles.thumb,
            checked && styles.translate
          )}
        />
      </button>
    )
  }
)

Switch.displayName = 'Switch'
