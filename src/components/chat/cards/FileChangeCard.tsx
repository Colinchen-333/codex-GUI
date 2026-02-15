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
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, FileCode } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { copyTextToClipboard } from '../../../lib/clipboard'
import { classifyRisk, getRiskBadgeStyles, type RiskLevel } from '../../../lib/safety-utils'
import { BaseCard, CardActions } from './BaseCard'
import { DiffView, parseDiff, type FileDiff } from '../../ui/DiffView'
import { formatTimestamp, shallowContentEqual } from '../utils'
import { useFileChangeApproval } from '../../../hooks/useFileChangeApproval'
import { IconButton } from '../../ui/IconButton'
import { useToast } from '../../ui/useToast'
import { useThreadStore, selectFocusedThread, type ThreadState } from '../../../stores/thread'
import type { MessageItemProps, FileChangeContentType } from '../types'

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

interface ApprovalActionsProps {
  reason?: string
  isApplying: boolean
  isDeclining: boolean
  onApply: (decision: 'accept' | 'acceptForSession') => void | Promise<void>
  onDecline: () => void | Promise<void>
  onExplain: () => void | Promise<void>
  isExplaining: boolean
  explanation: string
  onSubmitFeedback: (feedback: string) => void | Promise<void>
  onToggleAllDiffs?: () => void
}

/**
 * Approval action buttons (Apply, Allow for Session, Decline)
 */
const ApprovalActions = memo(function ApprovalActions({
  reason,
  isApplying,
  isDeclining,
  onApply,
  onDecline,
  onExplain,
  isExplaining,
  explanation,
  onSubmitFeedback,
  onToggleAllDiffs,
}: ApprovalActionsProps) {
  const [approvalMode, setApprovalMode] = useState<'select' | 'explain' | 'feedback'>('select')
  const [feedbackText, setFeedbackText] = useState('')
  const feedbackInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (approvalMode !== 'feedback') return
    feedbackInputRef.current?.focus()
  }, [approvalMode])

  const isEditableTarget = (target: EventTarget | null): boolean => {
    if (!target) return false
    if (!(target instanceof HTMLElement)) return false
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    return target.isContentEditable
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isEditableTarget(e.target)) return
    const key = e.key.toLowerCase()

    if (key === 'escape' && approvalMode !== 'select') {
      e.preventDefault()
      setApprovalMode('select')
      return
    }

    if (approvalMode !== 'select') return

    if (key === 'y') {
      e.preventDefault()
      if (isApplying || isDeclining) return
      void onApply('accept')
      return
    }
    if (key === 'a') {
      e.preventDefault()
      if (isApplying || isDeclining) return
      void onApply('acceptForSession')
      return
    }
    if (key === 'n') {
      e.preventDefault()
      if (isApplying || isDeclining) return
      void onDecline()
      return
    }
    if (key === 'x') {
      e.preventDefault()
      setApprovalMode('explain')
      void onExplain()
      return
    }
    if (key === 'e') {
      e.preventDefault()
      setApprovalMode('feedback')
      return
    }
    if (key === 'd') {
      e.preventDefault()
      onToggleAllDiffs?.()
      return
    }
  }

  const handleFeedbackSubmit = async () => {
    if (isApplying || isDeclining) return
    const text = feedbackText.trim()
    try {
      await onDecline()
      if (text) await onSubmitFeedback(text)
    } finally {
      setFeedbackText('')
      setApprovalMode('select')
    }
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="File change approval options"
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
    >
      {reason && <div className="mb-3 text-xs text-text-3">Reason: {reason}</div>}

      {approvalMode === 'explain' && (
        <div className="animate-in fade-in duration-100">
          <div className="mb-3 text-sm font-medium text-status-warning">Change Explanation:</div>
          {isExplaining ? (
            <div className="text-sm text-text-3 italic">Generating explanation...</div>
          ) : (
            <div className="text-sm text-text-3">{explanation}</div>
          )}
          <button
            className="mt-3 text-xs text-text-3 hover:text-text-1 transition-colors"
            onClick={() => setApprovalMode('select')}
          >
            &larr; Back to options
          </button>
        </div>
      )}

      {approvalMode === 'feedback' && (
        <div className="animate-in fade-in duration-100">
          <div className="mb-2 text-sm text-text-2">Give the model feedback (Enter to submit):</div>
          <div className="flex gap-2">
            <input
              ref={feedbackInputRef}
              type="text"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleFeedbackSubmit()}
              placeholder="Explain why you’re declining or what to change…"
              className="flex-1 rounded-md border border-stroke/30 bg-surface-solid px-3 py-2 text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
              autoFocus
              disabled={isApplying || isDeclining}
            />
            <button
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-[var(--shadow-1)]"
              onClick={() => void handleFeedbackSubmit()}
              disabled={isApplying || isDeclining}
            >
              Submit
            </button>
          </div>
          <div className="mt-2 text-xs text-text-3">Default: Decline and continue without feedback</div>
          <button
            className="mt-2 text-xs text-text-3 hover:text-text-1 transition-colors"
            onClick={() => setApprovalMode('select')}
          >
            &larr; Back to options
          </button>
        </div>
      )}

      {approvalMode === 'select' && (
        <>
          <CardActions>
            <button
              className="flex-1 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-[var(--shadow-1)] disabled:opacity-50"
              onClick={() => void onApply('accept')}
              disabled={isApplying || isDeclining}
              title="Keyboard: y"
            >
              {isApplying ? 'Applying...' : 'Apply Changes'} (y)
            </button>
            <button
              className="flex-1 rounded-md border border-stroke/30 bg-surface-solid px-4 py-2.5 text-xs font-semibold text-text-1 hover:bg-surface-hover/[0.08] transition-colors disabled:opacity-50"
              onClick={() => void onApply('acceptForSession')}
              disabled={isApplying || isDeclining}
              title="Keyboard: a"
            >
              Allow for Session (a)
            </button>
            <button
              className="rounded-md border border-stroke/30 bg-surface-solid px-4 py-2.5 text-xs font-semibold text-text-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-colors disabled:opacity-50"
              onClick={() => void onDecline()}
              disabled={isApplying || isDeclining}
              title="Keyboard: n"
            >
              Decline (n)
            </button>
          </CardActions>

          <div className="mt-2 text-[11px] text-text-3">
            Hotkeys: <span className="font-mono">y</span> apply, <span className="font-mono">a</span> allow for session, <span className="font-mono">n</span> decline, <span className="font-mono">d</span> toggle diffs, <span className="font-mono">x</span> explain, <span className="font-mono">e</span> feedback
          </div>

          <div className="mt-2 flex gap-2">
            <button
              className="flex-1 rounded-md border border-stroke/30 bg-surface-solid px-3 py-2 text-[11px] font-medium text-text-2 hover:bg-surface-hover/[0.08] transition-colors"
              onClick={() => {
                setApprovalMode('explain')
                void onExplain()
              }}
              title="Keyboard: x"
              disabled={isApplying || isDeclining}
            >
              Explain (x)
            </button>
            <button
              className="flex-1 rounded-md border border-stroke/30 bg-surface-solid px-3 py-2 text-[11px] font-medium text-text-2 hover:bg-surface-hover/[0.08] transition-colors"
              onClick={() => {
                setApprovalMode('feedback')
              }}
              title="Keyboard: e"
              disabled={isApplying || isDeclining}
            >
              Edit/Feedback (e)
            </button>
          </div>
        </>
      )}
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
    const { toast } = useToast()
    const sendMessage = useThreadStore((state: ThreadState) => state.sendMessage)
    const activeThread = useThreadStore(selectFocusedThread)?.thread ?? null
    const [explanation, setExplanation] = useState('')
    const [isExplaining, setIsExplaining] = useState(false)

    // Use the file change approval hook for all business logic
    const { isApplying, isReverting, isDeclining, handleApplyChanges, handleRevert, handleDecline } =
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

    const patchText = useMemo(() => {
      const parts = content.changes.map((c) => c.diff).filter((d): d is string => Boolean(d?.trim()))
      return parts.join('\n\n')
    }, [content.changes])

    const summaryText = useMemo(() => {
      return content.changes.map((c) => {
        const kind = (c.kind || 'modify').toString().toUpperCase()
        if (c.kind === 'rename' && c.oldPath) {
          return `${kind} ${c.oldPath} -> ${c.path}`
        }
        return `${kind} ${c.path}`
      }).join('\n')
    }, [content.changes])

    const riskSummary = useMemo((): { high: number; medium: number; low: number; overall: RiskLevel } => {
      let high = 0
      let medium = 0
      let low = 0
      for (const change of content.changes) {
        const risk = classifyRisk({ path: change.path, kind: change.kind, diff: change.diff })
        if (risk === 'high') high += 1
        else if (risk === 'medium') medium += 1
        else low += 1
      }
      const overall: RiskLevel = high > 0 ? 'high' : medium > 0 ? 'medium' : 'low'
      return { high, medium, low, overall }
    }, [content.changes])

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

    const toggleAllDiffs = () => {
      if (allExpanded) {
        setExpandedFiles(new Set())
      } else {
        setExpandedFiles(new Set(fileDiffs.map((_, idx) => idx)))
      }
    }

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

    const copy = async (label: string, text: string) => {
      const ok = await copyTextToClipboard(text)
      if (ok) toast.success(`Copied ${label}`)
      else toast.error('Copy failed')
    }

    const handleExplain = async () => {
      if (!activeThread || isExplaining) return
      setIsExplaining(true)
      setExplanation('')
      try {
        const snippet = patchText.length > 5000 ? `${patchText.slice(0, 5000)}\n\n... (truncated)` : patchText
        await sendMessage(
          `Please explain what these proposed changes do, and call out any potential risks.\n\nFiles:\n${summaryText}\n\nDiff:\n\`\`\`diff\n${snippet}\n\`\`\``
        )
        setExplanation('Explanation request sent. Check the response above.')
      } catch {
        setExplanation('Unable to generate explanation.')
      } finally {
        setIsExplaining(false)
      }
    }

    const handleSubmitFeedback = async (feedback: string) => {
      if (!activeThread) return
      await sendMessage(
        `Feedback on the proposed changes:\n\n${feedback}`
      )
    }

    // Build header actions with file stats and timestamp
    const headerActions = (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-3">{content.changes.length} files changed</span>
        {(lineStats.additions > 0 || lineStats.deletions > 0) && (
          <span className="text-[10px] tabular-nums">
            {lineStats.additions > 0 && <span className="text-status-success">+{lineStats.additions}</span>}
            {lineStats.deletions > 0 && (
              <span className={cn(lineStats.additions > 0 && 'ml-1', 'text-status-error')}>
                -{lineStats.deletions}
              </span>
            )}
          </span>
        )}
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium border border-stroke/20',
            getRiskBadgeStyles(riskSummary.overall)
          )}
          title={`Risk: ${riskSummary.overall} (high ${riskSummary.high}, medium ${riskSummary.medium}, low ${riskSummary.low})`}
        >
          {riskSummary.overall === 'high'
            ? `High risk · ${riskSummary.high}`
            : riskSummary.overall === 'medium'
              ? `Medium risk · ${riskSummary.medium}`
              : `Low risk · ${riskSummary.low}`}
        </span>
        <IconButton
          size="sm"
          variant="ghost"
          onClick={() => void copy('summary', summaryText)}
          disabled={!summaryText}
          title="Copy summary"
          aria-label="Copy summary"
        >
          <Copy size={14} />
        </IconButton>
        <IconButton
          size="sm"
          variant="ghost"
          onClick={() => void copy('patch', patchText)}
          disabled={!patchText}
          title="Copy patch"
          aria-label="Copy patch"
        >
          <Copy size={14} />
        </IconButton>
        <button
          className="ml-2 rounded-md border border-stroke/30 bg-surface-hover/[0.12] px-2 py-1 text-[10px] font-medium text-text-2 hover:text-text-1 hover:bg-surface-hover/[0.18]"
          onClick={(e) => {
            e.stopPropagation()
            toggleAllDiffs()
          }}
          title="Keyboard: d (when approval prompt is focused)"
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
        isDeclining={isDeclining}
        onApply={handleApplyChanges}
        onDecline={handleDecline}
        onExplain={handleExplain}
        isExplaining={isExplaining}
        explanation={explanation}
        onSubmitFeedback={handleSubmitFeedback}
        onToggleAllDiffs={toggleAllDiffs}
      />
    ) : undefined

    return (
      <BaseCard
        icon={<FileCode size={14} />}
        title="Proposed Changes"
        status={content.needsApproval ? 'pending' : undefined}
        borderColor={
          content.needsApproval
            ? 'border-l-4 border-l-status-warning border-y-stroke/20 border-r-stroke/20'
            : undefined
        }
        headerActions={headerActions}
        actions={footerActions}
        expandable={false}
        maxWidthClass="max-w-3xl"
        contentPaddingClass="p-0"
      >
        {/* Diff content */}
        <div className="divide-y divide-stroke/10">
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
