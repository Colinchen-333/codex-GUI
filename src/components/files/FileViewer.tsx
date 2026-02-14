import { useMemo } from 'react'
import { FileCode, File as FileIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface FileViewerProps {
  filePath: string | null
  content: string | null
  fileSize?: number
  isLoading?: boolean
  error?: string | null
}

/** Format byte size to human-readable string */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Get breadcrumb segments from path */
function getBreadcrumbs(path: string): string[] {
  return path.split('/').filter(Boolean)
}

export function FileViewer({ filePath, content, fileSize, isLoading, error }: FileViewerProps) {
  const lines = useMemo(() => {
    if (!content) return []
    return content.split('\n')
  }, [content])

  const lineNumberWidth = useMemo(() => {
    if (lines.length === 0) return 3
    return Math.max(3, String(lines.length).length)
  }, [lines.length])

  // Empty state
  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full text-text-3">
        <div className="text-center space-y-2">
          <FileIcon className="icon-lg mx-auto opacity-40" />
          <p className="text-sm">Select a file to preview</p>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-stroke/15">
          <div className="h-4 w-32 loading-shimmer rounded" />
        </div>
        <div className="flex-1 p-4 space-y-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-4 loading-shimmer rounded"
              style={{ width: `${40 + (i * 5) % 50}%` }}
            />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full">
        <FileHeader filePath={filePath} fileSize={fileSize} />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center space-y-2 px-4">
            <p className="text-sm text-status-error">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Empty file
  if (content !== null && content.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <FileHeader filePath={filePath} fileSize={fileSize} />
        <div className="flex items-center justify-center flex-1 text-text-3 text-sm">
          Empty file
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <FileHeader filePath={filePath} fileSize={fileSize} />
      <div className="flex-1 overflow-auto bg-surface">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-hover/[0.03] group">
                <td
                  className="sticky left-0 select-none text-right pr-3 pl-3 text-text-3 bg-surface font-mono text-xs leading-[1.8] border-r border-stroke/10"
                  style={{ width: `${lineNumberWidth + 2}ch`, minWidth: `${lineNumberWidth + 2}ch` }}
                >
                  {i + 1}
                </td>
                <td className="pl-4 pr-4 font-mono text-xs leading-[1.8] text-text-1 whitespace-pre select-text">
                  {line || '\u00A0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FileHeader({ filePath, fileSize }: { filePath: string; fileSize?: number }) {
  const breadcrumbs = getBreadcrumbs(filePath)
  const fileName = breadcrumbs[breadcrumbs.length - 1] || filePath

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-stroke/15 bg-surface-solid shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <FileCode className="icon-sm text-text-3 shrink-0" />
        <div className="flex items-center gap-1 min-w-0 text-sm">
          {breadcrumbs.length > 1 && (
            <span className="text-text-3 truncate">
              {breadcrumbs.slice(0, -1).map((segment, i) => (
                <span key={i}>
                  {segment}
                  <span className="mx-0.5 text-text-3/50">/</span>
                </span>
              ))}
            </span>
          )}
          <span className={cn('font-medium text-text-1 shrink-0')}>{fileName}</span>
        </div>
      </div>
      {fileSize != null && (
        <span className="text-xs text-text-3 shrink-0 tabular-nums">
          {formatSize(fileSize)}
        </span>
      )}
    </div>
  )
}
