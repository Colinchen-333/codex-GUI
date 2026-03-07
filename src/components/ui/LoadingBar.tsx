import { cn } from '../../lib/utils'

interface LoadingBarProps {
  className?: string
  variant?: 'primary' | 'accent'
}

export function LoadingBar({ className, variant = 'primary' }: LoadingBarProps) {
  return (
    <div
      className={cn(
        'loading-bar',
        variant === 'accent' && '[&::after]:bg-primary',
        className
      )}
    />
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
      <div className="relative w-48 h-[2px]">
        <LoadingBar />
      </div>
      {message && (
        <p className="mt-3 text-sm text-text-3">{message}</p>
      )}
    </div>
  )
}
