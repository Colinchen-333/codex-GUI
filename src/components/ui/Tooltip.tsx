import { forwardRef, useState, type ReactNode, type HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type TooltipSide = 'top' | 'right' | 'bottom' | 'left'

interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content'> {
  content: ReactNode
  side?: TooltipSide
  sideOffset?: number
  delayMs?: number
  children: ReactNode
}

const sideStyles: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
}

const arrowStyles: Record<TooltipSide, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-surface-solid border-x-transparent border-b-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-surface-solid border-y-transparent border-l-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-surface-solid border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-surface-solid border-y-transparent border-r-transparent',
}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, side = 'top', sideOffset = 0, delayMs = 200, children, className, ...props }, ref) => {
    const [open, setOpen] = useState(false)
    const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null)

    const handleMouseEnter = () => {
      const id = setTimeout(() => setOpen(true), delayMs)
      setTimeoutId(id)
    }

    const handleMouseLeave = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        setTimeoutId(null)
      }
      setOpen(false)
    }

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        {...props}
      >
        {children}
        {open && content && (
          <div
            role="tooltip"
            className={cn(
              'absolute z-[var(--z-tooltip)] pointer-events-none',
              'animate-in fade-in zoom-in',
              sideStyles[side]
            )}
            style={{ 
              [side === 'top' || side === 'bottom' ? 'marginBottom' : 'marginLeft']: 
                side === 'top' || side === 'left' ? sideOffset : undefined,
              [side === 'top' || side === 'bottom' ? 'marginTop' : 'marginRight']: 
                side === 'bottom' || side === 'right' ? sideOffset : undefined,
            }}
          >
            <div className="relative">
              <div className={cn(
                'px-2 py-1.5 rounded-sm',
                'bg-surface-solid text-text-1 text-xs font-medium',
                'shadow-lg border border-stroke/20',
                'whitespace-nowrap'
              )}>
                {content}
              </div>
              <div className={cn(
                'absolute w-0 h-0 border-4',
                arrowStyles[side]
              )} />
            </div>
          </div>
        )}
      </div>
    )
  }
)

Tooltip.displayName = 'Tooltip'
