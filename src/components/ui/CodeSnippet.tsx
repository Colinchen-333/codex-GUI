import { memo, useState, useCallback } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '../../lib/utils'

interface CodeSnippetProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  className?: string
}

/** Duration (ms) the "Copied!" feedback is shown before resetting. */
const COPY_FEEDBACK_DURATION = 2000

export const CodeSnippet = memo<CodeSnippetProps>(
  ({ code, language, showLineNumbers = false, className }) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = useCallback(async () => {
      if (copied) return
      try {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION)
      } catch {
        // Clipboard write failed silently — user can still manually select the text
      }
    }, [code, copied])

    const lines = code.split('\n')

    return (
      <div
        className={cn(
          'rounded-lg border border-stroke/20 bg-surface-solid overflow-hidden',
          'font-mono text-[13px] leading-relaxed',
          className,
        )}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-stroke/15 bg-surface">
          {language ? (
            <span className="text-xs text-text-3 font-sans font-medium select-none">
              {language}
            </span>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? 'Copied' : 'Copy code'}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-sm px-2 py-1',
              'text-xs font-sans font-medium transition-all duration-fast',
              copied
                ? 'text-status-success'
                : 'text-text-3 hover:text-text-1 hover:bg-surface-hover/[0.08]',
            )}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                Copy
              </>
            )}
          </button>
        </div>

        {/* Code body */}
        <div className="overflow-x-auto">
          <pre className="p-3 m-0">
            {showLineNumbers ? (
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="group">
                      <td
                        className={cn(
                          'pr-4 select-none text-text-3 text-right align-top',
                          'min-w-[2.5rem] tabular-nums',
                        )}
                        aria-hidden="true"
                      >
                        {i + 1}
                      </td>
                      <td className="text-text-1 whitespace-pre w-full">
                        {line || '\u00A0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <code className="text-text-1 whitespace-pre">{code}</code>
            )}
          </pre>
        </div>
      </div>
    )
  }
)

CodeSnippet.displayName = 'CodeSnippet'
