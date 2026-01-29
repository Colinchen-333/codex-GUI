import { useRef, useId, useMemo } from 'react'
import { X, FileCode } from 'lucide-react'
import { DiffView, parseDiff, type FileDiff } from '@/components/ui/DiffView'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { cn } from '@/lib/utils'

interface FileChange {
  path: string
  kind: string
  diff?: string
  oldPath?: string
}

interface FileChangeDiffModalProps {
  isOpen: boolean
  onClose: () => void
  changes: FileChange[]
  title?: string
}

export function FileChangeDiffModal({
  isOpen,
  onClose,
  changes,
  title = '文件变更详情',
}: FileChangeDiffModalProps) {
  const titleId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const containerRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onClose,
    initialFocusRef: closeButtonRef,
    restoreFocus: true,
  })

  const fileDiffs = useMemo<FileDiff[]>(() => {
    return changes.map((change) => {
      const hunks = parseDiff(change.diff || '')
      return {
        path: change.path,
        kind: change.kind as 'add' | 'modify' | 'delete' | 'rename',
        oldPath: change.oldPath,
        hunks,
        raw: change.diff,
      }
    })
  }, [changes])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const { addCount, modifyCount, deleteCount } = useMemo(() => ({
    addCount: changes.filter((c) => c.kind === 'add').length,
    modifyCount: changes.filter((c) => c.kind === 'modify').length,
    deleteCount: changes.filter((c) => c.kind === 'delete').length,
  }), [changes])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={containerRef}
        className={cn(
          'w-full max-w-4xl max-h-[85vh] rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl',
          'flex flex-col overflow-hidden animate-in zoom-in-95 duration-200'
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <FileCode className="w-5 h-5 text-zinc-400" />
            <h2 id={titleId} className="text-lg font-medium text-white">
              {title}
            </h2>
            <div className="flex items-center gap-2 text-xs">
              {addCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-green-900/50 text-green-400">
                  +{addCount}
                </span>
              )}
              {modifyCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-yellow-900/50 text-yellow-400">
                  ~{modifyCount}
                </span>
              )}
              {deleteCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-red-900/50 text-red-400">
                  -{deleteCount}
                </span>
              )}
              <span className="text-zinc-500">{changes.length} file(s)</span>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {fileDiffs.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              没有可显示的差异内容
            </div>
          ) : (
            fileDiffs.map((diff) => (
              <DiffView key={`${diff.path}-${diff.kind}-${diff.oldPath ?? ''}`} diff={diff} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-4 py-3 border-t border-zinc-700 bg-zinc-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
