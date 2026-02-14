import { useEffect, useState } from 'react'
import { History, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useThreadStore, selectFocusedThread, selectSnapshots } from '../../stores/thread'
import { useProjectsStore } from '../../stores/projects'
import { useToast } from '../ui/Toast'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { BaseDialog } from '../ui/BaseDialog'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import type { Snapshot } from '../../lib/api'
import { logError } from '../../lib/errorUtils'
import { ErrorBoundary } from '../ui/ErrorBoundary'

interface SnapshotListDialogProps {
  isOpen: boolean
  onClose: () => void
}

function formatSnapshotTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // Less than 24 hours ago, show relative time
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    if (hours > 0) return `${hours}h ${minutes}m ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  // Otherwise show full date/time
  return date.toLocaleString()
}

function getSnapshotTypeLabel(type: string): string {
  switch (type) {
    case 'pre_change':
      return 'Pre-change'
    case 'manual':
      return 'Manual'
    case 'auto':
      return 'Auto'
    default:
      return type
  }
}

export function SnapshotListDialog({ isOpen, onClose }: SnapshotListDialogProps) {
  // Use selectors to avoid infinite re-render loops from getter-based state access
  const focusedThread = useThreadStore(selectFocusedThread)
  const activeThread = focusedThread?.thread ?? null
  const snapshots = useThreadStore(selectSnapshots)
  // fetchSnapshots, revertToSnapshot are called via getState() to avoid dependency issues
  const { projects, selectedProjectId } = useProjectsStore()
  const { showToast } = useToast()
  const [isReverting, setIsReverting] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [confirmRevert, setConfirmRevert] = useState<{
    isOpen: boolean
    snapshot: Snapshot | null
  }>({ isOpen: false, snapshot: null })

  const project = projects.find((p) => p.id === selectedProjectId)

  useEffect(() => {
    if (isOpen && activeThread) {
      setIsLoading(true)
      void useThreadStore.getState().fetchSnapshots().finally(() => setIsLoading(false))
    }
  }, [isOpen, activeThread]) // Remove fetchSnapshots dependency

  const handleRevertClick = (snapshot: Snapshot) => {
    setConfirmRevert({ isOpen: true, snapshot })
  }

  const handleRevertConfirm = async () => {
    const snapshot = confirmRevert.snapshot
    if (!snapshot) return

    if (!project) {
      showToast('No project selected', 'error')
      setConfirmRevert({ isOpen: false, snapshot: null })
      return
    }

    setConfirmRevert({ isOpen: false, snapshot: null })
    setIsReverting(snapshot.id)
    try {
      await useThreadStore.getState().revertToSnapshot(snapshot.id, project.path)
      showToast('Reverted to snapshot successfully', 'success')
    } catch (error) {
      logError(error, {
        context: 'SnapshotListDialog',
        source: 'dialogs',
        details: 'Failed to revert to snapshot'
      })
      showToast('Failed to revert to snapshot', 'error')
    } finally {
      setIsReverting(null)
    }
  }

  const handleRevertCancel = () => {
    setConfirmRevert({ isOpen: false, snapshot: null })
  }

  if (!isOpen) return null

  const errorFallback = (
    <BaseDialog
      isOpen={true}
      onClose={onClose}
      title="Snapshots unavailable"
      description="Something went wrong while loading snapshots."
      titleIcon={<History size={16} />}
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="p-6 text-sm text-text-3">
        Something went wrong while loading snapshots.
      </div>
    </BaseDialog>
  )

  return (
    <ErrorBoundary fallback={errorFallback}>
      <BaseDialog
        isOpen={isOpen}
        onClose={onClose}
        title="Snapshots"
        description="Restore the project to a previous snapshot."
        titleIcon={<History size={16} />}
        maxWidth="lg"
        footer={
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="max-h-[400px] overflow-y-auto p-4">
          {!activeThread ? (
            <div className="flex h-32 items-center justify-center text-sm text-text-3">
              No active session. Start a session to create snapshots.
            </div>
          ) : isLoading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-text-3">
              <Loader2 size={16} className="animate-spin" />
              Loading snapshots...
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-sm text-text-3">
              <p className="text-text-2 font-medium">No snapshots yet</p>
              <p className="text-xs mt-1">
                Snapshots are created automatically before changes are applied.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {snapshots.map((snapshot) => {
                let metadata: Record<string, unknown> = {}
                if (snapshot.metadataJson) {
                  try {
                    metadata = JSON.parse(snapshot.metadataJson) as Record<string, unknown>
                  } catch {
                    metadata = {}
                  }
                }

                const description =
                  typeof metadata.description === 'string' ? metadata.description : null
                const filesChanged =
                  typeof metadata.filesChanged === 'number' ? metadata.filesChanged : null

                const reverting = isReverting === snapshot.id

                return (
                  <div
                    key={snapshot.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border border-stroke/20 p-3 transition-colors',
                      'bg-surface-hover/[0.04] hover:bg-surface-hover/[0.08]'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-1">
                          {formatSnapshotTime(snapshot.createdAt)}
                        </span>
                        <Badge variant="secondary">{getSnapshotTypeLabel(snapshot.snapshotType)}</Badge>
                      </div>
                      {description && (
                        <p className="mt-1 text-xs text-text-3 truncate">{description}</p>
                      )}
                      {filesChanged !== null && (
                        <p className="mt-1 text-xs text-text-3">
                          {filesChanged} file(s) backed up
                        </p>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRevertClick(snapshot)}
                      disabled={reverting}
                      className="gap-2"
                    >
                      {reverting && <Loader2 size={14} className="animate-spin" />}
                      {reverting ? 'Reverting...' : 'Revert'}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Revert Confirmation Dialog */}
        <ConfirmDialog
          isOpen={confirmRevert.isOpen}
          title="Revert to Snapshot"
          message="Reverting will restore the project to this snapshot and discard all changes after it. This cannot be undone."
          confirmText="Revert"
          cancelText="Cancel"
          variant="warning"
          onConfirm={handleRevertConfirm}
          onCancel={handleRevertCancel}
        />
      </BaseDialog>
    </ErrorBoundary>
  )
}
