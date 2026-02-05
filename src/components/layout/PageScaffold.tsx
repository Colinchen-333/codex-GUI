import type { ReactNode } from 'react'

interface PageScaffoldProps {
  title: string
  description?: string
  children?: ReactNode
}

export function PageScaffold({ title, description, children }: PageScaffoldProps) {
  return (
    <div className="h-full overflow-auto px-6 py-5">
      <div className="mx-auto w-full max-w-4xl">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-text-1">{title}</h1>
          {description ? (
            <p className="text-sm text-text-3">{description}</p>
          ) : null}
        </div>
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </div>
  )
}
