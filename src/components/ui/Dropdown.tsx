import {
  forwardRef,
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type HTMLAttributes,
  type ButtonHTMLAttributes,
} from 'react'
import { cn } from '../../lib/utils'

type DropdownContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

function useDropdown() {
  const context = useContext(DropdownContext)
  if (!context) throw new Error('Dropdown components must be used within DropdownRoot')
  return context
}

interface DropdownRootProps {
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DropdownRoot({ children, defaultOpen = false, open: controlledOpen, onOpenChange }: DropdownRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = useCallback((newOpen: boolean) => {
    setUncontrolledOpen(newOpen)
    onOpenChange?.(newOpen)
  }, [onOpenChange])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    if (open) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, setOpen])

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  )
}

interface DropdownTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export const DropdownTrigger = forwardRef<HTMLButtonElement, DropdownTriggerProps>(
  ({ children, className, onClick, ...props }, outerRef) => {
    const { open, setOpen, triggerRef: internalTriggerRef } = useDropdown()

    // Ref callback for setting both refs
    const handleRef = (node: HTMLButtonElement | null) => {
      // Set internal ref for dropdown functionality
      // This is safe - ref callbacks run during commit, not render
      internalTriggerRef.current = node
      // Forward to outer ref
      if (typeof outerRef === 'function') outerRef(node)
      else if (outerRef) outerRef.current = node
    }

    return (
      <button
        ref={handleRef}
        type="button"
        className={cn('inline-flex items-center', className)}
        onClick={(e) => {
          setOpen(!open)
          onClick?.(e)
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        {...props}
      >
        {children}
      </button>
    )
  }
)

DropdownTrigger.displayName = 'DropdownTrigger'

type DropdownSide = 'top' | 'right' | 'bottom' | 'left'
type DropdownAlign = 'start' | 'center' | 'end'

interface DropdownContentProps extends HTMLAttributes<HTMLDivElement> {
  side?: DropdownSide
  align?: DropdownAlign
  sideOffset?: number
}

const sidePositions: Record<DropdownSide, string> = {
  top: 'bottom-full mb-1',
  right: 'left-full ml-1',
  bottom: 'top-full mt-1',
  left: 'right-full mr-1',
}

const alignPositions: Record<DropdownAlign, Record<'vertical' | 'horizontal', string>> = {
  start: { vertical: 'left-0', horizontal: 'top-0' },
  center: { vertical: 'left-1/2 -translate-x-1/2', horizontal: 'top-1/2 -translate-y-1/2' },
  end: { vertical: 'right-0', horizontal: 'bottom-0' },
}

export const DropdownContent = forwardRef<HTMLDivElement, DropdownContentProps>(
  ({ children, side = 'bottom', align = 'start', sideOffset = 0, className, style, ...props }, ref) => {
    const { open } = useDropdown()
    const isVertical = side === 'top' || side === 'bottom'

    if (!open) return null

    return (
      <div
        ref={ref}
        role="menu"
        className={cn(
          'absolute z-[var(--z-dropdown)]',
          'min-w-[8rem] overflow-hidden',
          'rounded-lg border border-stroke/20',
          'bg-surface-solid shadow-lg',
          'animate-in fade-in zoom-in',
          sidePositions[side],
          alignPositions[align][isVertical ? 'vertical' : 'horizontal'],
          className
        )}
        style={{ ...style, [isVertical ? 'marginTop' : 'marginLeft']: sideOffset }}
        {...props}
      >
        {children}
      </div>
    )
  }
)

DropdownContent.displayName = 'DropdownContent'

interface DropdownItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean
}

export const DropdownItem = forwardRef<HTMLButtonElement, DropdownItemProps>(
  ({ children, className, inset, onClick, ...props }, ref) => {
    const { setOpen } = useDropdown()

    return (
      <button
        ref={ref}
        type="button"
        role="menuitem"
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2',
          'text-sm text-text-1 text-left',
          'transition-colors hover:bg-surface-hover/[0.08]',
          'focus:bg-surface-hover/[0.08] focus:outline-none',
          'disabled:pointer-events-none disabled:opacity-50',
          inset && 'pl-8',
          className
        )}
        onClick={(e) => {
          onClick?.(e)
          setOpen(false)
        }}
        {...props}
      >
        {children}
      </button>
    )
  }
)

DropdownItem.displayName = 'DropdownItem'

type DropdownSeparatorProps = HTMLAttributes<HTMLDivElement>

export const DropdownSeparator = forwardRef<HTMLDivElement, DropdownSeparatorProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      className={cn('my-1 h-px bg-stroke/15', className)}
      {...props}
    />
  )
)

DropdownSeparator.displayName = 'DropdownSeparator'

interface DropdownLabelProps extends HTMLAttributes<HTMLDivElement> {
  inset?: boolean
}

export const DropdownLabel = forwardRef<HTMLDivElement, DropdownLabelProps>(
  ({ children, className, inset, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-3 py-1.5 text-xs font-semibold text-text-3',
        inset && 'pl-8',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)

DropdownLabel.displayName = 'DropdownLabel'

// eslint-disable-next-line react-refresh/only-export-components -- Intentional: exports component namespace
export const Dropdown = {
  Root: DropdownRoot,
  Trigger: DropdownTrigger,
  Content: DropdownContent,
  Item: DropdownItem,
  Separator: DropdownSeparator,
  Label: DropdownLabel,
}
