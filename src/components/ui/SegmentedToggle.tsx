import { cn } from '../../lib/utils'

export interface SegmentedOption {
  id: string
  label: string
  disabled?: boolean
  icon?: React.ReactNode
  ariaLabel?: string
}

interface SegmentedToggleProps {
  options: SegmentedOption[]
  selectedId: string
  onSelect: (id: string) => void
  size?: 'default' | 'sm' | 'icon'
  className?: string
  uniform?: boolean
  ariaLabel?: string
}

export function SegmentedToggle({
  options,
  selectedId,
  onSelect,
  size = 'default',
  className,
  uniform = false,
  ariaLabel,
}: SegmentedToggleProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg bg-surface-hover/[0.06] p-0.5',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={selectedId === option.id}
          aria-label={option.ariaLabel ?? option.label}
          disabled={option.disabled}
          onClick={() => onSelect(option.id)}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-md transition-all duration-fast',
            'text-sm font-medium select-none',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40',
            'disabled:opacity-30 disabled:cursor-not-allowed',
            size === 'default' && 'px-3 py-1.5',
            size === 'sm' && 'px-2 py-1 text-xs',
            size === 'icon' && 'p-1.5',
            uniform && 'flex-1',
            selectedId === option.id
              ? 'bg-surface-solid text-text-1 shadow-sm'
              : 'text-text-3 hover:text-text-2 hover:bg-surface-hover/[0.04]',
          )}
        >
          {option.icon}
          {size !== 'icon' && <span>{option.label}</span>}
        </button>
      ))}
    </div>
  )
}
