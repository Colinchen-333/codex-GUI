/**
 * FileChangeCard - Shows proposed file changes with diff view and approval UI
 *
 * Performance optimization: Wrapped with React.memo and custom comparison function
 * to prevent unnecessary re-renders in message lists. Only re-renders when:
 * - item.id changes (different message)
 * - item.status changes (status update)
 * - item.content changes meaningfully (shallow comparison)
 *
 * Architecture:
 * - Uses BaseCard for consistent layout and styling
 * - Business logic is extracted to useFileChangeApproval hook
 * - UI rendering logic is kept in this component
 */
import { memo, useState } from 'react'
import { FileCode } from 'lucide-react'
import { BaseCard, CardActions } from './BaseCard'
import { DiffView, parseDiff, type FileDiff } from '../../ui/DiffView'
import { formatTimestamp, shallowContentEqual } from '../utils'
import { useFileChangeApproval } from '../../../hooks/useFileChangeApproval'
import type { MessageItemProps, FileChangeContentType } from '../types'

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

interface FileStatsProps {
  addCount: number
  modifyCount: number
  deleteCount: number
}

/**
 * Display file change statistics (added, modified, deleted counts)
 */
const FileStats = memo(function FileStats({ addCount, modifyCount, deleteCount }: FileStatsProps) {
  return (
    <div className="flex items-center gap-3 text-[10px] font-medium">
      {addCount > 0 && (
        <span className="text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
          +{addCount} added
        </span>
      )}
      {modifyCount > 0 && (
        <span className="text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded">
          ~{modifyCount} modified
        </span>
      )}
      {deleteCount > 0 && (
        <span className="text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
          -{deleteCount} deleted
        </span>
      )}
    </div>
  )
})

interface ApprovalActionsProps {
  reason?: string
  isApplying: boolean
  onApply: (decision: 'accept' | 'acceptForSession') => void
  onDecline: () => void
}

/**
 * Approval action buttons (Apply, Allow for Session, Decline)
 */
const ApprovalActions = memo(function ApprovalActions({
  reason,
  isApplying,
  onApply,
  onDecline,
}: ApprovalActionsProps) {
  return (
    <div>
      {reason && <div className="mb-3 text-xs text-muted-foreground">Reason: {reason}</div>}
      <CardActions>
        <button
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          onClick={() => onApply('accept')}
          disabled={isApplying}
        >
          {isApplying ? 'Applying...' : 'Apply Changes'}
        </button>
        <button
          className="flex-1 rounded-lg bg-secondary px-4 py-2.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
          onClick={() => onApply('acceptForSession')}
          disabled={isApplying}
        >
          Allow for Session
        </button>
        <button
          className="rounded-lg border border-border bg-background px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
          onClick={onDecline}
        >
          Decline
        </button>
      </CardActions>
    </div>
  )
})

interface AppliedStatusProps {
  snapshotId?: string
  isReverting: boolean
  onRevert: () => void
}

/**
 * Applied status indicator with revert option
 */
const AppliedStatus = memo(function AppliedStatus({
  snapshotId,
  isReverting,
  onRevert,
}: AppliedStatusProps) {
  return (
    <div className="bg-green-50/50 dark:bg-green-900/10 p-3 border-t border-green-100 dark:border-green-900/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-400">
          <div className="h-4 w-4 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
            <span className="text-[10px]">✓</span>
          </div>
          <span>Changes applied</span>
        </div>
        {snapshotId && (
          <button
            className="rounded-md bg-background/50 px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors border border-transparent hover:border-destructive/20 disabled:opacity-50"
            onClick={onRevert}
            disabled={isReverting}
          >
            {isReverting ? 'Reverting...' : 'Revert Changes'}
          </button>
        )}
      </div>
    </div>
  )
})

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

/**
 * FileChangeCard Component
 *
 * Memoized to prevent re-renders when parent components update but this
 * specific message item hasn't changed. Custom comparison checks:
 * - item.id: Skip if different message entirely
 * - item.status: Re-render on status changes (pending -> completed, etc.)
 * - item.content: Shallow compare to catch content updates
 */
export const FileChangeCard = memo(
  function FileChangeCard({ item }: MessageItemProps) {
    const content = item.content as FileChangeContentType
    const [expandedFiles, setExpandedFiles] = useState<Set<number>>(new Set())

    // Use the file change approval hook for all business logic
    const { isApplying, isReverting, handleApplyChanges, handleRevert, handleDecline } =
      useFileChangeApproval({
        itemId: item.id,
        content,
      })

    // Calculate file change statistics
    const addCount = content.changes.filter((c) => c.kind === 'add').length
    const modifyCount = content.changes.filter(
      (c) => c.kind === 'modify' || c.kind === 'rename'
    ).length
    const deleteCount = content.changes.filter((c) => c.kind === 'delete').length

    // Convert changes to FileDiff format
    const fileDiffs: FileDiff[] = content.changes.map((change) => ({
      path: change.path,
      kind: change.kind as 'add' | 'modify' | 'delete' | 'rename',
      oldPath: change.oldPath,
      hunks: change.diff ? parseDiff(change.diff) : [],
      raw: change.diff,
    }))

    // Toggle file expansion
    const toggleFile = (index: number) => {
      setExpandedFiles((prev) => {
        const next = new Set(prev)
        if (next.has(index)) {
          next.delete(index)
        } else {
          next.add(index)
        }
        return next
      })
    }

    // Build header actions with file stats and timestamp
    const headerActions = (
      <>
        <FileStats addCount={addCount} modifyCount={modifyCount} deleteCount={deleteCount} />
        <span className="text-muted-foreground/60 font-normal text-[10px]">
          {formatTimestamp(item.createdAt)}
        </span>
      </>
    )

    // Build footer actions based on state
    const footerActions = content.needsApproval ? (
      <ApprovalActions
        reason={content.reason}
        isApplying={isApplying}
        onApply={handleApplyChanges}
        onDecline={handleDecline}
      />
    ) : undefined

    return (
      <BaseCard
        icon={<FileCode size={14} />}
        title="Proposed Changes"
        status={content.needsApproval ? 'pending' : undefined}
        borderColor={
          content.needsApproval
            ? 'border-l-4 border-l-blue-500 border-y-border/50 border-r-border/50'
            : undefined
        }
        headerActions={headerActions}
        actions={footerActions}
        expandable={false}
        maxWidthClass="max-w-3xl"
        contentPaddingClass="p-0"
      >
        {/* Diff content */}
        <div className="divide-y divide-border/30">
          {fileDiffs.map((diff, i) => (
            <DiffView
              key={i}
              diff={diff}
              collapsed={!expandedFiles.has(i)}
              onToggleCollapse={() => toggleFile(i)}
            />
          ))}
        </div>

        {/* Applied status (rendered after content, outside BaseCard footer) */}
        {content.applied && (
          <AppliedStatus
            snapshotId={content.snapshotId}
            isReverting={isReverting}
            onRevert={handleRevert}
          />
        )}
      </BaseCard>
    )
  },
  // Custom comparison function for React.memo
  // Returns true if props are equal (skip re-render), false if different (trigger re-render)
  (prev, next) => {
    // Different message entirely - must re-render
    if (prev.item.id !== next.item.id) return false
    // Status changed (e.g., pending -> completed) - must re-render
    if (prev.item.status !== next.item.status) return false
    // Shallow compare content for meaningful changes
    return shallowContentEqual(prev.item.content, next.item.content)
  }
)
