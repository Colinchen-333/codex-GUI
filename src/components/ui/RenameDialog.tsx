import { useState, useEffect, useRef, useId } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useDialogKeyboardShortcut } from '../../hooks/useDialogKeyboardShortcut'

interface RenameDialogProps {
  isOpen: boolean
  title: string
  currentName: string
  onConfirm: (newName: string) => void
  onCancel: () => void
  /**
   * Placeholder text for the input field
   * @default 'Enter name...'
   */
  placeholder?: string
  /**
   * Label for the rename button
   * @default 'Rename'
   */
  confirmText?: string
  /**
   * Label for the cancel button
   * @default 'Cancel'
   */
  cancelText?: string
}

export function RenameDialog({
  isOpen,
  title,
  currentName,
  onConfirm,
  onCancel,
  placeholder = 'Enter name...',
  confirmText = 'Rename',
  cancelText = 'Cancel',
}: RenameDialogProps) {
  const [name, setName] = useState(currentName)
  const inputRef = useRef<HTMLInputElement>(null)

  // Generate unique IDs for ARIA attributes
  const titleId = useId()
  const inputId = useId()
  const descriptionId = useId()

  // Use focus trap hook for keyboard navigation
  const containerRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onCancel,
    initialFocusRef: inputRef,
    restoreFocus: true,
  })

  // Detect reduced motion preference
  const prefersReducedMotion = useReducedMotion()

  // Use keyboard shortcut hook for Cmd+Enter (or Ctrl+Enter on Windows/Linux)
  // When input is focused, plain Enter submits the form, Cmd+Enter also submits
  useDialogKeyboardShortcut({
    isOpen,
    onConfirm: () => {
      const trimmedName = name.trim()
      if (trimmedName && trimmedName !== currentName) {
        onConfirm(trimmedName)
      }
    },
    onCancel,
    requireModifierKey: false,
    inputRef,
  })

  // Reset name when dialog opens - legitimate state initialization
  useEffect(() => {
    if (!isOpen) {
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initializing form state when dialog opens
    setName(currentName)
    // Select text after dialog opens (focus is handled by useFocusTrap)
    const timeoutId = setTimeout(() => {
      inputRef.current?.select()
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [isOpen, currentName, onCancel, onConfirm])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName && trimmedName !== currentName) {
      onConfirm(trimmedName)
    } else {
      onCancel()
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

  const isNameValid = name.trim().length > 0
  const hasChanged = name.trim() !== currentName

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
        className={`w-full max-w-sm rounded-2xl bg-surface-solid p-7 shadow-[var(--shadow-2)] border border-stroke/30 ${animationClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <h2
          id={titleId}
          className="mb-2 text-xl font-semibold tracking-tight text-text-1"
        >
          {title}
        </h2>

        <p
          id={descriptionId}
          className="mb-4 text-sm text-text-3"
        >
          Enter a new name below. Press Enter to confirm or Escape to cancel.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-6">
            <label htmlFor={inputId} className="sr-only">
              New name
            </label>
            <Input
              ref={inputRef}
              id={inputId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              inputSize="lg"
              placeholder={placeholder}
              error={!isNameValid && name.length > 0}
              aria-invalid={!isNameValid}
              aria-describedby={!isNameValid ? `${inputId}-error` : undefined}
              autoComplete="off"
              spellCheck={false}
            />
            {!isNameValid && name.length > 0 && (
              <p
                id={`${inputId}-error`}
                className="mt-2 text-sm text-destructive"
                role="alert"
              >
                Name cannot be empty or contain only spaces
              </p>
            )}
          </div>

          <div
            className="flex justify-end gap-3"
            role="group"
            aria-label="Dialog actions"
          >
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              aria-label={`${cancelText}, close dialog without saving`}
            >
              {cancelText}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!isNameValid || !hasChanged}
              aria-label={
                !isNameValid
                  ? 'Cannot rename: name is invalid'
                  : !hasChanged
                    ? 'Cannot rename: name has not changed'
                    : `${confirmText} to "${name.trim()}"`
              }
            >
              {confirmText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
