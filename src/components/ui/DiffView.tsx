import { useState, useMemo, memo } from 'react'
import { Check, X, ChevronUp } from 'lucide-react'
import { List } from 'react-window'
import { cn } from '../../lib/utils'
import { parseDiff, type HunkAction, type DiffHunk, type DiffLine, type FileDiff } from './DiffView.utils'

// Re-export types and utilities for external use
// eslint-disable-next-line react-refresh/only-export-components
export { parseDiff, type FileDiff, type DiffHunk, type DiffLine, type HunkAction }

// 单行高度（px）
const DIFF_LINE_HEIGHT = 26

// 虚拟化阈值（超过 100 行启用）
const VIRTUALIZATION_THRESHOLD = 100

// Unified 模式行组件自定义 props（通过 rowProps 传递）
interface UnifiedDiffRowCustomProps {
  lines: DiffLine[]
  hunkIndex: number
  showSigns: boolean
  lineNumberMode: 'dual' | 'single'
}

// Unified 模式行组件完整 props（包含 react-window 注入的 props）
interface UnifiedDiffRowProps extends UnifiedDiffRowCustomProps {
  ariaAttributes: {
    'aria-posinset': number
    'aria-setsize': number
    role: 'listitem'
  }
  index: number
  style: React.CSSProperties
}

// Split 模式行组件自定义 props
interface SplitDiffRowCustomProps {
  oldLines: DiffLine[]
  newLines: DiffLine[]
  hunkIndex: number
  showSigns: boolean
}

// Split 模式行组件完整 props
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
}: DiffViewProps) {
  // Treat initialViewMode as truly "initial". If we need a controlled mode later,
  // add an explicit `viewMode` prop instead of syncing via effects (lint rule).
  const [viewMode, setViewMode] = useState<'unified' | 'split'>(initialViewMode ?? 'unified')
  const [commentTarget, setCommentTarget] = useState<{ hunkIndex: number; lineIndex: number } | null>(null)
  const [commentText, setCommentText] = useState('')

  const kindIcon = {
    add: '+',
    modify: '~',
    delete: '-',
    rename: '→',
  }

  const kindColor = {
    add: 'text-green-500',
    modify: 'text-yellow-500',
    delete: 'text-red-500',
    rename: 'text-blue-500',
  }

  const totalLines = useMemo(() =>
    diff.hunks.reduce((sum, hunk) => sum + hunk.lines.length, 0),
    [diff.hunks]
  )

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
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded ml-2">Large</span>
            )}
          </div>
          <div className="flex items-center gap-2">
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
            <span className="text-text-3">
              {collapsed ? '▶' : '▼'}
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
              }}
            />
          ) : (
            <SplitDiff
              hunks={diff.hunks}
              enableHunkActions={enableHunkActions}
              onHunkAction={onHunkAction}
              hunkStates={hunkStates}
              showHunkHeader={showHunkHeader}
              showSigns={showSigns}
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
  showHunkHeader?: boolean
  showSigns?: boolean
  lineNumberMode?: 'dual' | 'single'
}

interface InlineCommentState {
  enabled: boolean
  target: { hunkIndex: number; lineIndex: number } | null
  setTarget: (target: { hunkIndex: number; lineIndex: number } | null) => void
  text: string
  setText: (value: string) => void
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
          className="p-1 rounded hover:bg-green-200/60 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400"
          title="Accept this change"
        >
          <Check size={14} />
        </button>
      )}
      {hunkState !== 'reject' && (
        <button
          onClick={() => onHunkAction(hunkIndex, 'reject')}
          className="p-1 rounded hover:bg-red-200/60 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
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

// 虚拟化行组件（Unified 模式）
const VirtualizedDiffLine = memo(function VirtualizedDiffLine({
  index,
  style,
  lines,
  showSigns,
  lineNumberMode,
}: UnifiedDiffRowProps) {
  const line = lines[index]
  const oldNumberClass =
    line.type === 'remove' ? 'text-red-600 dark:text-red-400' : 'text-text-3/70'
  const newNumberClass =
    line.type === 'add' ? 'text-green-600 dark:text-green-500' : 'text-text-3/70'
  const singleNumber =
    line.type === 'remove' ? line.oldLineNumber : line.newLineNumber ?? line.oldLineNumber
  const singleNumberClass =
    line.type === 'remove'
      ? 'text-red-600 dark:text-red-400'
      : line.type === 'add'
        ? 'text-green-600 dark:text-green-500'
        : 'text-text-3/70'
  const singleNumberColumnClass = cn(
    'w-9 flex-shrink-0 text-right pr-3 select-none',
    singleNumberClass
  )

  const contentClass =
    line.type === 'add'
      ? 'text-green-800 dark:text-green-300'
      : line.type === 'remove'
        ? 'text-red-700 dark:text-red-300'
        : 'text-text-1'

  return (
    <div
      style={style}
      className={cn(
        'flex border-l-2 min-h-[26px] leading-[26px]',
        line.type === 'add' && 'bg-green-50 dark:bg-green-950/30',
        line.type === 'remove' && 'bg-red-50 dark:bg-red-950/30',
        line.type === 'add' && 'border-green-500/70',
        line.type === 'remove' && 'border-red-500/70',
        line.type === 'context' && 'border-transparent'
      )}
    >
      {/* 行号 */}
      {lineNumberMode === 'dual' ? (
        <>
          <div className={cn('w-9 flex-shrink-0 text-right pr-2 select-none border-r border-border/30', oldNumberClass)}>
            {line.oldLineNumber || ''}
          </div>
          <div className={cn('w-9 flex-shrink-0 text-right pr-2 select-none border-r border-border/30', newNumberClass)}>
            {line.newLineNumber || ''}
          </div>
        </>
      ) : (
        <div className={singleNumberColumnClass}>
          {singleNumber || ''}
        </div>
      )}

      {/* 符号 */}
      {showSigns && (
        <div
          className={cn(
            'w-6 flex-shrink-0 text-center select-none',
            line.type === 'add' && 'text-green-600 dark:text-green-500',
            line.type === 'remove' && 'text-red-600 dark:text-red-500'
          )}
        >
          {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
        </div>
      )}

      {/* 内容 */}
      <div className={cn('flex-1 px-2 whitespace-pre overflow-x-auto', contentClass)}>
        {line.content}
      </div>
    </div>
  )
})

// 虚拟化行组件（Split 模式）
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
    oldLine?.type === 'remove' ? 'text-red-600 dark:text-red-400' : 'text-text-3/70'
  const newNumberClass =
    newLine?.type === 'add' ? 'text-green-600 dark:text-green-500' : 'text-text-3/70'
  const oldContentClass =
    oldLine?.type === 'remove' ? 'text-red-700 dark:text-red-300' : 'text-text-1'
  const newContentClass =
    newLine?.type === 'add' ? 'text-green-800 dark:text-green-300' : 'text-text-1'

  return (
    <div style={style} className="grid grid-cols-2 min-h-[26px] leading-[26px]">
      {/* 左侧（旧）*/}
      <div
        className={cn(
          'flex border-r border-border',
          oldLine?.type === 'remove' && 'bg-red-50 dark:bg-red-950/30'
        )}
      >
        <div className={cn('w-9 flex-shrink-0 text-right pr-2 select-none border-r border-border/30', oldNumberClass)}>
          {oldLine?.oldLineNumber || ''}
        </div>
        {showSigns && (
          <div
            className={cn(
              'w-6 flex-shrink-0 text-center select-none',
              oldLine?.type === 'remove' && 'text-red-600 dark:text-red-500'
            )}
          >
            {oldLine?.type === 'remove' ? '-' : ' '}
          </div>
        )}
        <div className={cn('flex-1 px-2 whitespace-pre overflow-x-auto', oldContentClass)}>
          {oldLine?.content || ''}
        </div>
      </div>

      {/* 右侧（新）*/}
      <div
        className={cn(
          'flex',
          newLine?.type === 'add' && 'bg-green-50 dark:bg-green-950/30'
        )}
      >
        <div className={cn('w-9 flex-shrink-0 text-right pr-2 select-none border-r border-border/30', newNumberClass)}>
          {newLine?.newLineNumber || ''}
        </div>
        {showSigns && (
          <div
            className={cn(
              'w-6 flex-shrink-0 text-center select-none',
              newLine?.type === 'add' && 'text-green-600 dark:text-green-500'
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
        lineNumberMode === 'dual' && 'border-r border-border/30'
      )}>
        <ChevronUp size={12} />
      </div>
      {lineNumberMode === 'dual' && <div className="w-9 flex-shrink-0 border-r border-border/30" />}
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
            ? 'bg-green-200/70 text-green-900 rounded-sm px-0.5'
            : 'bg-red-200/70 text-red-900 rounded-sm px-0.5')
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
  showHunkHeader = true,
  showSigns = true,
  lineNumberMode = 'dual',
}: DiffComponentProps) {
  // 计算总行数
  const totalLines = useMemo(() =>
    hunks.reduce((sum, hunk) => sum + hunk.lines.length, 0),
    [hunks]
  )

  // 决定是否使用虚拟化
  const useVirtualization = totalLines > VIRTUALIZATION_THRESHOLD
  const inlineCommentsEnabled = inlineComments?.enabled ?? false

  // 小 diff：保持原有渲染方式
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
                <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-3 py-1 border-y border-border/50 flex items-center justify-between">
                  <span>@@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@</span>
                  <HunkActions
                    hunkIndex={hunkIndex}
                    hunkState={hunkState}
                    enableHunkActions={enableHunkActions}
                    onHunkAction={onHunkAction}
                  />
                </div>
              )}
              {/* Lines */}
              {hunk.lines.map((line, lineIndex) => {
                const inlineSegments = inlineMap.get(lineIndex)
                const oldNumberClass =
                  line.type === 'remove' ? 'text-red-600 dark:text-red-400' : 'text-text-3/70'
                const newNumberClass =
                  line.type === 'add' ? 'text-green-600 dark:text-green-500' : 'text-text-3/70'
                const singleNumber =
                  line.type === 'remove' ? line.oldLineNumber : line.newLineNumber ?? line.oldLineNumber
                const singleNumberClass =
                  line.type === 'remove'
                    ? 'text-red-600 dark:text-red-400'
                    : line.type === 'add'
                      ? 'text-green-600 dark:text-green-500'
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
                    ? 'text-green-800 dark:text-green-300'
                    : line.type === 'remove'
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-text-1'

                return (
                  <div key={lineIndex}>
                    <div
                      className={cn(
                        'flex border-l-2 min-h-[26px] leading-[26px]',
                        line.type === 'add' && 'bg-green-50 dark:bg-green-950/30',
                        line.type === 'remove' && 'bg-red-50 dark:bg-red-950/30',
                        line.type === 'add' && 'border-green-500/70',
                        line.type === 'remove' && 'border-red-500/70',
                        line.type === 'context' && 'border-transparent',
                        inlineCommentsEnabled && 'cursor-pointer',
                        isCommentTarget && 'ring-1 ring-inset ring-stroke/40'
                      )}
                      onClick={() => {
                        if (!inlineCommentsEnabled || !inlineComments) return
                        const isSame =
                          inlineComments.target?.hunkIndex === hunkIndex &&
                          inlineComments.target?.lineIndex === lineIndex
                        inlineComments.setTarget(isSame ? null : { hunkIndex, lineIndex })
                        inlineComments.setText('')
                      }}
                    >
                      {/* Line numbers */}
                      {lineNumberMode === 'dual' ? (
                        <>
                          <div className={cn('w-9 flex-shrink-0 text-right pr-2 select-none border-r border-border/30', oldNumberClass)}>
                            {line.oldLineNumber || ''}
                          </div>
                          <div className={cn('w-9 flex-shrink-0 text-right pr-2 select-none border-r border-border/30', newNumberClass)}>
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
                            line.type === 'add' && 'text-green-600 dark:text-green-500',
                            line.type === 'remove' && 'text-red-600 dark:text-red-500'
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
                    {isCommentTarget && inlineCommentsEnabled && inlineComments && (
                      <div className="flex bg-transparent border-l-2 border-transparent">
                        <div className={cn('w-9 flex-shrink-0', lineNumberMode === 'dual' && 'border-r border-border/30')} />
                        {lineNumberMode === 'dual' && (
                          <div className="w-9 flex-shrink-0 border-r border-border/30" />
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
                                placeholder="Request change"
                                value={inlineComments.text}
                                onChange={(event) => inlineComments.setText(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Escape') {
                                    inlineComments.setTarget(null)
                                    inlineComments.setText('')
                                  }
                                }}
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
                                    ? 'bg-text-1 text-white hover:bg-text-1/90'
                                    : 'bg-surface-hover/[0.2] text-text-2 cursor-not-allowed'
                                )}
                                disabled={!inlineComments.text.trim()}
                                onClick={() => {
                                  inlineComments.setTarget(null)
                                  inlineComments.setText('')
                                }}
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

  // 大 diff：使用虚拟化
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
              <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-3 py-1 border-y border-border/50 flex items-center justify-between">
                <span>@@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@</span>
                <HunkActions
                  hunkIndex={hunkIndex}
                  hunkState={hunkState}
                  enableHunkActions={enableHunkActions}
                  onHunkAction={onHunkAction}
                />
              </div>
            )}

            {/* 虚拟化行列表 - 直接使用 memo 化的组件，无需 useCallback */}
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
}: DiffComponentProps) {
  // 计算总行数（取最大的一侧）
  const totalLines = useMemo(() =>
    hunks.reduce((sum, hunk) => {
      const oldLines = hunk.lines.filter((l) => l.type !== 'add').length
      const newLines = hunk.lines.filter((l) => l.type !== 'remove').length
      return sum + Math.max(oldLines, newLines)
    }, 0),
    [hunks]
  )

  // 决定是否使用虚拟化
  const useVirtualization = totalLines > VIRTUALIZATION_THRESHOLD

  // 小 diff：保持原有渲染方式
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
              <div className="border-r border-border">
                {showHunkHeader && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-3 py-1 border-y border-border/50 flex items-center justify-between">
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
                        line.type === 'remove' && 'bg-red-50 dark:bg-red-950/30'
                      )}
                    >
                      <div
                        className={cn(
                          'w-9 flex-shrink-0 text-right pr-2 select-none border-r border-border/30',
                          line.type === 'remove' ? 'text-red-600 dark:text-red-400' : 'text-text-3/70'
                        )}
                      >
                        {line.oldLineNumber || ''}
                      </div>
                      {showSigns && (
                        <div
                          className={cn(
                            'w-6 flex-shrink-0 text-center select-none',
                            line.type === 'remove' && 'text-red-600 dark:text-red-500'
                          )}
                        >
                          {line.type === 'remove' ? '-' : ' '}
                        </div>
                      )}
                      <div
                        className={cn(
                          'flex-1 px-2 whitespace-pre overflow-x-auto',
                          line.type === 'remove' ? 'text-red-700 dark:text-red-300' : 'text-text-1'
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
                  <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-3 py-1 border-y border-border/50 flex items-center justify-between">
                    <span>+{hunk.newStart},{hunk.newLines}</span>
                    <HunkActions
                      hunkIndex={hunkIndex}
                      hunkState={hunkState}
                      enableHunkActions={enableHunkActions}
                      onHunkAction={onHunkAction}
                    />
                  </div>
                )}
                {hunk.lines
                  .filter((l) => l.type !== 'remove')
                  .map((line, lineIndex) => (
                    <div
                      key={lineIndex}
                      className={cn('flex', line.type === 'add' && 'bg-green-50 dark:bg-green-950/30')}
                    >
                      <div
                        className={cn(
                          'w-9 flex-shrink-0 text-right pr-2 select-none border-r border-border/30',
                          line.type === 'add' ? 'text-green-600 dark:text-green-500' : 'text-text-3/70'
                        )}
                      >
                        {line.newLineNumber || ''}
                      </div>
                      {showSigns && (
                        <div
                          className={cn(
                            'w-6 flex-shrink-0 text-center select-none',
                            line.type === 'add' && 'text-green-600 dark:text-green-500'
                          )}
                        >
                          {line.type === 'add' ? '+' : ' '}
                        </div>
                      )}
                      <div
                        className={cn(
                          'flex-1 px-2 whitespace-pre overflow-x-auto',
                          line.type === 'add' ? 'text-green-800 dark:text-green-300' : 'text-text-1'
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

  // 大 diff：使用虚拟化
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
            {/* Headers - 使用 grid 布局 */}
            {showHunkHeader && (
              <div className="grid grid-cols-2 border-y border-border/50">
                <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-3 py-1 border-r border-border">
                  <span>-{hunk.oldStart},{hunk.oldLines}</span>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-3 py-1 flex items-center justify-between">
                  <span>+{hunk.newStart},{hunk.newLines}</span>
                  <HunkActions
                    hunkIndex={hunkIndex}
                    hunkState={hunkState}
                    enableHunkActions={enableHunkActions}
                    onHunkAction={onHunkAction}
                  />
                </div>
              </div>
            )}

            {/* 虚拟化行列表 - 直接使用 memo 化的组件，无需 useCallback */}
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
