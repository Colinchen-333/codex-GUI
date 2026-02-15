import { useState, useMemo, memo, useCallback } from 'react'
import { Check, X, ChevronDown, ChevronRight, ChevronUp, MessageSquarePlus, Plus, GitBranch, Undo2 } from 'lucide-react'
import { List } from 'react-window'
import { cn } from '../../lib/utils'
import { parseDiff, type HunkAction, type DiffHunk, type DiffLine, type FileDiff, type DiffComment, buildHunkPatch, buildFilePatch } from './DiffView.utils'

// Re-export types and utilities for external use
// eslint-disable-next-line react-refresh/only-export-components
export { parseDiff, buildHunkPatch, buildFilePatch, type FileDiff, type DiffHunk, type DiffLine, type HunkAction, type DiffComment }

// Single line height (px)
const DIFF_LINE_HEIGHT = 26

// Virtualization threshold (enable above 100 lines)
const VIRTUALIZATION_THRESHOLD = 100

// Unified mode row custom props (passed via rowProps)
interface UnifiedDiffRowCustomProps {
  lines: DiffLine[]
  hunkIndex: number
  showSigns: boolean
  lineNumberMode: 'dual' | 'single'
}

// Unified mode row full props (includes react-window injected props)
interface UnifiedDiffRowProps extends UnifiedDiffRowCustomProps {
  ariaAttributes: {
    'aria-posinset': number
    'aria-setsize': number
    role: 'listitem'
  }
  index: number
  style: React.CSSProperties
}

// Split mode row custom props
interface SplitDiffRowCustomProps {
  oldLines: DiffLine[]
  newLines: DiffLine[]
  hunkIndex: number
  showSigns: boolean
}

// Split mode row full props
interface SplitDiffRowProps extends SplitDiffRowCustomProps {
  ariaAttributes: {
    'aria-posinset': number
    'aria-setsize': number
    role: 'listitem'
  }
  index: number
  style: React.CSSProperties
}

interface DiffViewProps {
  diff: FileDiff
  collapsed?: boolean
  onToggleCollapse?: () => void
  /** Override container classes */
  containerClassName?: string
  /** Enable per-hunk accept/reject actions */
  enableHunkActions?: boolean
  /** Callback when a hunk is accepted/rejected */
  onHunkAction?: (hunkIndex: number, action: HunkAction) => void
  /** Current state of each hunk */
  hunkStates?: HunkAction[]
  /** Initial view mode override */
  initialViewMode?: 'unified' | 'split'
  /** Show view mode toggle buttons */
  showViewToggle?: boolean
  /** Show file header */
  showHeader?: boolean
  /** Show hunk header lines */
  showHunkHeader?: boolean
  /** Show + / - sign column */
  showSigns?: boolean
  /** Line number layout */
  lineNumberMode?: 'dual' | 'single'
  /** Enable inline comment composer */
  enableInlineComments?: boolean
  /** Callback when a comment is submitted */
  onComment?: (lineNumber: number, content: string, hunkIndex: number, lineIndex: number) => void
  /** Existing comments to display */
  comments?: DiffComment[]
  /** Enable chunk-level stage/revert buttons */
  enableChunkActions?: boolean
  /** Callback to stage a single hunk */
  onStageHunk?: (hunkIndex: number, patch: string) => void
  /** Callback to revert a single hunk */
  onRevertHunk?: (hunkIndex: number, patch: string) => void
  /** Callback to stage the entire file */
  onStageFile?: (patch: string) => void
  /** Callback to revert the entire file */
  onRevertFile?: (patch: string) => void
}

export function DiffView({
  diff,
  collapsed = false,
  onToggleCollapse,
  containerClassName,
  enableHunkActions = false,
  onHunkAction,
  hunkStates = [],
  initialViewMode,
  showViewToggle = true,
  showHeader = true,
  showHunkHeader = true,
  showSigns = true,
  lineNumberMode = 'dual',
  enableInlineComments = false,
  onComment,
  comments = [],
  enableChunkActions = false,
  onStageHunk,
  onRevertHunk,
  onStageFile,
  onRevertFile,
}: DiffViewProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>(initialViewMode ?? 'unified')
  const [commentTarget, setCommentTarget] = useState<{ hunkIndex: number; lineIndex: number } | null>(null)
  const [commentText, setCommentText] = useState('')
  const [confirmRevertFile, setConfirmRevertFile] = useState(false)
  const [confirmRevertHunk, setConfirmRevertHunk] = useState<number | null>(null)

  const kindIcon = {
    add: '+',
    modify: '~',
    delete: '-',
    rename: '→',
  }

  const kindColor = {
    add: 'text-status-success',
    modify: 'text-status-warning',
    delete: 'text-status-error',
    rename: 'text-primary',
  }

  const totalLines = useMemo(() =>
    diff.hunks.reduce((sum, hunk) => sum + hunk.lines.length, 0),
    [diff.hunks]
  )

  const handleStageFile = useCallback(() => {
    if (!onStageFile || diff.hunks.length === 0) return
    const patch = buildFilePatch(diff.path, diff.hunks, diff.oldPath)
    onStageFile(patch)
  }, [onStageFile, diff])

  const handleRevertFile = useCallback(() => {
    if (!onRevertFile || diff.hunks.length === 0) return
    if (!confirmRevertFile) {
      setConfirmRevertFile(true)
      return
    }
    const patch = buildFilePatch(diff.path, diff.hunks, diff.oldPath)
    onRevertFile(patch)
    setConfirmRevertFile(false)
  }, [onRevertFile, diff, confirmRevertFile])

  const handleCommentSubmit = useCallback(() => {
    if (!onComment || !commentTarget || !commentText.trim()) return
    const line = diff.hunks[commentTarget.hunkIndex]?.lines[commentTarget.lineIndex]
    const lineNumber = line?.newLineNumber ?? line?.oldLineNumber ?? 0
    onComment(lineNumber, commentText.trim(), commentTarget.hunkIndex, commentTarget.lineIndex)
    setCommentTarget(null)
    setCommentText('')
  }, [onComment, commentTarget, commentText, diff.hunks])

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-stroke/20 bg-surface-solid',
        containerClassName
      )}
    >
      {/* Header */}
      {showHeader && (
        <div
          className="flex items-center justify-between bg-surface-hover/[0.06] px-3 py-2 cursor-pointer hover:bg-surface-hover/[0.12]"
          onClick={onToggleCollapse}
          role={onToggleCollapse ? 'button' : undefined}
          tabIndex={onToggleCollapse ? 0 : undefined}
          onKeyDown={
            onToggleCollapse
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onToggleCollapse()
                  }
                }
              : undefined
          }
          aria-expanded={onToggleCollapse ? !collapsed : undefined}
          aria-label={onToggleCollapse ? `Toggle diff: ${diff.path}` : undefined}
        >
          <div className="flex items-center gap-2">
            <span className={cn('font-mono text-sm', kindColor[diff.kind])}>
              {kindIcon[diff.kind]}
            </span>
            <span className="font-mono text-sm text-text-1">{diff.path}</span>
            {diff.oldPath && diff.kind === 'rename' && (
              <span className="text-text-3 text-sm">
                (from {diff.oldPath})
              </span>
            )}
            {totalLines > 500 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded ml-2 border border-status-warning/30 bg-status-warning-muted text-status-warning">
                Large
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Chunk actions: file-level stage/revert */}
            {enableChunkActions && !collapsed && (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {onStageFile && (
                  <button
                    className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-surface-hover/[0.12] text-text-2 hover:bg-status-success-muted hover:text-status-success transition-colors"
                    title="Stage file"
                    onClick={handleStageFile}
                  >
                    <GitBranch size={12} />
                    Stage File
                  </button>
                )}
                {onRevertFile && (
                  <button
                    className={cn(
                      'flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors',
                      confirmRevertFile
                        ? 'bg-status-error-muted text-status-error'
                        : 'bg-surface-hover/[0.12] text-text-2 hover:bg-status-error-muted hover:text-status-error'
                    )}
                    title={confirmRevertFile ? 'Click again to confirm revert' : 'Revert file'}
                    onClick={handleRevertFile}
                    onBlur={() => setConfirmRevertFile(false)}
                  >
                    <Undo2 size={12} />
                    {confirmRevertFile ? 'Confirm?' : 'Revert File'}
                  </button>
                )}
              </div>
            )}
            {showViewToggle && (
              <>
                <button
                  className={cn(
                    'px-2 py-0.5 text-xs rounded',
                    viewMode === 'unified' ? 'bg-primary text-primary-foreground' : 'bg-surface-hover/[0.12] text-text-2'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setViewMode('unified')
                  }}
                >
                  Unified
                </button>
                <button
                  className={cn(
                    'px-2 py-0.5 text-xs rounded',
                    viewMode === 'split' ? 'bg-primary text-primary-foreground' : 'bg-surface-hover/[0.12] text-text-2'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setViewMode('split')
                  }}
                >
                  Split
                </button>
              </>
            )}
            <span className="text-text-3" aria-hidden="true">
              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      {!collapsed && (
        <div className="overflow-x-auto">
          {diff.hunks.length === 0 && diff.raw ? (
            <pre className="p-3 text-xs text-text-3 whitespace-pre-wrap font-mono">
              {diff.raw}
            </pre>
          ) : viewMode === 'unified' ? (
            <UnifiedDiff
              hunks={diff.hunks}
              enableHunkActions={enableHunkActions}
              onHunkAction={onHunkAction}
              hunkStates={hunkStates}
              showHunkHeader={showHunkHeader}
              showSigns={showSigns}
              lineNumberMode={lineNumberMode}
              inlineComments={{
                enabled: enableInlineComments && viewMode === 'unified',
                target: enableInlineComments && viewMode === 'unified' ? commentTarget : null,
                setTarget: setCommentTarget,
                text: enableInlineComments && viewMode === 'unified' ? commentText : '',
                setText: setCommentText,
                onSubmit: handleCommentSubmit,
              }}
              comments={comments}
              enableChunkActions={enableChunkActions}
              filePath={diff.path}
              oldPath={diff.oldPath}
              onStageHunk={onStageHunk}
              onRevertHunk={onRevertHunk}
              confirmRevertHunk={confirmRevertHunk}
              setConfirmRevertHunk={setConfirmRevertHunk}
            />
          ) : (
            <SplitDiff
              hunks={diff.hunks}
              enableHunkActions={enableHunkActions}
              onHunkAction={onHunkAction}
              hunkStates={hunkStates}
              showHunkHeader={showHunkHeader}
              showSigns={showSigns}
              enableChunkActions={enableChunkActions}
              filePath={diff.path}
              oldPath={diff.oldPath}
              onStageHunk={onStageHunk}
              onRevertHunk={onRevertHunk}
              confirmRevertHunk={confirmRevertHunk}
              setConfirmRevertHunk={setConfirmRevertHunk}
            />
          )}
        </div>
      )}
    </div>
  )
}

interface DiffComponentProps {
  hunks: DiffHunk[]
  enableHunkActions?: boolean
  onHunkAction?: (hunkIndex: number, action: HunkAction) => void
  hunkStates?: HunkAction[]
  inlineComments?: InlineCommentState
  comments?: DiffComment[]
  showHunkHeader?: boolean
  showSigns?: boolean
  lineNumberMode?: 'dual' | 'single'
  enableChunkActions?: boolean
  filePath?: string
  oldPath?: string
  onStageHunk?: (hunkIndex: number, patch: string) => void
  onRevertHunk?: (hunkIndex: number, patch: string) => void
  confirmRevertHunk?: number | null
  setConfirmRevertHunk?: (hunkIndex: number | null) => void
}

interface InlineCommentState {
  enabled: boolean
  target: { hunkIndex: number; lineIndex: number } | null
  setTarget: (target: { hunkIndex: number; lineIndex: number } | null) => void
  text: string
  setText: (value: string) => void
  onSubmit: () => void
}

interface HunkActionsProps {
  hunkIndex: number
  hunkState: HunkAction
  enableHunkActions?: boolean
  onHunkAction?: (hunkIndex: number, action: HunkAction) => void
}

function HunkActions({ hunkIndex, hunkState, enableHunkActions, onHunkAction }: HunkActionsProps) {
  if (!enableHunkActions || !onHunkAction) return null

  return (
    <div className="flex items-center gap-1">
      {hunkState !== 'accept' && (
        <button
          onClick={() => onHunkAction(hunkIndex, 'accept')}
          className="p-1 rounded hover:bg-status-success-muted text-status-success transition-colors"
          title="Accept this change"
        >
          <Check size={14} />
        </button>
      )}
      {hunkState !== 'reject' && (
        <button
          onClick={() => onHunkAction(hunkIndex, 'reject')}
          className="p-1 rounded hover:bg-status-error-muted text-status-error transition-colors"
          title="Reject this change"
        >
          <X size={14} />
        </button>
      )}
      {hunkState !== 'pending' && (
        <button
          onClick={() => onHunkAction(hunkIndex, 'pending')}
          className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover/[0.12] text-text-2 hover:bg-surface-hover/[0.18]"
          title="Reset"
        >
          Reset
        </button>
      )}
    </div>
  )
}

interface ChunkStageActionsProps {
  hunkIndex: number
  hunk: DiffHunk
  filePath: string
  oldPath?: string
  onStageHunk?: (hunkIndex: number, patch: string) => void
  onRevertHunk?: (hunkIndex: number, patch: string) => void
  confirmRevertHunk?: number | null
  setConfirmRevertHunk?: (hunkIndex: number | null) => void
}

function ChunkStageActions({
  hunkIndex,
  hunk,
  filePath,
  oldPath,
  onStageHunk,
  onRevertHunk,
  confirmRevertHunk,
  setConfirmRevertHunk,
}: ChunkStageActionsProps) {
  const isConfirming = confirmRevertHunk === hunkIndex

  return (
    <div className="flex items-center gap-1">
      {onStageHunk && (
        <button
          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-surface-hover/[0.12] text-text-2 hover:bg-status-success-muted hover:text-status-success transition-colors"
          title="Stage this hunk"
          onClick={() => {
            const patch = buildHunkPatch(filePath, hunk, oldPath)
            onStageHunk(hunkIndex, patch)
          }}
        >
          <GitBranch size={10} />
          Stage
        </button>
      )}
      {onRevertHunk && (
        <button
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded transition-colors',
            isConfirming
              ? 'bg-status-error-muted text-status-error'
              : 'bg-surface-hover/[0.12] text-text-2 hover:bg-status-error-muted hover:text-status-error'
          )}
          title={isConfirming ? 'Click again to confirm' : 'Revert this hunk'}
          onClick={() => {
            if (!isConfirming) {
              setConfirmRevertHunk?.(hunkIndex)
              return
            }
            const patch = buildHunkPatch(filePath, hunk, oldPath)
            onRevertHunk(hunkIndex, patch)
            setConfirmRevertHunk?.(null)
          }}
          onBlur={() => {
            if (isConfirming) setConfirmRevertHunk?.(null)
          }}
        >
          <Undo2 size={10} />
          {isConfirming ? 'Confirm?' : 'Revert'}
        </button>
      )}
    </div>
  )
}

/** Renders inline comment display for a given line */
function InlineCommentDisplay({ comments, hunkIndex, lineIndex }: {
  comments: DiffComment[]
  hunkIndex: number
  lineIndex: number
}) {
  const lineComments = comments.filter(
    (c) => c.hunkIndex === hunkIndex && c.lineIndex === lineIndex
  )
  if (lineComments.length === 0) return null

  return (
    <>
      {lineComments.map((comment) => (
        <div
          key={comment.id}
          className="flex bg-surface-hover/[0.04] border-l-2 border-primary/40"
        >
          <div className="flex-1 px-4 py-2">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquarePlus size={12} className="text-primary/70" />
              {comment.author && (
                <span className="text-xs font-semibold text-text-2">{comment.author}</span>
              )}
              <span className="text-[10px] text-text-3">
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-text-1 whitespace-pre-wrap font-sans">{comment.content}</p>
          </div>
        </div>
      ))}
    </>
  )
}

// Virtualized row component (Unified mode)
const VirtualizedDiffLine = memo(function VirtualizedDiffLine({
  index,
  style,
  lines,
  showSigns,
  lineNumberMode,
}: UnifiedDiffRowProps) {
  const line = lines[index]
  const oldNumberClass =
    line.type === 'remove' ? 'text-status-error' : 'text-text-3/70'
  const newNumberClass =
    line.type === 'add' ? 'text-status-success' : 'text-text-3/70'
  const singleNumber =
    line.type === 'remove' ? line.oldLineNumber : line.newLineNumber ?? line.oldLineNumber
  const singleNumberClass =
    line.type === 'remove'
      ? 'text-status-error'
      : line.type === 'add'
        ? 'text-status-success'
        : 'text-text-3/70'
  const singleNumberColumnClass = cn(
    'w-9 flex-shrink-0 text-right pr-3 select-none',
    singleNumberClass
  )

  const contentClass =
    line.type === 'add'
      ? 'text-status-success'
      : line.type === 'remove'
        ? 'text-status-error'
        : 'text-text-1'

  return (
    <div
      style={style}
      className={cn(
        'flex border-l-2 min-h-[26px] leading-[26px]',
        line.type === 'add' && 'bg-status-success-muted',
        line.type === 'remove' && 'bg-status-error-muted',
        line.type === 'add' && 'border-status-success/70',
        line.type === 'remove' && 'border-status-error/70',
        line.type === 'context' && 'border-transparent'
      )}
    >
      {/* Line numbers */}
      {lineNumberMode === 'dual' ? (
        <>
          <div className={cn('w-9 flex-shrink-0 text-right pr-2 select-none border-r border-stroke/20', oldNumberClass)}>
            {line.oldLineNumber || ''}
          </div>
          <div className={cn('w-9 flex-shrink-0 text-right pr-2 select-none border-r border-stroke/20', newNumberClass)}>
            {line.newLineNumber || ''}
          </div>
        </>
      ) : (
        <div className={singleNumberColumnClass}>
          {singleNumber || ''}
        </div>
      )}

      {/* Sign */}
      {showSigns && (
        <div
          className={cn(
            'w-6 flex-shrink-0 text-center select-none',
            line.type === 'add' && 'text-status-success',
            line.type === 'remove' && 'text-status-error'
          )}
        >
          {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
        </div>
      )}

      {/* Content */}
      <div className={cn('flex-1 px-2 whitespace-pre overflow-x-auto', contentClass)}>
        {line.content}
      </div>
    </div>
  )
})

// Virtualized row component (Split mode)
const VirtualizedSplitLine = memo(function VirtualizedSplitLine({
  index,
  style,
  oldLines,
  newLines,
  showSigns,
}: SplitDiffRowProps) {
  const oldLine = oldLines[index]
  const newLine = newLines[index]
  const oldNumberClass =
    oldLine?.type === 'remove' ? 'text-status-error' : 'text-text-3/70'
  const newNumberClass =
    newLine?.type === 'add' ? 'text-status-success' : 'text-text-3/70'
  const oldContentClass =
    oldLine?.type === 'remove' ? 'text-status-error' : 'text-text-1'
  const newContentClass =
    newLine?.type === 'add' ? 'text-status-success' : 'text-text-1'

  return (
    <div style={style} className="grid grid-cols-2 min-h-[26px] leading-[26px]">
      {/* Left (old) */}
      <div
        className={cn(
          'flex border-r border-stroke/20',
          oldLine?.type === 'remove' && 'bg-status-error-muted'
        )}
      >
        <div className={cn('w-9 flex-shrink-0 text-right pr-2 select-none border-r border-stroke/20', oldNumberClass)}>
          {oldLine?.oldLineNumber || ''}
        </div>
        {showSigns && (
          <div
            className={cn(
              'w-6 flex-shrink-0 text-center select-none',
              oldLine?.type === 'remove' && 'text-status-error'
            )}
          >
            {oldLine?.type === 'remove' ? '-' : ' '}
          </div>
        )}
        <div className={cn('flex-1 px-2 whitespace-pre overflow-x-auto', oldContentClass)}>
          {oldLine?.content || ''}
        </div>
      </div>

      {/* Right (new) */}
      <div
        className={cn(
          'flex',
          newLine?.type === 'add' && 'bg-status-success-muted'
        )}
      >
        <div className={cn('w-9 flex-shrink-0 text-right pr-2 select-none border-r border-stroke/20', newNumberClass)}>
          {newLine?.newLineNumber || ''}
        </div>
        {showSigns && (
          <div
            className={cn(
              'w-6 flex-shrink-0 text-center select-none',
              newLine?.type === 'add' && 'text-status-success'
            )}
          >
            {newLine?.type === 'add' ? '+' : ' '}
          </div>
        )}
        <div className={cn('flex-1 px-2 whitespace-pre overflow-x-auto', newContentClass)}>
          {newLine?.content || ''}
        </div>
      </div>
    </div>
  )
})

function getGapCount(hunks: DiffHunk[], hunkIndex: number) {
  const current = hunks[hunkIndex]
  const next = hunks[hunkIndex + 1]
  if (!current || !next) return 0
  const currentEnd = current.oldStart + current.oldLines
  const gap = next.oldStart - currentEnd
  return gap > 0 ? gap : 0
}

function GapLine({
  count,
  showSigns,
  lineNumberMode,
}: {
  count: number
  showSigns: boolean
  lineNumberMode: 'dual' | 'single'
}) {
  return (
    <div className="flex items-center bg-surface-hover/[0.06] text-text-2 text-xs border-y border-stroke/20 border-l-2 border-transparent py-0.5">
      <div className={cn(
        'w-9 flex-shrink-0 flex items-center justify-end pr-3 text-text-3/70 select-none',
        lineNumberMode === 'dual' && 'border-r border-stroke/20'
      )}>
        <ChevronUp size={12} />
      </div>
      {lineNumberMode === 'dual' && <div className="w-9 flex-shrink-0 border-r border-stroke/20" />}
      {showSigns && <div className="w-6 flex-shrink-0" />}
      <div className="flex-1 px-2 text-text-2/80">{count} unmodified lines</div>
    </div>
  )
}

function SplitGapLine({ count }: { count: number }) {
  return (
    <div className="col-span-2 bg-surface-hover/[0.06] text-text-3 text-xs border-y border-stroke/20 px-3 py-1">
      {count} unmodified lines
    </div>
  )
}

type InlineSegment = {
  text: string
  type: 'equal' | 'change'
}

function tokenizeInline(text: string) {
  return text.split(/(\s+|[,.()[\]{}<>:+\-/*=]+)/).filter((token) => token.length > 0)
}

function buildInlineSegments(oldText: string, newText: string) {
  const oldTokens = tokenizeInline(oldText)
  const newTokens = tokenizeInline(newText)

  const rows = oldTokens.length + 1
  const cols = newTokens.length + 1
  const dp: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0))

  for (let i = rows - 2; i >= 0; i -= 1) {
    for (let j = cols - 2; j >= 0; j -= 1) {
      if (oldTokens[i] === newTokens[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
  }

  const oldSegments: InlineSegment[] = []
  const newSegments: InlineSegment[] = []

  const pushSegment = (segments: InlineSegment[], text: string, type: InlineSegment['type']) => {
    if (!text) return
    const last = segments[segments.length - 1]
    if (last && last.type === type) {
      last.text += text
    } else {
      segments.push({ text, type })
    }
  }

  let i = 0
  let j = 0
  while (i < oldTokens.length && j < newTokens.length) {
    if (oldTokens[i] === newTokens[j]) {
      pushSegment(oldSegments, oldTokens[i], 'equal')
      pushSegment(newSegments, newTokens[j], 'equal')
      i += 1
      j += 1
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      pushSegment(oldSegments, oldTokens[i], 'change')
      i += 1
    } else {
      pushSegment(newSegments, newTokens[j], 'change')
      j += 1
    }
  }
  while (i < oldTokens.length) {
    pushSegment(oldSegments, oldTokens[i], 'change')
    i += 1
  }
  while (j < newTokens.length) {
    pushSegment(newSegments, newTokens[j], 'change')
    j += 1
  }

  return { oldSegments, newSegments }
}

function renderInlineSegments(segments: InlineSegment[], variant: 'add' | 'remove') {
  return segments.map((segment, idx) => (
    <span
      key={`${variant}-${idx}`}
      className={cn(
        segment.type === 'change' &&
          (variant === 'add'
            ? 'bg-status-success/15 text-status-success rounded-sm px-0.5'
            : 'bg-status-error/15 text-status-error rounded-sm px-0.5')
      )}
    >
      {segment.text}
    </span>
  ))
}

function UnifiedDiff({
  hunks,
  enableHunkActions,
  onHunkAction,
  hunkStates = [],
  inlineComments,
  comments = [],
  showHunkHeader = true,
  showSigns = true,
  lineNumberMode = 'dual',
  enableChunkActions = false,
  filePath = '',
  oldPath,
  onStageHunk,
  onRevertHunk,
  confirmRevertHunk,
  setConfirmRevertHunk,
}: DiffComponentProps) {
  // Calculate total lines
  const totalLines = useMemo(() =>
    hunks.reduce((sum, hunk) => sum + hunk.lines.length, 0),
    [hunks]
  )

  // Decide whether to virtualize
  const useVirtualization = totalLines > VIRTUALIZATION_THRESHOLD
  const inlineCommentsEnabled = inlineComments?.enabled ?? false

  // Small diff: keep original rendering
  if (!useVirtualization) {
    return (
      <div className="font-mono text-xs">
        {hunks.map((hunk, hunkIndex) => {
          const hunkState = hunkStates[hunkIndex] || 'pending'
          const gapCount = getGapCount(hunks, hunkIndex)
          const inlineMap = new Map<number, InlineSegment[]>()
          for (let i = 0; i < hunk.lines.length - 1; i += 1) {
            const current = hunk.lines[i]
            const next = hunk.lines[i + 1]
            if (current.type === 'remove' && next.type === 'add') {
              const { oldSegments, newSegments } = buildInlineSegments(current.content, next.content)
              inlineMap.set(i, oldSegments)
              inlineMap.set(i + 1, newSegments)
            }
          }
          return (
            <div
              key={hunkIndex}
              className={cn(
                hunkState === 'accept' && 'opacity-60',
                hunkState === 'reject' && 'opacity-40 line-through'
              )}
            >
              {/* Hunk header */}
              {showHunkHeader && (
                <div className="bg-surface-hover/[0.06] text-text-2 px-3 py-1 border-y border-stroke/20 flex items-center justify-between">
                  <span>@@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@</span>
                  <div className="flex items-center gap-2">
                    {enableChunkActions && filePath && (
                      <ChunkStageActions
                        hunkIndex={hunkIndex}
                        hunk={hunk}
                        filePath={filePath}
                        oldPath={oldPath}
                        onStageHunk={onStageHunk}
                        onRevertHunk={onRevertHunk}
                        confirmRevertHunk={confirmRevertHunk}
                        setConfirmRevertHunk={setConfirmRevertHunk}
                      />
                    )}
                    <HunkActions
                      hunkIndex={hunkIndex}
                      hunkState={hunkState}
                      enableHunkActions={enableHunkActions}
                      onHunkAction={onHunkAction}
                    />
                  </div>
                </div>
              )}
              {/* Lines */}
              {hunk.lines.map((line, lineIndex) => {
                const inlineSegments = inlineMap.get(lineIndex)
                const oldNumberClass =
                  line.type === 'remove' ? 'text-status-error' : 'text-text-3/70'
                const newNumberClass =
                  line.type === 'add' ? 'text-status-success' : 'text-text-3/70'
                const singleNumber =
                  line.type === 'remove' ? line.oldLineNumber : line.newLineNumber ?? line.oldLineNumber
                const singleNumberClass =
                  line.type === 'remove'
                    ? 'text-status-error'
                    : line.type === 'add'
                      ? 'text-status-success'
                      : 'text-text-3/70'
                const singleNumberColumnClass = cn(
                  'w-9 flex-shrink-0 text-right pr-3 select-none',
                  singleNumberClass
                )
                const isCommentTarget =
                  inlineCommentsEnabled &&
                  inlineComments?.target?.hunkIndex === hunkIndex &&
                  inlineComments?.target?.lineIndex === lineIndex
                const contentClass =
                  line.type === 'add'
                    ? 'text-status-success'
                    : line.type === 'remove'
                      ? 'text-status-error'
                      : 'text-text-1'

                return (
                  <div key={lineIndex}>
                    <div
                      className={cn(
                        'group/line flex border-l-2 min-h-[26px] leading-[26px]',
                        line.type === 'add' && 'bg-status-success-muted',
                        line.type === 'remove' && 'bg-status-error-muted',
                        line.type === 'add' && 'border-status-success/70',
                        line.type === 'remove' && 'border-status-error/70',
                        line.type === 'context' && 'border-transparent',
                        isCommentTarget && 'ring-1 ring-inset ring-stroke/40'
                      )}
                    >
                      {/* Comment add button (hover on line number area) */}
                      {inlineCommentsEnabled && (
                        <div
                          className="w-5 flex-shrink-0 flex items-center justify-center cursor-pointer"
                          onClick={() => {
                            if (!inlineComments) return
                            const isSame =
                              inlineComments.target?.hunkIndex === hunkIndex &&
                              inlineComments.target?.lineIndex === lineIndex
                            inlineComments.setTarget(isSame ? null : { hunkIndex, lineIndex })
                            inlineComments.setText('')
                          }}
                        >
                          <Plus
                            size={12}
                            className="text-primary opacity-0 group-hover/line:opacity-70 hover:!opacity-100 transition-opacity"
                          />
                        </div>
                      )}

                      {/* Line numbers */}
                      {lineNumberMode === 'dual' ? (
                        <>
                          <div className={cn('w-9 flex-shrink-0 text-right pr-2 select-none border-r border-stroke/20', oldNumberClass)}>
                            {line.oldLineNumber || ''}
                          </div>
                          <div className={cn('w-9 flex-shrink-0 text-right pr-2 select-none border-r border-stroke/20', newNumberClass)}>
                            {line.newLineNumber || ''}
                          </div>
                        </>
                      ) : (
                        <div className={singleNumberColumnClass}>
                          {singleNumber || ''}
                        </div>
                      )}
                      {/* Sign */}
                      {showSigns && (
                        <div
                          className={cn(
                            'w-6 flex-shrink-0 text-center select-none',
                            line.type === 'add' && 'text-status-success',
                            line.type === 'remove' && 'text-status-error'
                          )}
                        >
                          {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                        </div>
                      )}
                      {/* Content */}
                      <div className={cn('flex-1 px-2 whitespace-pre overflow-x-auto', contentClass)}>
                        {inlineSegments
                          ? renderInlineSegments(inlineSegments, line.type === 'add' ? 'add' : 'remove')
                          : line.content}
                      </div>
                    </div>

                    {/* Existing comments for this line */}
                    <InlineCommentDisplay
                      comments={comments}
                      hunkIndex={hunkIndex}
                      lineIndex={lineIndex}
                    />

                    {/* Comment composer */}
                    {isCommentTarget && inlineCommentsEnabled && inlineComments && (
                      <div className="flex bg-transparent border-l-2 border-transparent">
                        {inlineCommentsEnabled && <div className="w-5 flex-shrink-0" />}
                        <div className={cn('w-9 flex-shrink-0', lineNumberMode === 'dual' && 'border-r border-stroke/20')} />
                        {lineNumberMode === 'dual' && (
                          <div className="w-9 flex-shrink-0 border-r border-stroke/20" />
                        )}
                        {showSigns && <div className="w-6 flex-shrink-0" />}
                        <div className="flex-1 px-2 pb-2.5 pt-1.5">
                          <div
                            className="w-full max-w-[320px] rounded-2xl border border-stroke/20 bg-surface-solid shadow-[var(--shadow-2)]"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="p-3">
                              <textarea
                                className="w-full min-h-[64px] resize-none bg-transparent text-sm text-text-1 focus:outline-none placeholder:text-text-3/70 font-sans"
                                placeholder="Add a comment..."
                                value={inlineComments.text}
                                onChange={(event) => inlineComments.setText(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Escape') {
                                    inlineComments.setTarget(null)
                                    inlineComments.setText('')
                                  }
                                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                                    inlineComments.onSubmit()
                                  }
                                }}
                                autoFocus
                              />
                            </div>
                            <div className="flex items-center justify-end gap-2 border-t border-stroke/20 px-3 py-2">
                              <button
                                className="text-sm text-text-3 hover:text-text-1"
                                onClick={() => {
                                  inlineComments.setTarget(null)
                                  inlineComments.setText('')
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                className={cn(
                                  'rounded-full px-3 py-1 text-sm font-semibold transition-colors',
                                  inlineComments.text.trim()
                                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                    : 'bg-surface-hover/[0.2] text-text-2 cursor-not-allowed'
                                )}
                                disabled={!inlineComments.text.trim()}
                                onClick={() => inlineComments.onSubmit()}
                              >
                                Comment
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {gapCount > 0 && (
                <GapLine count={gapCount} showSigns={showSigns} lineNumberMode={lineNumberMode} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Large diff: use virtualization
  return (
    <div className="font-mono text-xs">
      {hunks.map((hunk, hunkIndex) => {
        const hunkState = hunkStates[hunkIndex] || 'pending'
        const gapCount = getGapCount(hunks, hunkIndex)

        return (
          <div
            key={hunkIndex}
            className={cn(
              hunkState === 'accept' && 'opacity-60',
              hunkState === 'reject' && 'opacity-40 line-through'
            )}
          >
            {/* Hunk header */}
            {showHunkHeader && (
              <div className="bg-surface-hover/[0.06] text-text-2 px-3 py-1 border-y border-stroke/20 flex items-center justify-between">
                <span>@@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@</span>
                <div className="flex items-center gap-2">
                  {enableChunkActions && filePath && (
                    <ChunkStageActions
                      hunkIndex={hunkIndex}
                      hunk={hunk}
                      filePath={filePath}
                      oldPath={oldPath}
                      onStageHunk={onStageHunk}
                      onRevertHunk={onRevertHunk}
                      confirmRevertHunk={confirmRevertHunk}
                      setConfirmRevertHunk={setConfirmRevertHunk}
                    />
                  )}
                  <HunkActions
                    hunkIndex={hunkIndex}
                    hunkState={hunkState}
                    enableHunkActions={enableHunkActions}
                    onHunkAction={onHunkAction}
                  />
                </div>
              </div>
            )}

            {/* Virtualized line list */}
            <List<UnifiedDiffRowCustomProps>
              defaultHeight={Math.min(hunk.lines.length * DIFF_LINE_HEIGHT, 600)}
              rowCount={hunk.lines.length}
              rowHeight={DIFF_LINE_HEIGHT}
              rowComponent={VirtualizedDiffLine as (props: UnifiedDiffRowProps) => React.ReactElement}
              rowProps={{ lines: hunk.lines, hunkIndex, showSigns, lineNumberMode }}
              overscanCount={10}
            />
            {gapCount > 0 && (
              <GapLine count={gapCount} showSigns={showSigns} lineNumberMode={lineNumberMode} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SplitDiff({
  hunks,
  enableHunkActions,
  onHunkAction,
  hunkStates = [],
  showHunkHeader = true,
  showSigns = true,
  enableChunkActions = false,
  filePath = '',
  oldPath,
  onStageHunk,
  onRevertHunk,
  confirmRevertHunk,
  setConfirmRevertHunk,
}: DiffComponentProps) {
  // Calculate total lines (max of either side)
  const totalLines = useMemo(() =>
    hunks.reduce((sum, hunk) => {
      const oldLines = hunk.lines.filter((l) => l.type !== 'add').length
      const newLines = hunk.lines.filter((l) => l.type !== 'remove').length
      return sum + Math.max(oldLines, newLines)
    }, 0),
    [hunks]
  )

  // Decide whether to virtualize
  const useVirtualization = totalLines > VIRTUALIZATION_THRESHOLD

  // Small diff: keep original rendering
  if (!useVirtualization) {
    return (
      <div className="font-mono text-xs grid grid-cols-2">
        {hunks.map((hunk, hunkIndex) => {
          const hunkState = hunkStates[hunkIndex] || 'pending'
          const gapCount = getGapCount(hunks, hunkIndex)
          return (
            <div
              key={hunkIndex}
              className={cn(
                'contents',
                hunkState === 'accept' && 'opacity-60',
                hunkState === 'reject' && 'opacity-40'
              )}
            >
              {/* Left side (old) */}
              <div className="border-r border-stroke/20">
                {showHunkHeader && (
                  <div className="bg-surface-hover/[0.06] text-text-2 px-3 py-1 border-y border-stroke/20 flex items-center justify-between">
                    <span>-{hunk.oldStart},{hunk.oldLines}</span>
                  </div>
                )}
                {hunk.lines
                  .filter((l) => l.type !== 'add')
                  .map((line, lineIndex) => (
                    <div
                      key={lineIndex}
                      className={cn(
                        'flex',
                        line.type === 'remove' && 'bg-status-error-muted'
                      )}
                    >
                      <div
                        className={cn(
                          'w-9 flex-shrink-0 text-right pr-2 select-none border-r border-stroke/20',
                          line.type === 'remove' ? 'text-status-error' : 'text-text-3/70'
                        )}
                      >
                        {line.oldLineNumber || ''}
                      </div>
                      {showSigns && (
                        <div
                          className={cn(
                            'w-6 flex-shrink-0 text-center select-none',
                            line.type === 'remove' && 'text-status-error'
                          )}
                        >
                          {line.type === 'remove' ? '-' : ' '}
                        </div>
                      )}
                      <div
                        className={cn(
                          'flex-1 px-2 whitespace-pre overflow-x-auto',
                          line.type === 'remove' ? 'text-status-error' : 'text-text-1'
                        )}
                      >
                        {line.content}
                      </div>
                    </div>
                  ))}
              </div>
              {/* Right side (new) */}
              <div>
                {showHunkHeader && (
                  <div className="bg-surface-hover/[0.06] text-text-2 px-3 py-1 border-y border-stroke/20 flex items-center justify-between">
                    <span>+{hunk.newStart},{hunk.newLines}</span>
                    <div className="flex items-center gap-2">
                      {enableChunkActions && filePath && (
                        <ChunkStageActions
                          hunkIndex={hunkIndex}
                          hunk={hunk}
                          filePath={filePath}
                          oldPath={oldPath}
                          onStageHunk={onStageHunk}
                          onRevertHunk={onRevertHunk}
                          confirmRevertHunk={confirmRevertHunk}
                          setConfirmRevertHunk={setConfirmRevertHunk}
                        />
                      )}
                      <HunkActions
                        hunkIndex={hunkIndex}
                        hunkState={hunkState}
                        enableHunkActions={enableHunkActions}
                        onHunkAction={onHunkAction}
                      />
                    </div>
                  </div>
                )}
                {hunk.lines
                  .filter((l) => l.type !== 'remove')
                  .map((line, lineIndex) => (
                    <div
                      key={lineIndex}
                      className={cn('flex', line.type === 'add' && 'bg-status-success-muted')}
                    >
                      <div
                        className={cn(
                          'w-9 flex-shrink-0 text-right pr-2 select-none border-r border-stroke/20',
                          line.type === 'add' ? 'text-status-success' : 'text-text-3/70'
                        )}
                      >
                        {line.newLineNumber || ''}
                      </div>
                      {showSigns && (
                        <div
                          className={cn(
                            'w-6 flex-shrink-0 text-center select-none',
                            line.type === 'add' && 'text-status-success'
                          )}
                        >
                          {line.type === 'add' ? '+' : ' '}
                        </div>
                      )}
                      <div
                        className={cn(
                          'flex-1 px-2 whitespace-pre overflow-x-auto',
                          line.type === 'add' ? 'text-status-success' : 'text-text-1'
                        )}
                      >
                        {line.content}
                      </div>
                    </div>
                  ))}
              </div>
              {gapCount > 0 && <SplitGapLine count={gapCount} />}
            </div>
          )
        })}
      </div>
    )
  }

  // Large diff: use virtualization
  return (
    <div className="font-mono text-xs">
      {hunks.map((hunk, hunkIndex) => {
        const hunkState = hunkStates[hunkIndex] || 'pending'
        const gapCount = getGapCount(hunks, hunkIndex)
        const oldLines = hunk.lines.filter((l) => l.type !== 'add')
        const newLines = hunk.lines.filter((l) => l.type !== 'remove')
        const maxLines = Math.max(oldLines.length, newLines.length)

        return (
          <div
            key={hunkIndex}
            className={cn(
              hunkState === 'accept' && 'opacity-60',
              hunkState === 'reject' && 'opacity-40 line-through'
            )}
          >
            {/* Headers - grid layout */}
            {showHunkHeader && (
              <div className="grid grid-cols-2 border-y border-stroke/20">
                <div className="bg-surface-hover/[0.06] text-text-2 px-3 py-1 border-r border-stroke/20">
                  <span>-{hunk.oldStart},{hunk.oldLines}</span>
                </div>
                <div className="bg-surface-hover/[0.06] text-text-2 px-3 py-1 flex items-center justify-between">
                  <span>+{hunk.newStart},{hunk.newLines}</span>
                  <div className="flex items-center gap-2">
                    {enableChunkActions && filePath && (
                      <ChunkStageActions
                        hunkIndex={hunkIndex}
                        hunk={hunk}
                        filePath={filePath}
                        oldPath={oldPath}
                        onStageHunk={onStageHunk}
                        onRevertHunk={onRevertHunk}
                        confirmRevertHunk={confirmRevertHunk}
                        setConfirmRevertHunk={setConfirmRevertHunk}
                      />
                    )}
                    <HunkActions
                      hunkIndex={hunkIndex}
                      hunkState={hunkState}
                      enableHunkActions={enableHunkActions}
                      onHunkAction={onHunkAction}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Virtualized line list */}
            <List<SplitDiffRowCustomProps>
              defaultHeight={Math.min(maxLines * DIFF_LINE_HEIGHT, 600)}
              rowCount={maxLines}
              rowHeight={DIFF_LINE_HEIGHT}
              rowComponent={VirtualizedSplitLine as (props: SplitDiffRowProps) => React.ReactElement}
              rowProps={{ oldLines, newLines, hunkIndex, showSigns }}
              overscanCount={10}
            />
            {gapCount > 0 && <SplitGapLine count={gapCount} />}
          </div>
        )
      })}
    </div>
  )
}
