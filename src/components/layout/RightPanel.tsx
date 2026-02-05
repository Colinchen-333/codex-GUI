import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  GitCommit,
  GitBranch,
  X,
  Search,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react'
import { DiffView, parseDiff, type FileDiff } from '../ui/DiffView'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { cn } from '../../lib/utils'
import { projectApi } from '../../lib/api'
import { useProjectsStore } from '../../stores/projects'

type DiffFilter = 'all' | 'staged' | 'unstaged'

type LoadState = 'idle' | 'loading' | 'error' | 'not-git' | 'empty'

type FileNode = {
  type: 'dir' | 'file'
  name: string
  path: string
  children?: FileNode[]
  diff?: FileDiff
}

type FlattenedNode = {
  node: FileNode
  depth: number
}

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

function buildFileTree(diffs: FileDiff[]): FileNode[] {
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
      if (node.children) {
        sortNodes(node.children)
      }
    })
  }

  if (root.children) {
    sortNodes(root.children)
  }

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

interface RightPanelProps {
  isOpen: boolean
  onClose: () => void
  onCommit?: () => void
}

export function RightPanel({ isOpen, onClose, onCommit }: RightPanelProps) {
  const { selectedProjectId, projects, gitInfo } = useProjectsStore()
  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const projectGitInfo = selectedProjectId ? gitInfo[selectedProjectId] : null

  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [fileDiffs, setFileDiffs] = useState<FileDiff[]>([])
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [diffFilter, setDiffFilter] = useState<DiffFilter>('unstaged')

  const fetchDiff = useCallback(async () => {
    if (!selectedProject) {
      setLoadState('empty')
      setFileDiffs([])
      return
    }

    setLoadState('loading')
    try {
      const result = await projectApi.getGitDiff(selectedProject.path)
      if (!result.isGitRepo) {
        setLoadState('not-git')
        setFileDiffs([])
        return
      }
      if (!result.diff) {
        setLoadState('empty')
        setFileDiffs([])
        return
      }

      const parsed = parseGitDiff(result.diff)
      setFileDiffs(parsed)
      setLoadState(parsed.length === 0 ? 'empty' : 'idle')
      
      if (parsed.length > 0 && !selectedPath) {
        setSelectedPath(parsed[0].path)
      }
    } catch {
      setLoadState('error')
      setFileDiffs([])
    }
  }, [selectedProject, selectedPath])

  useEffect(() => {
    if (isOpen) {
      void fetchDiff()
    }
  }, [fetchDiff, isOpen])

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

  const visibleDiffs = useMemo(() => {
    if (!filterQuery.trim()) return fileDiffs
    const query = filterQuery.trim().toLowerCase()
    return fileDiffs.filter((diff) => diff.path.toLowerCase().includes(query))
  }, [fileDiffs, filterQuery])

  const selectedDiff = useMemo(() => {
    return fileDiffs.find((d) => d.path === selectedPath) ?? null
  }, [fileDiffs, selectedPath])

  const tree = useMemo(() => buildFileTree(visibleDiffs), [visibleDiffs])
  const autoExpand = filterQuery.trim().length > 0
  const flattened = useMemo(
    () => flattenTree(tree, expandedDirs, autoExpand),
    [tree, expandedDirs, autoExpand]
  )

  const getFileIcon = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase()
    if (ext === 'json') {
      return (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-[4px] bg-surface-hover/[0.12] text-[9px] font-mono text-text-3/80">
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
      <div className="flex items-center justify-between border-b border-stroke/10 px-4 h-[var(--height-toolbar-sm)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-md border border-stroke/20 bg-surface-hover/[0.06] px-2 py-1">
            <GitBranch size={12} className="text-text-2" />
            <span className="text-xs font-medium text-text-1">{projectGitInfo?.branch || 'main'}</span>
            <ChevronDown size={12} className="text-text-3" />
          </div>
          <div className="flex items-center rounded-md bg-surface-hover/[0.06] p-0.5">
            {(['unstaged', 'staged'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDiffFilter(filter)}
                className={cn(
                  'px-2 py-0.5 text-[11px] font-medium rounded transition-colors capitalize',
                  diffFilter === filter
                    ? 'bg-surface-solid text-text-1 shadow-sm'
                    : 'text-text-3 hover:text-text-2'
                )}
              >
                {filter} · {filter === 'unstaged' ? stats.filesChanged : 0}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton size="sm" onClick={() => void fetchDiff()} title="Refresh">
            <RefreshCw size={14} />
          </IconButton>
          <Button variant="secondary" size="sm" onClick={onCommit}>
            <GitCommit size={14} />
            Commit
          </Button>
          <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
            <span className="text-emerald-500 font-semibold">+{stats.additions.toLocaleString()}</span>
            <span className="text-red-500 font-semibold">-{stats.deletions.toLocaleString()}</span>
          </div>
          <IconButton size="sm" title="More options">
            <MoreHorizontal size={14} />
          </IconButton>
          <IconButton size="sm" onClick={onClose} title="Close panel">
            <X size={14} />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-[3] flex flex-col overflow-hidden border-r border-stroke/10">
          {loadState === 'loading' && (
            <div className="flex flex-1 items-center justify-center text-sm text-text-3">
              Loading...
            </div>
          )}
          {loadState === 'not-git' && (
            <div className="flex flex-1 items-center justify-center text-sm text-text-3">
              Not a git repository
            </div>
          )}
          {loadState === 'empty' && (
            <div className="flex flex-1 items-center justify-center text-sm text-text-3">
              No changes
            </div>
          )}
          {loadState === 'error' && (
            <div className="flex flex-1 items-center justify-center text-sm text-red-500">
              Failed to load diff
            </div>
          )}
          {loadState === 'idle' && selectedDiff && (
            <>
              <div className="flex items-center justify-between px-3 py-2 border-b border-stroke/10 bg-surface-hover/[0.04]">
                <span className="text-xs font-medium text-text-1 truncate">{selectedDiff.path}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-500">+{selectedDiffStats.additions}</span>
                  <span className="text-red-500">-{selectedDiffStats.deletions}</span>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <DiffView
                  diff={selectedDiff}
                  collapsed={false}
                  containerClassName="border-0 rounded-none bg-surface-solid"
                  enableHunkActions={false}
                  initialViewMode="unified"
                  showViewToggle={false}
                  showHeader={false}
                  showHunkHeader={false}
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
                  {fileDiffStats && (
                    <span className="flex items-center gap-1 text-[10px] font-mono tabular-nums flex-shrink-0">
                      <span className="text-emerald-500">+{fileDiffStats.additions}</span>
                      <span className="text-red-500">-{fileDiffStats.deletions}</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function RightPanelToggle({ onClick, hasChanges }: { onClick: () => void; hasChanges?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors",
        hasChanges
          ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          : "border-stroke/30 bg-surface-solid text-text-2 hover:bg-surface-hover/[0.08]"
      )}
      title="Show changes panel"
    >
      <ChevronLeft size={12} />
      Changes
    </button>
  )
}
