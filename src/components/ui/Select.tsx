import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

type SelectSize = 'sm' | 'md' | 'lg'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  selectSize?: SelectSize
  options: SelectOption[]
  placeholder?: string
  error?: boolean
}

const sizeStyles: Record<SelectSize, string> = {
  sm: 'h-8 px-2.5 pr-8 text-xs rounded-sm',
  md: 'h-9 px-3 pr-9 text-[13px] rounded-md',
  lg: 'h-11 px-4 pr-10 text-sm rounded-lg',
}

const iconSizeStyles: Record<SelectSize, { size: number; right: string }> = {
  sm: { size: 14, right: 'right-2' },
  md: { size: 16, right: 'right-2.5' },
  lg: { size: 18, right: 'right-3' },
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, selectSize = 'md', options, placeholder, error, disabled, ...props }, ref) => {
    const iconStyle = iconSizeStyles[selectSize]

    return (
      <div className="relative">
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full appearance-none border bg-surface-solid text-text-1 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60',
            'disabled:pointer-events-none disabled:opacity-50',
            error
              ? 'border-destructive/60 focus:ring-destructive/20 focus:border-destructive/60'
              : 'border-stroke/30 hover:border-stroke/50',
            sizeStyles[selectSize],
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={iconStyle.size}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 pointer-events-none text-text-3',
            iconStyle.right,
            disabled && 'opacity-50'
          )}
        />
      </div>
    )
  }
)

Select.displayName = 'Select'
