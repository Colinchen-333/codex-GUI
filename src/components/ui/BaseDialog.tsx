import { useRef, useId, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/lib/utils'

interface BaseDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  titleIcon?: ReactNode
  description?: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'danger' | 'warning'
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

const variantClasses = {
  default: 'bg-surface-solid',
  danger: 'bg-status-error-muted',
  warning: 'bg-status-warning-muted',
}

export function BaseDialog({
  isOpen,
  onClose,
  title,
  titleIcon,
  description,
  children,
  footer,
  maxWidth = 'md',
  variant = 'default',
}: BaseDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const containerRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onClose,
    initialFocusRef: closeButtonRef,
    restoreFocus: true,
  })

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay backdrop-blur-sm p-4 codex-dialog-overlay"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={containerRef}
        className={cn(
          'codex-dialog bg-background dark:bg-surface-solid rounded-2xl shadow-2xl w-full mx-4 overflow-hidden flex flex-col max-h-[90vh]',
          maxWidthClasses[maxWidth]
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        {description && (
          <p id={descriptionId} className="sr-only">
            {description}
          </p>
        )}

        <div
          className={cn(
            'flex items-center justify-between px-6 py-4 border-b border-stroke/20 flex-shrink-0',
            variantClasses[variant]
          )}
        >
          <div className="flex items-center space-x-3">
            {titleIcon && <span className="text-text-1">{titleIcon}</span>}
            <h2 id={titleId} className="text-lg font-semibold text-text-1">
              {title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1 rounded-full hover:bg-surface-hover/[0.08] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-text-1" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-stroke/20 bg-surface-solid flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
