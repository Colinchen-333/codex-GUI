import { cn } from '../../lib/utils'

interface LoadingBarProps {
  className?: string
  variant?: 'primary' | 'accent'
}

export function LoadingBar({ className, variant = 'primary' }: LoadingBarProps) {
  return (
    <div
      className={cn(
        'h-1 w-full overflow-hidden rounded-full bg-surface-hover/[0.1]',
        className
      )}
    >
      <div
        className={cn(
          'h-full w-1/3 rounded-full loading-bar-slide',
          variant === 'primary' ? 'bg-primary' : 'bg-text-2'
        )}
      />
    </div>
  )
}

interface LoadingOverlayProps {
  message?: string
  className?: string
}

export function LoadingOverlay({ message, className }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10',
        className
      )}
    >
      <div className="w-48">
        <LoadingBar />
      </div>
      {message && (
        <p className="mt-3 text-sm text-text-3">{message}</p>
      )}
    </div>
  )
}
