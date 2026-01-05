import { lazy, Suspense, useState, useEffect, type CSSProperties } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '../../lib/utils'

// Lazy load syntax highlighter for better initial load performance
const SyntaxHighlighter = lazy(() =>
  import('react-syntax-highlighter').then((mod) => ({ default: mod.Prism }))
)

// Lazy load theme
const loadTheme = () =>
  import('react-syntax-highlighter/dist/esm/styles/prism').then((mod) => mod.oneDark)

interface MarkdownProps {
  content: string
  className?: string
}

// Code block with lazy-loaded syntax highlighting
function CodeBlock({ language, children }: { language: string; children: string }) {
  return (
    <Suspense
      fallback={
        <pre className="rounded-lg bg-secondary p-4 text-sm font-mono overflow-x-auto">
          <code>{children}</code>
        </pre>
      }
    >
      <LazyCodeBlock language={language}>{children}</LazyCodeBlock>
    </Suspense>
  )
}

function LazyCodeBlock({ language, children }: { language: string; children: string }) {
  const [theme, setTheme] = useState<Record<string, CSSProperties> | null>(null)

  useEffect(() => {
    loadTheme().then((t) => setTheme(t as Record<string, CSSProperties>))
  }, [])

  if (!theme) {
    return (
      <pre className="rounded-lg bg-secondary p-4 text-sm font-mono overflow-x-auto">
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
        borderRadius: '0 0 0.5rem 0.5rem',
        fontSize: '0.875rem',
      }}
    >
      {children}
    </SyntaxHighlighter>
  )
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match && !className

            if (isInline) {
              return (
                <code className="rounded bg-secondary px-1.5 py-0.5 text-sm font-mono">
                  {children}
                </code>
              )
            }

            const language = match ? match[1] : 'text'
            const code = String(children).replace(/\n$/, '')

            return (
              <div className="relative rounded-xl overflow-hidden my-3 border border-border/50 bg-card shadow-sm">
                {match && (
                  <div className="bg-secondary/30 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/50 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400/20"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/20"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400/20"></div>
                    </div>
                    <span className="ml-2 uppercase tracking-wider opacity-70">{language}</span>
                  </div>
                )}
                <CodeBlock language={language}>{code}</CodeBlock>
              </div>
            )
          },
          pre({ children }) {
            return <>{children}</>
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline decoration-primary/30 underline-offset-2 transition-colors"
              >
                {children}
              </a>
            )
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 my-3 space-y-1 marker:text-muted-foreground">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-3 space-y-1 marker:text-muted-foreground">{children}</ol>
          },
          li({ children }) {
            return <li className="my-1 leading-relaxed">{children}</li>
          },
          p({ children }) {
            return <p className="my-3 first:mt-0 last:mb-0 leading-relaxed text-foreground/90">{children}</p>
          },
          h1({ children }) {
            return <h1 className="text-2xl font-bold mt-6 mb-4 tracking-tight text-foreground">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-xl font-semibold mt-5 mb-3 tracking-tight text-foreground">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold mt-4 mb-2 tracking-tight text-foreground">{children}</h3>
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-4 border-l-4 border-primary/20 bg-secondary/10 pl-4 py-1 pr-2 rounded-r-xl text-muted-foreground italic">
                {children}
              </blockquote>
            )
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-xl border border-border/50 shadow-sm">
                <table className="min-w-full border-collapse">
                  {children}
                </table>
              </div>
            )
          },
          th({ children }) {
            return (
              <th className="bg-secondary/30 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                {children}
              </th>
            )
          },
          td({ children }) {
            return <td className="px-4 py-2 border-b border-border/30 last:border-0 text-sm">{children}</td>
          },
          hr() {
            return <hr className="my-6 border-border/50" />
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
