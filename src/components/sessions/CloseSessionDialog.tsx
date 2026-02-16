import { useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useThreadStore } from '../../stores/thread'
import { useSessionsStore } from '../../stores/sessions'
import { useProjectsStore } from '../../stores/projects'
import { useDialogKeyboardShortcut } from '../../hooks/useDialogKeyboardShortcut'
import { BaseDialog } from '../ui/BaseDialog'
import { Button } from '../ui/Button'

interface CloseSessionDialogProps {
  isOpen: boolean
  threadId: string | null
  onClose: () => void
}

export function CloseSessionDialog({ isOpen, threadId, onClose }: CloseSessionDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const threads = useThreadStore((state) => state.threads)
  const projects = useProjectsStore((state) => state.projects)
  const sessions = useSessionsStore((state) => state.sessions)
  // closeThread is called via getState() to avoid dependency issues

  // Get thread info
  const threadState = threadId ? threads[threadId] : null
  const thread = threadState?.thread
  const isRunning = threadState?.turnStatus === 'running'

  // Get session/project info for display
  const sessionMeta = threadId ? sessions.find((s) => s.sessionId === threadId) : null
  const project = thread ? projects.find((p) => thread.cwd?.startsWith(p.path)) : null
  const sessionLabel = sessionMeta?.title || project?.displayName || thread?.cwd?.split('/').pop() || 'Session'

  const handleConfirm = () => {
    if (threadId) {
      useThreadStore.getState().closeThread(threadId)
    }
    onClose()
  }

  // Use keyboard shortcut hook for Cmd+Enter (or Ctrl+Enter on Windows/Linux)
  useDialogKeyboardShortcut({
    isOpen,
    onConfirm: () => confirmButtonRef.current?.click(),
    onCancel: onClose,
    requireModifierKey: false,
  })

  if (!isOpen || !threadId) {
    return null
  }

  return (
    <BaseDialog
      isOpen={true}
      onClose={onClose}
      title="Close Session"
      description="Confirm closing the current session."
      titleIcon={<AlertTriangle size={16} />}
      maxWidth="md"
      variant={isRunning ? 'warning' : 'default'}
      footer={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            ref={confirmButtonRef}
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
          >
            Close Session
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        <p className="text-sm text-text-3">Are you sure you want to close this session?</p>

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

        {isRunning && (
          <div className="flex items-start gap-2 rounded-lg border border-status-warning/30 bg-status-warning-muted p-3 text-status-warning">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs">
              This session is currently running. Closing it will interrupt the current operation.
            </p>
          </div>
        )}

        <p className="text-xs text-text-3">
          You can resume this session later from the session history.
        </p>
      </div>
    </BaseDialog>
  )
}
