import { useState, useRef } from 'react'
import { Download, FileJson, FileText, Loader2 } from 'lucide-react'
import { useThreadStore } from '../../stores/thread'
import { useSessionsStore } from '../../stores/sessions'
import { useProjectsStore } from '../../stores/projects'
import { exportSession, type ExportFormat, type ExportOptions } from '../../lib/exporters/sessionExporter'
import { useToast } from '../ui/Toast'
import { useDialogKeyboardShortcut } from '../../hooks/useDialogKeyboardShortcut'
import { logError } from '../../lib/errorUtils'
import { BaseDialog } from '../ui/BaseDialog'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { cn } from '../../lib/utils'

interface ExportDialogProps {
  isOpen: boolean
  threadId: string | null
  onClose: () => void
}

export function ExportDialog({ isOpen, threadId, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown')
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [includeTimestamps, setIncludeTimestamps] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()
  const exportButtonRef = useRef<HTMLButtonElement>(null)

  const threads = useThreadStore((state) => state.threads)
  const projects = useProjectsStore((state) => state.projects)
  const sessions = useSessionsStore((state) => state.sessions)

  useDialogKeyboardShortcut({
    isOpen,
    onConfirm: () => {
      if (!isExporting) exportButtonRef.current?.click()
    },
    onCancel: onClose,
    requireModifierKey: true,
  })

  const threadState = threadId ? threads[threadId] : null
  const thread = threadState?.thread

  const sessionMeta = threadId ? sessions.find((s) => s.sessionId === threadId) : null
  const project = thread ? projects.find((p) => thread.cwd?.startsWith(p.path)) : null
  const sessionLabel = sessionMeta?.title || project?.displayName || thread?.cwd?.split('/').pop() || 'Session'

  const handleExport = async () => {
    if (!threadId) return

    setIsExporting(true)
    try {
      const options: ExportOptions = { includeMetadata, includeTimestamps }
      await exportSession(threadId, format, options)
      toast.success('Session exported', { message: format === 'markdown' ? 'Markdown' : 'JSON' })
      onClose()
    } catch (error) {
      logError(error, { context: 'ExportDialog', source: 'sessions', details: 'Export failed' })
      toast.error('Failed to export session', {
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen || !threadId) return null

  return (
    <BaseDialog
      isOpen={true}
      onClose={onClose}
      title="Export Session"
      description="Export the current session to a local file."
      titleIcon={<Download size={16} />}
      maxWidth="md"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            ref={exportButtonRef}
            variant="primary"
            size="sm"
            onClick={() => void handleExport()}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {isExporting ? 'Exporting…' : 'Export'}
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-5">
        <div className="rounded-lg border border-stroke/20 bg-surface-solid p-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-3">Session:</span>
            <span className="font-medium text-text-1 truncate">{sessionLabel}</span>
          </div>
          {thread?.cwd && (
            <div className="mt-1 text-xs text-text-3">
              <span className="truncate font-mono">{thread.cwd}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-text-1">Export Format</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormat('markdown')}
              disabled={isExporting}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors',
                format === 'markdown'
                  ? 'border-primary/40 bg-primary/10 text-text-1'
                  : 'border-stroke/20 bg-surface-solid text-text-2 hover:bg-surface-hover/[0.06]'
              )}
            >
              <FileText size={16} />
              Markdown
            </button>
            <button
              type="button"
              onClick={() => setFormat('json')}
              disabled={isExporting}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors',
                format === 'json'
                  ? 'border-primary/40 bg-primary/10 text-text-1'
                  : 'border-stroke/20 bg-surface-solid text-text-2 hover:bg-surface-hover/[0.06]'
              )}
            >
              <FileJson size={16} />
              JSON
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium text-text-1">Options</div>
          <div className="space-y-2">
            <Checkbox
              id="export-include-metadata"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              disabled={isExporting}
              label="Include metadata"
              description="Model, project, and export timestamp."
            />
            <Checkbox
              id="export-include-timestamps"
              checked={includeTimestamps}
              onChange={(e) => setIncludeTimestamps(e.target.checked)}
              disabled={isExporting}
              label="Include message timestamps"
            />
          </div>
        </div>

        <div className="rounded-lg border border-stroke/20 bg-surface-solid p-3 text-xs text-text-3">
          {format === 'markdown' ? (
            <p>
              Export as a formatted Markdown document, suitable for sharing or viewing in any Markdown editor.
            </p>
          ) : (
            <p>
              Export as structured JSON data, suitable for programmatic processing or importing into other tools.
            </p>
          )}
        </div>
      </div>
    </BaseDialog>
  )
}

