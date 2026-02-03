import { lazy, Suspense, useState, useEffect, memo, type CSSProperties } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '../../lib/utils'

// Lazy load syntax highlighter for better initial load performance
const SyntaxHighlighter = lazy(() =>
  import('react-syntax-highlighter').then((mod) => ({ default: mod.Prism }))
)

// Lazy load theme - cached at module level
let cachedTheme: Record<string, CSSProperties> | null = null
const loadTheme = async () => {
  if (cachedTheme) return cachedTheme
  const mod = await import('react-syntax-highlighter/dist/esm/styles/prism')
  cachedTheme = mod.oneDark as Record<string, CSSProperties>
  return cachedTheme
}

interface MarkdownProps {
  content: string
  className?: string
}

// Memoized code block with lazy-loaded syntax highlighting
const CodeBlock = memo(function CodeBlock({ language, children }: { language: string; children: string }) {
  return (
    <Suspense
      fallback={
        <pre className="rounded-lg bg-surface-hover/[0.08] border border-stroke/20 p-4 text-sm font-mono overflow-x-auto text-text-2">
          <code>{children}</code>
        </pre>
      }
    >
      <LazyCodeBlock language={language}>{children}</LazyCodeBlock>
    </Suspense>
  )
})

const LazyCodeBlock = memo(function LazyCodeBlock({ language, children }: { language: string; children: string }) {
  const [theme, setTheme] = useState<Record<string, CSSProperties> | null>(cachedTheme)

  useEffect(() => {
    if (!theme) {
      void loadTheme().then(setTheme)
    }
  }, [theme])

  if (!theme) {
    return (
      <pre className="rounded-lg bg-surface-hover/[0.08] border border-stroke/20 p-4 text-sm font-mono overflow-x-auto text-text-2">
        <code>{children}</code>
      </pre>
    )
  }

  return (
    <SyntaxHighlighter
      style={theme}
      language={language}
      PreTag="div"
      customStyle={{
        margin: 0,
        borderRadius: '0 0 0.75rem 0.75rem',
        fontSize: '0.875rem',
        padding: '1rem',
      }}
    >
      {children}
    </SyntaxHighlighter>
  )
})

// Stable remarkPlugins array - defined outside component to avoid recreation
const remarkPlugins = [remarkGfm]

// Stable components object - defined outside component for zero allocation per render
// This is more efficient than useMemo since it's truly static
const markdownComponents = {
  code({ className, children }: { className?: string; children?: React.ReactNode }) {
    const match = /language-(\w+)/.exec(className || '')
    const isInline = !match && !className

    if (isInline) {
      return (
        <code className="rounded bg-surface-hover/[0.12] px-1.5 py-0.5 text-sm font-mono text-text-2">
          {children}
        </code>
      )
    }

    const language = match ? match[1] : 'text'
    const code = String(children).replace(/\n$/, '')

    return (
      <div className="relative rounded-xl overflow-hidden my-3 border border-stroke/20 bg-surface-solid shadow-[var(--shadow-1)]">
        {match && (
          <div className="bg-surface-hover/[0.08] px-4 py-2 text-xs font-medium text-text-3 border-b border-stroke/20 uppercase tracking-wide">
            {language}
          </div>
        )}
        <CodeBlock language={language}>{code}</CodeBlock>
      </div>
    )
  },
  pre({ children }: { children?: React.ReactNode }) {
    return <>{children}</>
  },
  a({ href, children }: { href?: string; children?: React.ReactNode }) {
    // Security: Validate URL to prevent javascript: and data: URL attacks
    const isValidUrl = (url: string | undefined): boolean => {
      if (!url) return false
      try {
        const parsed = new URL(url)
        // Only allow safe protocols
        return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)
      } catch {
        // Invalid URL or relative path - allow relative paths but not absolute dangerous ones
        return !url.startsWith('javascript:') && !url.startsWith('data:') && !url.startsWith('vbscript:')
      }
    }

    if (!isValidUrl(href)) {
      // Render as plain text for invalid URLs
      return <span className="text-muted-foreground">{children}</span>
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-1 font-medium hover:underline decoration-text-2/40 underline-offset-2 transition-colors"
      >
        {children}
      </a>
    )
  },
  ul({ children }: { children?: React.ReactNode }) {
    return <ul className="list-disc pl-5 my-3 space-y-1 marker:text-text-3">{children}</ul>
  },
  ol({ children }: { children?: React.ReactNode }) {
    return <ol className="list-decimal pl-5 my-3 space-y-1 marker:text-text-3">{children}</ol>
  },
  li({ children }: { children?: React.ReactNode }) {
    return <li className="my-1 leading-relaxed">{children}</li>
  },
  p({ children }: { children?: React.ReactNode }) {
    return <p className="my-3 first:mt-0 last:mb-0 leading-relaxed text-text-1/90">{children}</p>
  },
  h1({ children }: { children?: React.ReactNode }) {
    return <h1 className="text-2xl font-semibold mt-6 mb-4 tracking-tight text-text-1">{children}</h1>
  },
  h2({ children }: { children?: React.ReactNode }) {
    return <h2 className="text-xl font-semibold mt-5 mb-3 tracking-tight text-text-1">{children}</h2>
  },
  h3({ children }: { children?: React.ReactNode }) {
    return <h3 className="text-lg font-semibold mt-4 mb-2 tracking-tight text-text-1">{children}</h3>
  },
  blockquote({ children }: { children?: React.ReactNode }) {
    return (
      <blockquote className="my-4 border-l-4 border-stroke/30 bg-surface-hover/[0.06] pl-4 py-2 pr-3 rounded-r-xl text-text-2 italic">
        {children}
      </blockquote>
    )
  },
  table({ children }: { children?: React.ReactNode }) {
    return (
      <div className="overflow-x-auto my-4 rounded-xl border border-stroke/20 shadow-[var(--shadow-1)]">
        <table className="min-w-full border-collapse">
          {children}
        </table>
      </div>
    )
  },
  th({ children }: { children?: React.ReactNode }) {
    return (
      <th className="bg-surface-hover/[0.08] px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-text-3 border-b border-stroke/20">
        {children}
      </th>
    )
  },
  td({ children }: { children?: React.ReactNode }) {
    return <td className="px-4 py-2 border-b border-stroke/20 last:border-0 text-sm">{children}</td>
  },
  hr() {
    return <hr className="my-6 border-stroke/20" />
  },
}

// Memoized Markdown component - only re-renders when content or className changes
export const Markdown = memo(function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
})
