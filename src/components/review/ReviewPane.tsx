import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  GitCommit,
  RefreshCw,
  Search,
  MoreHorizontal,
  Plus,
  Minus,
  X,
} from 'lucide-react'
import { DiffView, parseDiff, type FileDiff } from '../ui/DiffView'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { cn } from '../../lib/utils'
import { projectApi, type GitFileStatus } from '../../lib/api'
import { useProjectsStore } from '../../stores/projects'

// ==================== Types ====================

type ReviewScope = 'uncommitted' | 'branch' | 'last-turn'

type StagedFilter = 'all' | 'staged' | 'unstaged'

type LoadState = 'idle' | 'loading' | 'error' | 'not-git' | 'empty'

type FileNode = {
  type: 'dir' | 'file'
  name: string
  path: string
  children?: FileNode[]
  diff?: FileDiff
  fileStatus?: GitFileStatus
}

type FlattenedNode = {
  node: FileNode
  depth: number
}

// ==================== Diff Parsing ====================

function parseGitDiff(diff: string): FileDiff[] {
  const lines = diff.split('\n')
  const sections: string[] = []
  let current: string[] = []

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      if (current.length > 0) {
        sections.push(current.join('\n'))
      }
      current = [line]
    } else if (current.length > 0) {
      current.push(line)
    }
  }
  if (current.length > 0) {
    sections.push(current.join('\n'))
  }

  return sections.map((section) => {
    const header = section.split('\n')[0] ?? ''
    const match = header.match(/^diff --git a\/(.*) b\/(.*)$/)
    const oldPath = match?.[1] ?? 'unknown'
    const newPath = match?.[2] ?? oldPath

    let kind: FileDiff['kind'] = 'modify'
    let renameFrom: string | undefined
    let renameTo: string | undefined

    if (section.includes('new file mode') || section.includes('--- /dev/null')) {
      kind = 'add'
    }
    if (section.includes('deleted file mode') || section.includes('+++ /dev/null')) {
      kind = 'delete'
    }
    if (section.includes('rename from')) {
      kind = 'rename'
      const renameFromMatch = section.match(/rename from (.*)/)
      const renameToMatch = section.match(/rename to (.*)/)
      renameFrom = renameFromMatch?.[1]
      renameTo = renameToMatch?.[1]
    }

    const path = renameTo || newPath
    const hunks = parseDiff(section)

    return {
      path,
      kind,
      oldPath: renameFrom || (kind === 'rename' ? oldPath : undefined),
      hunks,
      raw: section,
    }
  })
}

// ==================== Tree Helpers ====================

function buildFileTree(diffs: FileDiff[], statusMap?: Map<string, GitFileStatus>): FileNode[] {
  const root: FileNode = { type: 'dir', name: '', path: '', children: [] }

  for (const diff of diffs) {
    const parts = diff.path.split('/')
    let current = root
    let currentPath = ''

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      currentPath = currentPath ? `${currentPath}/${part}` : part

      if (isFile) {
        current.children!.push({
          type: 'file',
          name: part,
          path: currentPath,
          diff,
          fileStatus: statusMap?.get(currentPath),
        })
      } else {
        let next = current.children!.find((child) => child.type === 'dir' && child.name === part)
        if (!next) {
          next = { type: 'dir', name: part, path: currentPath, children: [] }
          current.children!.push(next)
        }
        current = next
      }
    }
  }

  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    nodes.forEach((node) => {
      if (node.children) sortNodes(node.children)
    })
  }

  if (root.children) sortNodes(root.children)
  return root.children ?? []
}

function flattenTree(
  nodes: FileNode[],
  expandedDirs: Set<string>,
  autoExpand: boolean,
  depth = 0,
  result: FlattenedNode[] = []
): FlattenedNode[] {
  for (const node of nodes) {
    result.push({ node, depth })
    if (node.type === 'dir' && node.children && (autoExpand || expandedDirs.has(node.path))) {
      flattenTree(node.children, expandedDirs, autoExpand, depth + 1, result)
    }
  }
  return result
}

function getDiffStats(diff?: FileDiff | null) {
  if (!diff) return { additions: 0, deletions: 0 }
  let additions = 0
  let deletions = 0
  for (const hunk of diff.hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add') additions += 1
      if (line.type === 'remove') deletions += 1
    }
  }
  return { additions, deletions }
}

function getStatusBadge(status?: GitFileStatus): { label: string; color: string } | null {
  if (!status) return null
  switch (status.status) {
    case 'M': return { label: 'M', color: 'text-status-info' }
    case 'A': return { label: 'A', color: 'text-status-success' }
    case 'D': return { label: 'D', color: 'text-status-error' }
    case 'R': return { label: 'R', color: 'text-status-info' }
    case '?': return { label: 'U', color: 'text-status-warning' }
    default:  return { label: status.status, color: 'text-text-3' }
  }
}

// ==================== Scope definitions ====================

const SCOPES: { value: ReviewScope; label: string }[] = [
  { value: 'uncommitted', label: 'Uncommitted' },
  { value: 'branch', label: 'Branch' },
  { value: 'last-turn', label: 'Last turn' },
]

// ==================== Component ====================

interface ReviewPaneProps {
  isOpen: boolean
  onClose: () => void
  onCommit?: () => void
}

export function ReviewPane({ isOpen, onClose, onCommit }: ReviewPaneProps) {
  const { selectedProjectId, projects, gitInfo } = useProjectsStore()
  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const projectGitInfo = selectedProjectId ? gitInfo[selectedProjectId] : null

  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [fileDiffs, setFileDiffs] = useState<FileDiff[]>([])
  const [fileStatuses, setFileStatuses] = useState<GitFileStatus[]>([])
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [activeScope, setActiveScope] = useState<ReviewScope>('uncommitted')
  const [stagedFilter, setStagedFilter] = useState<StagedFilter>('all')

  // Fetch diff based on active scope
  const fetchDiff = useCallback(async () => {
    if (!selectedProject) {
      setLoadState('empty')
      setFileDiffs([])
      setFileStatuses([])
      return
    }

    setLoadState('loading')
    try {
      let rawDiff = ''

      if (activeScope === 'uncommitted') {
        // Fetch both staged and unstaged diffs
        const [unstagedResult, stagedResult, statuses] = await Promise.all([
          projectApi.getGitDiff(selectedProject.path),
          projectApi.getGitDiffStaged(selectedProject.path),
          projectApi.gitStatus(selectedProject.path),
        ])

        if (!unstagedResult.isGitRepo) {
          setLoadState('not-git')
          setFileDiffs([])
          setFileStatuses([])
          return
        }

        setFileStatuses(statuses)

        if (stagedFilter === 'staged') {
          rawDiff = stagedResult.diff ?? ''
        } else if (stagedFilter === 'unstaged') {
          rawDiff = unstagedResult.diff ?? ''
        } else {
          // 'all' - combine both
          rawDiff = `${unstagedResult.diff ?? ''}${stagedResult.diff ?? ''}`
        }
      } else if (activeScope === 'branch') {
        // Determine the default branch for comparison
        const defaultBranches = ['main', 'master', 'develop']
        const currentBranch = projectGitInfo?.branch || 'main'
        const baseBranch = defaultBranches.includes(currentBranch)
          ? currentBranch
          : 'main' // Default to main if current branch is not a default branch
        try {
          rawDiff = await projectApi.gitDiffBranch(selectedProject.path, baseBranch)
        } catch {
          // If main doesn't exist, try master
          try {
            rawDiff = await projectApi.gitDiffBranch(selectedProject.path, 'master')
          } catch {
            setLoadState('error')
            setFileDiffs([])
            return
          }
        }
      } else if (activeScope === 'last-turn') {
        // Last turn: show uncommitted changes as a proxy
        // (In a full implementation, this would track agent turn boundaries)
        const result = await projectApi.getGitDiff(selectedProject.path)
        if (!result.isGitRepo) {
          setLoadState('not-git')
          setFileDiffs([])
          return
        }
        rawDiff = result.diff ?? ''
      }

      if (!rawDiff.trim()) {
        setLoadState('empty')
        setFileDiffs([])
        return
      }

      const parsed = parseGitDiff(rawDiff)
      setFileDiffs(parsed)
      setLoadState(parsed.length === 0 ? 'empty' : 'idle')

      if (parsed.length > 0 && !selectedPath) {
        setSelectedPath(parsed[0].path)
      }
    } catch {
      setLoadState('error')
      setFileDiffs([])
    }
  }, [selectedProject, activeScope, stagedFilter, projectGitInfo, selectedPath])

  // Fetch diff when panel opens or dependencies change - this is an intentional side effect
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      void fetchDiff()
    }
  }, [fetchDiff, isOpen])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reset filter when scope changes - this is an intentional side effect
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSelectedPath(null)
    setStagedFilter('all')
  }, [activeScope])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Stats
  const stats = useMemo(() => {
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
    return { filesChanged: fileDiffs.length, additions, deletions }
  }, [fileDiffs])

  // Staged/unstaged counts
  const stagedCounts = useMemo(() => {
    const staged = fileStatuses.filter((f) => f.isStaged).length
    const unstaged = fileStatuses.filter((f) => !f.isStaged).length
    return { staged, unstaged, all: fileStatuses.length }
  }, [fileStatuses])

  // Filtered diffs
  const visibleDiffs = useMemo(() => {
    if (!filterQuery.trim()) return fileDiffs
    const query = filterQuery.trim().toLowerCase()
    return fileDiffs.filter((diff) => diff.path.toLowerCase().includes(query))
  }, [fileDiffs, filterQuery])

  const selectedDiff = useMemo(() => {
    return fileDiffs.find((d) => d.path === selectedPath) ?? null
  }, [fileDiffs, selectedPath])

  // Status map for file badges
  const statusMap = useMemo(() => {
    const map = new Map<string, GitFileStatus>()
    for (const status of fileStatuses) {
      map.set(status.path, status)
    }
    return map
  }, [fileStatuses])

  const tree = useMemo(() => buildFileTree(visibleDiffs, statusMap), [visibleDiffs, statusMap])
  const autoExpand = filterQuery.trim().length > 0
  const flattened = useMemo(
    () => flattenTree(tree, expandedDirs, autoExpand),
    [tree, expandedDirs, autoExpand]
  )

  // Stage all files
  const handleStageAll = useCallback(async () => {
    if (!selectedProject) return
    const unstaged = fileStatuses.filter((f) => !f.isStaged).map((f) => f.path)
    if (unstaged.length === 0) return
    try {
      await projectApi.gitStageFiles(selectedProject.path, unstaged)
      void fetchDiff()
    } catch {
      // Error handling deferred to toast system
    }
  }, [selectedProject, fileStatuses, fetchDiff])

  // Revert all (unstage all staged files)
  const handleUnstageAll = useCallback(async () => {
    if (!selectedProject) return
    const staged = fileStatuses.filter((f) => f.isStaged).map((f) => f.path)
    if (staged.length === 0) return
    try {
      await projectApi.gitUnstageFiles(selectedProject.path, staged)
      void fetchDiff()
    } catch {
      // Error handling deferred to toast system
    }
  }, [selectedProject, fileStatuses, fetchDiff])

  const getFileIcon = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase()
    if (ext === 'json') {
      return (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-surface-hover/[0.12] text-[9px] font-mono text-text-3/80">
          {'{}'}
        </span>
      )
    }
    if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') return <FileCode size={14} />
    if (ext === 'md') return <FileText size={14} />
    return <FileText size={14} />
  }

  if (!isOpen) return null

  const selectedDiffStats = getDiffStats(selectedDiff)

  return (
    <div className="flex h-full w-[40vw] min-w-[480px] max-w-[720px] flex-col border-l border-stroke/10 bg-surface-solid">
      {/* Header */}
      <div className="flex flex-col border-b border-stroke/10">
        {/* Top row: scope toggle + actions */}
        <div className="flex items-center justify-between px-4 h-[var(--height-toolbar-sm)]">
          <div className="flex items-center gap-3">
            {/* Scope Toggle (segmented control) */}
            <div className="inline-flex rounded-lg border border-stroke/20 bg-surface-hover/[0.06] p-0.5">
              {SCOPES.map((scope) => (
                <button
                  key={scope.value}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    activeScope === scope.value
                      ? 'bg-surface-solid text-text-1 shadow-sm'
                      : 'text-text-3 hover:text-text-1'
                  )}
                  onClick={() => setActiveScope(scope.value)}
                >
                  {scope.label}
                </button>
              ))}
            </div>

            {/* File count badge */}
            <span className="inline-flex items-center rounded-full bg-surface-hover/[0.12] px-2 py-0.5 text-[10px] font-medium text-text-2 tabular-nums">
              {stats.filesChanged} file{stats.filesChanged !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <IconButton size="sm" onClick={() => void fetchDiff()} title="Refresh" aria-label="Refresh">
              <RefreshCw size={14} />
            </IconButton>
            <Button variant="secondary" size="sm" onClick={onCommit}>
              <GitCommit size={14} />
              Commit
            </Button>
            <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
              <span className="text-status-success font-semibold">+{stats.additions.toLocaleString()}</span>
              <span className="text-status-error font-semibold">-{stats.deletions.toLocaleString()}</span>
            </div>
            <IconButton size="sm" onClick={onClose} title="Close panel" aria-label="Close panel">
              <X size={14} />
            </IconButton>
          </div>
        </div>

        {/* Second row: staged/unstaged filter + actions (only in uncommitted mode) */}
        {activeScope === 'uncommitted' && (
          <div className="flex items-center justify-between px-4 pb-2">
            <div className="flex items-center gap-2">
              {/* Staged/Unstaged toggle */}
              <div className="inline-flex rounded-md bg-surface-hover/[0.06] p-0.5">
                {(['all', 'staged', 'unstaged'] as const).map((filter) => {
                  const count =
                    filter === 'all' ? stagedCounts.all
                    : filter === 'staged' ? stagedCounts.staged
                    : stagedCounts.unstaged
                  return (
                    <button
                      key={filter}
                      onClick={() => setStagedFilter(filter)}
                      className={cn(
                        'px-2 py-0.5 text-[11px] font-medium rounded transition-colors capitalize',
                        stagedFilter === filter
                          ? 'bg-surface-solid text-text-1 shadow-sm'
                          : 'text-text-3 hover:text-text-2'
                      )}
                    >
                      {filter}{count > 0 ? ` (${count})` : ''}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Stage all / Unstage all */}
            <div className="flex items-center gap-1">
              <button
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-surface-hover/[0.08] text-text-2 hover:bg-status-success-muted hover:text-status-success transition-colors"
                onClick={() => void handleStageAll()}
                title="Stage all"
              >
                <Plus size={10} />
                Stage all
              </button>
              <button
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-surface-hover/[0.08] text-text-2 hover:bg-status-error-muted hover:text-status-error transition-colors"
                onClick={() => void handleUnstageAll()}
                title="Unstage all"
              >
                <Minus size={10} />
                Unstage all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main content: file list + diff view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Diff view (left/main area) */}
        <div className="flex-[3] flex flex-col overflow-hidden border-r border-stroke/10">
          {loadState === 'loading' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-text-3">
              <RefreshCw size={20} className="animate-spin" />
              <p className="text-sm">Loading diff...</p>
            </div>
          )}
          {loadState === 'not-git' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-text-3">
              <GitCommit size={20} />
              <p className="text-sm">Not a git repository</p>
            </div>
          )}
          {loadState === 'empty' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-text-3">
              <FileCode size={20} />
              <p className="text-sm">No changes</p>
            </div>
          )}
          {loadState === 'error' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <X size={20} className="text-status-error" />
              <p className="text-sm text-status-error">Failed to load diff</p>
            </div>
          )}
          {loadState === 'idle' && selectedDiff && (
            <>
              <div className="flex items-center justify-between px-3 py-2 border-b border-stroke/10 bg-surface-hover/[0.04]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium text-text-1 truncate">{selectedDiff.path}</span>
                  {(() => {
                    const badge = getStatusBadge(statusMap.get(selectedDiff.path))
                    if (!badge) return null
                    return (
                      <span className={cn('text-[10px] font-mono font-bold', badge.color)}>
                        {badge.label}
                      </span>
                    )
                  })()}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-status-success">+{selectedDiffStats.additions}</span>
                  <span className="text-status-error">-{selectedDiffStats.deletions}</span>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <DiffView
                  diff={selectedDiff}
                  collapsed={false}
                  containerClassName="border-0 rounded-none bg-surface-solid"
                  enableHunkActions={false}
                  enableChunkActions={activeScope === 'uncommitted'}
                  initialViewMode="unified"
                  showViewToggle={false}
                  showHeader={false}
                  showHunkHeader={true}
                  showSigns={false}
                  lineNumberMode="single"
                />
              </div>
            </>
          )}
          {loadState === 'idle' && !selectedDiff && fileDiffs.length > 0 && (
            <div className="flex flex-1 items-center justify-center text-sm text-text-3">
              Select a file to view diff
            </div>
          )}
        </div>

        {/* File list (right sidebar) */}
        <div className="flex-[2] flex flex-col bg-surface-solid">
          <div className="border-b border-stroke/10 px-3 py-2">
            <Input
              inputSize="sm"
              placeholder="Filter files..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              icon={<Search size={12} />}
            />
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {flattened.map(({ node, depth }) => {
              const isDir = node.type === 'dir'
              const isExpanded = autoExpand || expandedDirs.has(node.path)
              const isSelected = node.path === selectedPath
              const indent = depth * 16
              const fileDiffStats = !isDir && node.diff ? getDiffStats(node.diff) : null
              const statusBadge = !isDir ? getStatusBadge(node.fileStatus) : null

              return (
                <button
                  key={`${node.type}-${node.path}`}
                  className={cn(
                    'flex w-full items-center gap-1.5 px-3 py-1 text-left text-[11px] transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-text-1 font-medium'
                      : 'text-text-2 hover:bg-surface-hover/[0.06]'
                  )}
                  onClick={() => {
                    if (isDir) {
                      setExpandedDirs((prev) => {
                        const next = new Set(prev)
                        if (next.has(node.path)) {
                          next.delete(node.path)
                        } else {
                          next.add(node.path)
                        }
                        return next
                      })
                    } else {
                      setSelectedPath(node.path)
                    }
                  }}
                >
                  <span className="flex items-center gap-1.5 flex-1 min-w-0" style={{ paddingLeft: indent }}>
                    {isDir ? (
                      isExpanded ? <ChevronDown size={12} className="flex-shrink-0" /> : <ChevronRight size={12} className="flex-shrink-0" />
                    ) : (
                      <span className="w-3 flex-shrink-0" />
                    )}
                    {isDir ? (
                      isExpanded ? <FolderOpen size={14} className="flex-shrink-0 text-text-3" /> : <Folder size={14} className="flex-shrink-0 text-text-3" />
                    ) : (
                      <span className="flex-shrink-0">{getFileIcon(node.path)}</span>
                    )}
                    <span className="truncate">{node.name}</span>
                  </span>
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    {statusBadge && (
                      <span className={cn('text-[9px] font-mono font-bold', statusBadge.color)}>
                        {statusBadge.label}
                      </span>
                    )}
                    {fileDiffStats && (
                      <span className="flex items-center gap-1 text-[10px] font-mono tabular-nums">
                        <span className="text-status-success">+{fileDiffStats.additions}</span>
                        <span className="text-status-error">-{fileDiffStats.deletions}</span>
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReviewPaneToggle({ onClick, hasChanges }: { onClick: () => void; hasChanges?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors",
        hasChanges
          ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          : "border-stroke/30 bg-surface-solid text-text-2 hover:bg-surface-hover/[0.08]"
      )}
      title="Show review panel"
    >
      <MoreHorizontal size={12} />
      Review
    </button>
  )
}
