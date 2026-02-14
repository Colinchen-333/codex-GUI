import {
  forwardRef,
  createContext,
  useContext,
  useState,
  type ReactNode,
  type HTMLAttributes,
} from 'react'
import { cn } from '../../lib/utils'

type AccordionContextValue = {
  openItems: Set<string>
  toggleItem: (value: string) => void
  type: 'single' | 'multiple'
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

function useAccordion() {
  const context = useContext(AccordionContext)
  if (!context) throw new Error('Accordion components must be used within AccordionRoot')
  return context
}

interface AccordionRootProps extends HTMLAttributes<HTMLDivElement> {
  type?: 'single' | 'multiple'
  defaultValue?: string | string[]
  children: ReactNode
}

export const AccordionRoot = forwardRef<HTMLDivElement, AccordionRootProps>(
  ({ type = 'single', defaultValue, children, className, ...props }, ref) => {
    const [openItems, setOpenItems] = useState<Set<string>>(() => {
      if (!defaultValue) return new Set()
      return new Set(Array.isArray(defaultValue) ? defaultValue : [defaultValue])
    })

    const toggleItem = (value: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev)
        if (next.has(value)) {
          next.delete(value)
        } else {
          if (type === 'single') next.clear()
          next.add(value)
        }
        return next
      })
    }

    return (
      <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
        <div ref={ref} className={cn('flex flex-col', className)} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    )
  }
)

AccordionRoot.displayName = 'AccordionRoot'

interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  children: ReactNode
}

const AccordionItemContext = createContext<{ value: string; isOpen: boolean } | null>(null)

function useAccordionItem() {
  const context = useContext(AccordionItemContext)
  if (!context) throw new Error('AccordionItem components must be used within AccordionItem')
  return context
}

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, children, className, ...props }, ref) => {
    const { openItems } = useAccordion()
    const isOpen = openItems.has(value)

    return (
      <AccordionItemContext.Provider value={{ value, isOpen }}>
        <div
          ref={ref}
          data-state={isOpen ? 'open' : 'closed'}
          className={cn('border-b border-stroke/10 last:border-b-0', className)}
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    )
  }
)

AccordionItem.displayName = 'AccordionItem'

interface AccordionTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  showChevron?: boolean
}

export const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ children, showChevron = true, className, ...props }, ref) => {
    const { toggleItem } = useAccordion()
    const { value, isOpen } = useAccordionItem()

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'accordion-trigger flex w-full items-center justify-between gap-2',
          'py-2 text-left text-text-1 font-medium',
          'transition-colors hover:text-text-1/80',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
        onClick={() => toggleItem(value)}
        aria-expanded={isOpen}
        data-state={isOpen ? 'open' : 'closed'}
        {...props}
      >
        {children}
        {showChevron && (
          <span className="relative h-4 w-4 shrink-0">
            <ChevronIcon
              className={cn(
                'folder-icon-chevron absolute inset-0 h-4 w-4 text-text-3',
                'transition-transform duration-fast ease-out',
                isOpen && 'rotate-90'
              )}
            />
          </span>
        )}
      </button>
    )
  }
)

AccordionTrigger.displayName = 'AccordionTrigger'

interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ children, className, ...props }, ref) => {
    const { isOpen } = useAccordionItem()

    return (
      <div
        ref={ref}
        className={cn(
          'accordion-content overflow-hidden',
          'transition-all duration-normal ease-out',
          isOpen ? 'animate-accordion-open' : 'animate-accordion-close'
        )}
        data-state={isOpen ? 'open' : 'closed'}
        hidden={!isOpen}
        {...props}
      >
        <div className={cn('pb-3', className)}>{children}</div>
      </div>
    )
  }
)

AccordionContent.displayName = 'AccordionContent'

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 4L10 8L6 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- Intentional: exports component namespace
export const Accordion = {
  Root: AccordionRoot,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
}
