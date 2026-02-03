import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-text-1">{title}</h3>
        {description ? (
          <p className="text-sm text-text-3">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function SettingsCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-stroke/20 bg-surface-solid/80 p-4 shadow-[var(--shadow-1)]',
        className
      )}
    >
      {children}
    </div>
  )
}

export function SettingsList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-stroke/10">{children}</div>
}

export function SettingsRow({
  title,
  description,
  children,
  align = 'center',
}: {
  title: string
  description?: string
  children: ReactNode
  align?: 'center' | 'start'
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-6 py-3',
        align === 'center' && 'items-center'
      )}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-text-1">{title}</div>
        {description ? (
          <div className="text-xs text-text-3">{description}</div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}
