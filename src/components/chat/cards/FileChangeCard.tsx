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
import { memo, useMemo, useState } from 'react'
import { Check, FileCode } from 'lucide-react'
import { BaseCard, CardActions } from './BaseCard'
import { DiffView, parseDiff, type FileDiff } from '../../ui/DiffView'
import { formatTimestamp, shallowContentEqual } from '../utils'
import { useFileChangeApproval } from '../../../hooks/useFileChangeApproval'
import type { MessageItemProps, FileChangeContentType } from '../types'

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

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
      {reason && <div className="mb-3 text-xs text-text-3">Reason: {reason}</div>}
      <CardActions>
        <button
          className="flex-1 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-[var(--shadow-1)] disabled:opacity-50"
          onClick={() => onApply('accept')}
          disabled={isApplying}
        >
          {isApplying ? 'Applying...' : 'Apply Changes'}
        </button>
        <button
          className="flex-1 rounded-md border border-stroke/30 bg-surface-solid px-4 py-2.5 text-xs font-semibold text-text-1 hover:bg-surface-hover/[0.08] transition-colors disabled:opacity-50"
          onClick={() => onApply('acceptForSession')}
          disabled={isApplying}
        >
          Allow for Session
        </button>
        <button
          className="rounded-md border border-stroke/30 bg-surface-solid px-4 py-2.5 text-xs font-semibold text-text-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-colors"
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
    <div className="bg-status-success-muted p-3 border-t border-status-success/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-status-success">
          <div className="h-4 w-4 rounded-full bg-status-success/15 flex items-center justify-center">
            <Check size={12} className="text-status-success" aria-hidden="true" />
          </div>
          <span>Changes applied</span>
        </div>
        {snapshotId && (
          <button
            className="rounded-md bg-surface-solid px-3 py-1.5 text-[10px] font-medium text-text-2 hover:bg-destructive/10 hover:text-destructive transition-colors border border-stroke/20 hover:border-destructive/40 disabled:opacity-50"
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
    // Convert changes to FileDiff format
    const fileDiffs: FileDiff[] = content.changes.map((change) => ({
      path: change.path,
      kind: change.kind as 'add' | 'modify' | 'delete' | 'rename',
      oldPath: change.oldPath,
      hunks: change.diff ? parseDiff(change.diff) : [],
      raw: change.diff,
    }))

    const lineStats = useMemo(() => {
      let additions = 0
      let deletions = 0
      for (const diff of fileDiffs) {
        for (const hunk of diff.hunks) {
          for (const line of hunk.lines) {
            if (line.type === 'add') additions += 1
            if (line.type === 'remove') deletions += 1
          }
        }
      }
      return { additions, deletions }
    }, [fileDiffs])

    const allExpanded = expandedFiles.size === fileDiffs.length && fileDiffs.length > 0

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
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-3">
          {content.changes.length} files changed
        </span>
        {(lineStats.additions > 0 || lineStats.deletions > 0) && (
          <span className="text-[10px] text-text-3">
            {lineStats.additions > 0 ? `+${lineStats.additions}` : ''}
            {lineStats.deletions > 0 ? ` -${lineStats.deletions}` : ''}
          </span>
        )}
        <button
          className="ml-2 rounded-md border border-stroke/30 bg-surface-hover/[0.12] px-2 py-1 text-[10px] font-medium text-text-2 hover:text-text-1 hover:bg-surface-hover/[0.18]"
          onClick={(e) => {
            e.stopPropagation()
            if (allExpanded) {
              setExpandedFiles(new Set())
            } else {
              setExpandedFiles(new Set(fileDiffs.map((_, idx) => idx)))
            }
          }}
        >
          {allExpanded ? 'Collapse changes' : 'Review changes'}
        </button>
        <span className="text-text-3/70 font-normal text-[10px]">
          {formatTimestamp(item.createdAt)}
        </span>
      </div>
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
