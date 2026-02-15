/**
 * CommandExecutionCard - Shows shell command execution with approval UI
 *
 * Refactored to use BaseCard as the foundation component.
 * Handles command approval, output display, and feedback modes.
 *
 * Performance optimization: Wrapped with React.memo and custom comparison function
 * to prevent unnecessary re-renders in message lists.
 */
import { memo, useState, useEffect, useRef, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Copy, Terminal } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { copyTextToClipboard } from '../../../lib/clipboard'
import { isCommandExecutionContent } from '../../../lib/typeGuards'
import { useThreadStore, selectFocusedThread, type ThreadState } from '../../../stores/thread'
import { log } from '../../../lib/logger'
import { truncateOutput, shallowContentEqual } from '../utils'
import { MAX_OUTPUT_LINES } from '../types'
import { ColorizedOutput } from '../messages/ColorizedOutput'
import type { MessageItemProps } from '../types'
import { BaseCard, CardOutput, StatusBadge, type CardStatus } from './BaseCard'
import { formatDuration } from './card-utils'
import { IconButton } from '../../ui/IconButton'
import { useToast } from '../../ui/useToast'

// -----------------------------------------------------------------------------
// Helper Components
// -----------------------------------------------------------------------------

interface ApprovalUIProps {
  proposedExecpolicyAmendment?: { command: string[] } | null
  onApprove: (decision: 'accept' | 'acceptForSession' | 'acceptWithExecpolicyAmendment' | 'decline') => Promise<void>
  onExplain: () => Promise<void>
  onToggleOutput?: () => void
  isExplaining: boolean
  explanation: string
  isApproving: boolean
}

/**
 * Approval UI component - handles the approval workflow
 */
const ApprovalUI = memo(function ApprovalUI({
  proposedExecpolicyAmendment,
  onApprove,
  onExplain,
  onToggleOutput,
  isExplaining,
  explanation,
  isApproving,
}: ApprovalUIProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [approvalMode, setApprovalMode] = useState<'select' | 'explain' | 'feedback'>('select')
  const [feedbackText, setFeedbackText] = useState('')
  const feedbackInputRef = useRef<HTMLInputElement>(null)

  // Get thread store for feedback submission
  const { activeThread, sendMessage } = useThreadStore(
    useShallow((state: ThreadState) => ({
      activeThread: selectFocusedThread(state)?.thread ?? null,
      sendMessage: state.sendMessage,
    }))
  )

  useEffect(() => {
    if (approvalMode !== 'feedback') return
    feedbackInputRef.current?.focus()
  }, [approvalMode])

  // Handle feedback submission
  const handleFeedbackSubmit = async () => {
    if (!activeThread) return
    if (isApproving) return
    try {
      await onApprove('decline')
      if (feedbackText.trim()) {
        await sendMessage(feedbackText.trim())
      }
    } finally {
      setFeedbackText('')
      setApprovalMode('select')
    }
  }

  const isEditableTarget = (target: EventTarget | null): boolean => {
    if (!target) return false
    if (!(target instanceof HTMLElement)) return false
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    return target.isContentEditable
  }

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
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
      if (isApproving) return
      void onApprove('accept')
      return
    }
    if (key === 'a') {
      e.preventDefault()
      if (isApproving) return
      void onApprove('acceptForSession')
      return
    }
    if (key === 'n') {
      e.preventDefault()
      if (isApproving) return
      void onApprove('decline')
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
    if (key === 'o') {
      e.preventDefault()
      onToggleOutput?.()
      return
    }
  }

  return (
    <div
      className="mt-5 pt-3 border-t border-stroke/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Approval options"
    >
      {/* Explanation Mode */}
      {approvalMode === 'explain' && (
        <div className="animate-in fade-in duration-100">
          <div className="mb-3 text-sm font-medium text-status-warning">
            Command Explanation:
          </div>
          {isExplaining ? (
            <div className="text-sm text-text-3 italic">
              Generating explanation...
            </div>
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

      {/* Feedback Mode */}
      {approvalMode === 'feedback' && (
        <div className="animate-in fade-in duration-100">
          <div className="mb-2 text-sm text-text-2">Give the model feedback (Enter to submit):</div>
          <div className="flex gap-2">
            <input
              ref={feedbackInputRef}
              type="text"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFeedbackSubmit()}
              placeholder="Explain why you’re declining or how to fix it…"
              className="flex-1 rounded-md border border-stroke/30 bg-surface-solid px-3 py-2 text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
              autoFocus
              disabled={isApproving}
            />
            <button
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-[var(--shadow-1)]"
              onClick={handleFeedbackSubmit}
              disabled={isApproving}
            >
              {isApproving ? 'Working...' : 'Submit'}
            </button>
          </div>
          <div className="mt-2 text-xs text-text-3">
            Default: Decline and continue without feedback
          </div>
          <button
            className="mt-2 text-xs text-text-3 hover:text-text-1 transition-colors"
            onClick={() => setApprovalMode('select')}
          >
            &larr; Back to options
          </button>
        </div>
      )}

      {/* Selection Mode - main approval options */}
      {approvalMode === 'select' && (
        <>
          {/* Primary Actions */}
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-[var(--shadow-1)]"
              onClick={() => onApprove('accept')}
              disabled={isApproving}
              title="Keyboard: y"
            >
              Yes (y)
            </button>
            <button
              className="flex-1 rounded-md border border-stroke/30 bg-surface-solid px-4 py-2.5 text-xs font-semibold text-text-1 hover:bg-surface-hover/[0.08] transition-colors"
              onClick={() => onApprove('acceptForSession')}
              disabled={isApproving}
              title="Keyboard: a"
            >
              Allow for session (a)
            </button>
            <button
              className="rounded-md border border-stroke/30 bg-surface-solid px-4 py-2.5 text-xs font-semibold text-text-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-colors"
              onClick={() => onApprove('decline')}
              disabled={isApproving}
              title="Keyboard: n"
            >
              No (n)
            </button>
          </div>

          <div className="mt-2 text-[11px] text-text-3">
            Hotkeys: <span className="font-mono">y</span> accept, <span className="font-mono">a</span> allow for session, <span className="font-mono">n</span> decline, <span className="font-mono">o</span> toggle output, <span className="font-mono">x</span> explain, <span className="font-mono">e</span> feedback
          </div>

          {/* Secondary Actions */}
          <div className="mt-2 flex gap-2">
            <button
              className="flex-1 rounded-md border border-stroke/30 bg-surface-solid px-3 py-2 text-[11px] font-medium text-text-2 hover:bg-surface-hover/[0.08] transition-colors"
              onClick={() => {
                setApprovalMode('explain')
                void onExplain()
              }}
              disabled={isApproving}
              title="Keyboard: x"
            >
              Explain (x)
            </button>
            <button
              className="flex-1 rounded-md border border-stroke/30 bg-surface-solid px-3 py-2 text-[11px] font-medium text-text-2 hover:bg-surface-hover/[0.08] transition-colors"
              onClick={() => {
                setApprovalMode('feedback')
              }}
              disabled={isApproving}
              title="Keyboard: e"
            >
              Edit/Feedback (e)
            </button>
          </div>

          {/* Advanced Options Toggle */}
          {proposedExecpolicyAmendment && (
            <button
              className="mt-2 text-[10px] text-text-3 hover:text-text-1 transition-colors"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '\u25BC Hide options' : '\u25B6 More options'}
            </button>
          )}

          {/* Advanced Actions */}
          {showAdvanced && proposedExecpolicyAmendment && (
            <div className="mt-2 flex gap-2 animate-in slide-in-from-top-2 duration-100">
              <button
                className="flex-1 rounded-lg border border-status-success/30 bg-status-success-muted px-3 py-2 text-[11px] font-medium text-status-success hover:bg-status-success-muted/80 transition-colors"
                onClick={() => onApprove('acceptWithExecpolicyAmendment')}
                disabled={isApproving}
              >
                Always Allow (Persistent)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
})

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

/**
 * CommandExecutionCard Component
 *
 * Memoized to prevent re-renders when parent components update but this
 * specific message item hasn't changed.
 */
export const CommandExecutionCard = memo(
  function CommandExecutionCard({ item }: MessageItemProps) {
    // Use selector to avoid infinite re-render loops
    const { activeThread, respondToApproval, sendMessage } = useThreadStore(
      useShallow((state: ThreadState) => ({
        activeThread: selectFocusedThread(state)?.thread ?? null,
        respondToApproval: state.respondToApproval,
        sendMessage: state.sendMessage,
      }))
    )

    const { toast } = useToast()

    const [showFullOutput, setShowFullOutput] = useState(false)
    const [explanation, setExplanation] = useState('')
    const [isExplaining, setIsExplaining] = useState(false)
    const [isApproving, setIsApproving] = useState(false)
    const isApprovingRef = useRef(false)
    const isExplainingRef = useRef(false)
    const outputRef = useRef<HTMLPreElement>(null)

    // Early return validation
    const content = isCommandExecutionContent(item.content) ? item.content : null

    // Auto-scroll output when streaming
    useEffect(() => {
      if (content && content.isRunning && outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight
      }
    }, [content, showFullOutput])

    // Early return after all hooks
    if (!content) {
      log.warn(`Invalid command execution content for item ${item.id}`, 'CommandExecutionCard')
      return null
    }

    // Format command for display
    const commandDisplay = Array.isArray(content.command)
      ? content.command.join(' ')
      : content.command

    // Get output content
    const rawOutput = content.output || content.stdout || ''
    const {
      text: outputContent,
      truncated: isOutputTruncated,
      omittedLines,
    } = showFullOutput
      ? { text: rawOutput, truncated: false, omittedLines: 0 }
      : truncateOutput(rawOutput)

    // Determine card status
    const getCardStatus = (): CardStatus | undefined => {
      if (content.needsApproval) return 'pending'
      if (content.isRunning) return 'running'
      if (content.exitCode !== undefined) {
        return content.exitCode === 0 ? 'completed' : 'failed'
      }
      return undefined
    }

    // Determine status text
    const getStatusText = (): string | undefined => {
      if (content.isRunning) return 'Running...'
      return undefined
    }

    // Handle approval
    const handleApprove = async (
      decision: 'accept' | 'acceptForSession' | 'acceptWithExecpolicyAmendment' | 'decline'
    ) => {
      if (isApprovingRef.current || !activeThread) return
      isApprovingRef.current = true
      setIsApproving(true)
      try {
        await respondToApproval(item.id, decision, {
          execpolicyAmendment: content.proposedExecpolicyAmendment,
        })
      } finally {
        isApprovingRef.current = false
        setIsApproving(false)
      }
    }

    // Handle explain request
    const handleExplain = async () => {
      if (isExplainingRef.current) return
      isExplainingRef.current = true

      const currentThread = useThreadStore.getState().activeThread
      if (!currentThread || !activeThread || currentThread.id !== activeThread.id) {
        log.error('Thread changed before explain, aborting', 'CommandExecutionCard')
        isExplainingRef.current = false
        return
      }

      setIsExplaining(true)
      try {
        const cmd = commandDisplay
        await sendMessage(
          `Please explain what this command does step by step, including any potential risks:\n\`\`\`\n${cmd}\n\`\`\``
        )
        setExplanation('Explanation sent to AI. Check the response above.')
      } catch {
        setExplanation('Unable to generate explanation.')
      } finally {
        isExplainingRef.current = false
        setIsExplaining(false)
      }
    }

    // Build header actions (exit code badge + duration)
    const handleCopyCommand = async () => {
      const ok = await copyTextToClipboard(commandDisplay)
      if (ok) toast.success('Copied command')
      else toast.error('Copy failed')
    }

    const handleCopyOutput = async () => {
      const ok = await copyTextToClipboard(rawOutput)
      if (ok) toast.success('Copied output')
      else toast.error('Copy failed')
    }

    const handleToggleOutput = () => {
      if (!rawOutput) return
      setShowFullOutput((prev) => !prev)
    }

    const handleCopyStderr = async () => {
      const ok = await copyTextToClipboard(content.stderr || '')
      if (ok) toast.success('Copied stderr')
      else toast.error('Copy failed')
    }

    const headerActions: ReactNode = (
      <>
        {content.exitCode !== undefined && (
          <StatusBadge
            status={content.exitCode === 0 ? 'completed' : 'failed'}
            text={`Exit: ${content.exitCode}`}
          />
        )}
        {content.durationMs !== undefined && (
          <span className="text-[10px] text-text-3">
            {formatDuration(content.durationMs)}
          </span>
        )}
        <IconButton
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            void handleCopyCommand()
          }}
          title="Copy command"
          aria-label="Copy command"
        >
          <Copy size={14} />
        </IconButton>
      </>
    )

    return (
      <BaseCard
        icon={<Terminal size={14} />}
        title="Command"
        subtitle={commandDisplay}
        timestamp={item.createdAt}
        status={getCardStatus()}
        statusText={getStatusText()}
        headerActions={headerActions}
        expandable
        defaultExpanded
        iconAnimated={content.isRunning}
        iconActiveBgClass="bg-status-info-muted text-status-info"
      >
        {/* Working directory */}
        <div className="text-[11px] text-text-3 font-mono mb-3">
          <span className="text-text-3/70">cwd:</span> {content.cwd}
        </div>

        {/* Command Actions Tags */}
        {content.commandActions && content.commandActions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {content.commandActions.map((action: string, i: number) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover/[0.12] text-text-3 border border-stroke/20"
                >
                  {action}
                </span>
            ))}
          </div>
        )}

        {/* Output */}
        {(rawOutput || content.isRunning) && (
          <div className="mb-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-text-3">
                  Output
                </div>
                {content.isRunning && (
                  <span className="text-[9px] normal-case text-status-info animate-pulse inline-block mb-1">
                    streaming...
                  </span>
                )}
              </div>
              <IconButton
                size="sm"
                variant="ghost"
                onClick={() => void handleCopyOutput()}
                disabled={!rawOutput}
                title="Copy output"
                aria-label="Copy output"
              >
                <Copy size={14} />
              </IconButton>
            </div>
            <CardOutput
              error={content.exitCode !== undefined && content.exitCode !== 0}
              className={cn(content.isRunning && 'min-h-[2rem]')}
            >
              <pre ref={outputRef} className="m-0 p-0 bg-transparent">
                {outputContent ? (
                  <ColorizedOutput text={outputContent} />
                ) : content.isRunning ? (
                  '...'
                ) : (
                  ''
                )}
              </pre>
            </CardOutput>

            {/* Truncation indicator */}
            {isOutputTruncated && !content.isRunning && (
              <button
                className="mt-1 text-[10px] text-text-3 hover:text-text-1 transition-colors flex items-center gap-1"
                onClick={() => setShowFullOutput(true)}
              >
                <span className="text-status-warning">...</span>+{omittedLines}{' '}
                lines hidden
                <span className="text-text-2 hover:underline">Show all</span>
              </button>
            )}
            {showFullOutput && rawOutput.split('\n').length > MAX_OUTPUT_LINES && (
              <button
                className="mt-1 text-[10px] text-text-2 hover:underline"
                onClick={() => setShowFullOutput(false)}
              >
                Collapse output
              </button>
            )}
          </div>
        )}

        {/* Stderr if different from output */}
        {content.stderr && content.stderr !== content.output && (
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-status-error">
                Stderr
              </div>
              <IconButton
                size="sm"
                variant="ghost"
                onClick={() => void handleCopyStderr()}
                title="Copy stderr"
                aria-label="Copy stderr"
              >
                <Copy size={14} />
              </IconButton>
            </div>
            <CardOutput error maxHeight="max-h-40">
              {content.stderr}
            </CardOutput>
          </div>
        )}

        {/* Reason */}
        {content.reason && (
          <div className="mt-3 text-xs text-text-3">Reason: {content.reason}</div>
        )}

        {/* Approval UI */}
        {content.needsApproval && (
          <ApprovalUI
            proposedExecpolicyAmendment={content.proposedExecpolicyAmendment}
            onApprove={handleApprove}
            onExplain={handleExplain}
            onToggleOutput={handleToggleOutput}
            isExplaining={isExplaining}
            explanation={explanation}
            isApproving={isApproving}
          />
        )}
      </BaseCard>
    )
  },
  // Custom comparison function for React.memo
  (prev, next) => {
    if (prev.item.id !== next.item.id) return false
    if (prev.item.status !== next.item.status) return false
    return shallowContentEqual(prev.item.content, next.item.content)
  }
)
