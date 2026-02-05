import { useRef, useId } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useDialogKeyboardShortcut } from '../../hooks/useDialogKeyboardShortcut'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
  /**
   * Optional: Which button to focus initially
   * @default 'confirm' for danger variant, 'cancel' for warning variant
   */
  initialFocus?: 'confirm' | 'cancel'
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  initialFocus,
}: ConfirmDialogProps) {
  // Generate unique IDs for ARIA attributes
  const titleId = useId()
  const descriptionId = useId()

  // Refs for focusable buttons
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Determine which button to focus initially
  // Default: for danger dialogs focus confirm (to prevent accidental confirm),
  // for warning dialogs focus cancel
  const defaultInitialFocus = variant === 'danger' ? 'cancel' : 'confirm'
  const focusTarget = initialFocus ?? defaultInitialFocus
  const initialFocusRef = focusTarget === 'confirm' ? confirmButtonRef : cancelButtonRef

  // Use focus trap hook for keyboard navigation
  const containerRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onCancel,
    initialFocusRef,
    restoreFocus: true,
  })

  // Detect reduced motion preference
  const prefersReducedMotion = useReducedMotion()

  // Use keyboard shortcut hook for Cmd+Enter (or Ctrl+Enter on Windows/Linux)
  useDialogKeyboardShortcut({
    isOpen,
    onConfirm,
    onCancel,
    requireModifierKey: false, // Allow plain Enter to confirm as well
  })

  // Handle Enter key on dialog (confirm action) - legacy support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter on the dialog itself (not on buttons) triggers confirm
    if (e.key === 'Enter' && e.target === e.currentTarget) {
      e.preventDefault()
      onConfirm()
    }
  }

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  if (!isOpen) return null

  const isDanger = variant === 'danger'

  // Animation classes based on motion preference
  const animationClass = prefersReducedMotion
    ? '' // No animation for reduced motion
    : 'animate-in zoom-in-95 duration-200'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      role="presentation"
      aria-hidden="false"
    >
      <div
        ref={containerRef}
        className={`w-full max-w-md rounded-2xl bg-surface-solid p-7 shadow-[var(--shadow-2)] border border-stroke/30 ${animationClass}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full ${
              isDanger
                ? 'bg-destructive/10 text-destructive'
                : 'bg-warning/10 text-warning'
            }`}
            aria-hidden="true"
          >
            <AlertTriangle
              size={32}
              className={isDanger ? 'text-destructive' : 'text-warning'}
            />
          </div>
        </div>

        {/* Title */}
        <h2
          id={titleId}
          className="mb-3 text-xl font-semibold tracking-tight text-center text-text-1"
        >
          {title}
        </h2>

        {/* Message */}
        <p
          id={descriptionId}
          className="mb-6 text-center text-text-3 leading-relaxed"
        >
          {message}
        </p>

        {/* Buttons */}
        <div className="flex justify-center gap-3" role="group" aria-label="Dialog actions">
          <Button
            ref={cancelButtonRef}
            variant="ghost"
            className="min-w-[100px]"
            onClick={onCancel}
            aria-label={`${cancelText}, close dialog`}
          >
            {cancelText}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant="destructive"
            className="min-w-[100px]"
            onClick={onConfirm}
            aria-label={`${confirmText}, ${isDanger ? 'this action cannot be undone' : 'proceed with action'}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
