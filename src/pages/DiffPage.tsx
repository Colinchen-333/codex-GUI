import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  MoreHorizontal,
  RotateCcw,
  Plus,
} from 'lucide-react'
import { DiffView, parseDiff, type FileDiff } from '../components/ui/DiffView'
import { cn } from '../lib/utils'
import { parseError } from '../lib/errorUtils'
import { projectApi } from '../lib/api'
import { useProjectsStore } from '../stores/projects'
import { useToast } from '../components/ui/Toast'

type LoadState = 'idle' | 'loading' | 'error' | 'not-git' | 'empty'

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])

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

export function DiffPage() {
  const { showToast } = useToast()
  const { selectedProjectId, projects } = useProjectsStore()
  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [diffText, setDiffText] = useState<string>('')
  const [fileDiffs, setFileDiffs] = useState<FileDiff[]>([])
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set())
  const fileRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const fetchDiff = useCallback(async () => {
    if (!selectedProject) {
      setLoadState('empty')
      setDiffText('')
      setFileDiffs([])
      return
    }

    setLoadState('loading')
    try {
      const result = await projectApi.getGitDiff(selectedProject.path)
      if (!result.isGitRepo) {
        setLoadState('not-git')
        setDiffText('')
        setFileDiffs([])
        return
      }
      if (!result.diff) {
        setLoadState('empty')
        setDiffText('')
        setFileDiffs([])
        return
      }

      const parsed = parseGitDiff(result.diff)
      setDiffText(result.diff)
      setFileDiffs(parsed)
      setLoadState(parsed.length === 0 ? 'error' : 'idle')
    } catch (error) {
      setLoadState('error')
      setDiffText('')
      setFileDiffs([])
      console.error('Failed to load diff:', parseError(error))
    }
  }, [selectedProject])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetching data on mount/project change is intentional.
    void fetchDiff()
  }, [fetchDiff])

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
    return {
      filesChanged: fileDiffs.length,
      additions,
      deletions,
    }
  }, [fileDiffs])

  const visibleDiffs = useMemo(() => {
    if (!filterQuery.trim()) return fileDiffs
    const query = filterQuery.trim().toLowerCase()
    return fileDiffs.filter((diff) => diff.path.toLowerCase().includes(query))
  }, [fileDiffs, filterQuery])

  const resolvedSelectedPath = useMemo(() => {
    if (visibleDiffs.length === 0) return null
    if (selectedPath && visibleDiffs.some((diff) => diff.path === selectedPath)) return selectedPath
    return visibleDiffs[0]?.path ?? null
  }, [selectedPath, visibleDiffs])

  const expandedFromSelected = useMemo(() => {
    if (!resolvedSelectedPath) return new Set<string>()
    if (filterQuery.trim()) return new Set<string>()
    const parts = resolvedSelectedPath.split('/')
    const next = new Set<string>()
    let current = ''
    for (let i = 0; i < parts.length - 1; i += 1) {
      current = current ? `${current}/${parts[i]}` : parts[i]
      next.add(current)
    }
    return next
  }, [resolvedSelectedPath, filterQuery])

  const effectiveExpandedDirs = useMemo(() => {
    const next = new Set(expandedDirs)
    for (const dir of expandedFromSelected) next.add(dir)
    return next
  }, [expandedDirs, expandedFromSelected])

  const tree = useMemo(() => buildFileTree(visibleDiffs), [visibleDiffs])
  const autoExpand = filterQuery.trim().length > 0
  const flattened = useMemo(
    () => flattenTree(tree, effectiveExpandedDirs, autoExpand),
    [tree, effectiveExpandedDirs, autoExpand]
  )

  useEffect(() => {
    if (!resolvedSelectedPath) return
    const target = fileRefs.current[resolvedSelectedPath]
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [resolvedSelectedPath])

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

  const renderMainContent = () => {
    if (loadState === 'loading') {
      return (
        <div className="flex flex-1 items-center justify-center text-sm text-text-3">
          Loading diff data...
        </div>
      )
    }
    if (loadState === 'not-git') {
      return (
        <div className="flex flex-1 items-center justify-center text-sm text-text-3">
          This workspace is not a git repository.
        </div>
      )
    }
    if (loadState === 'empty') {
      return (
        <div className="flex flex-1 items-center justify-center text-sm text-text-3">
          No diff data available.
        </div>
      )
    }
    if (loadState === 'error') {
      return (
        <div className="flex flex-1 items-center justify-center text-sm text-status-error">
          Failed to decode diff data.
        </div>
      )
    }

    return (
      <div className="flex flex-1 overflow-hidden">
        <section className="flex flex-1 flex-col overflow-hidden border-r border-stroke/10">
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {visibleDiffs.length === 0 && (
              <div className="rounded-lg border border-stroke/20 bg-surface-solid p-6 text-sm text-text-3">
                Select a file to view diff details.
              </div>
            )}

            {visibleDiffs.map((diff) => {
              const diffStats = getDiffStats(diff)
              const totalLines = diff.hunks.reduce((sum, hunk) => sum + hunk.lines.length, 0)
              const isLarge = totalLines > 800
              const ext = diff.path.split('.').pop()?.toLowerCase()
              const isImage = ext ? IMAGE_EXTENSIONS.has(ext) : false
              const isCollapsed = collapsedFiles.has(diff.path)

              return (
                <div
                  key={diff.path}
                  ref={(node) => {
                    fileRefs.current[diff.path] = node
                  }}
                  className="rounded-2xl border border-stroke/10 bg-surface-solid shadow-[var(--shadow-1)] overflow-hidden"
                >
                  <button
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left bg-surface-hover/[0.06]"
                    onClick={() => {
                      setSelectedPath(diff.path)
                      setCollapsedFiles((prev) => {
                        const next = new Set(prev)
                        if (next.has(diff.path)) {
                          next.delete(diff.path)
                        } else {
                          next.add(diff.path)
                        }
                        return next
                      })
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2 text-sm text-text-1">
                      <span className="truncate font-semibold">{diff.path}</span>
                      <span className="text-xs font-semibold text-status-success">+{diffStats.additions}</span>
                      <span className="text-xs font-semibold text-status-error">-{diffStats.deletions}</span>
                    </div>
                    <ChevronUp size={14} className={cn('text-text-3 transition-transform', isCollapsed && 'rotate-180')} />
                  </button>

                  {!isCollapsed && (
                    <div className="border-t border-stroke/10">
                      {isLarge ? (
                        <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-text-2 bg-surface-hover/[0.04]">
                          <span className="min-w-0 flex-1 truncate">This file is too large to display here.</span>
                          <button
                            className="inline-flex items-center gap-1 text-text-2 hover:text-text-1"
                            onClick={() => showToast('Open in editor not wired yet', 'info')}
                          >
                            Open in editor
                          </button>
                        </div>
                      ) : isImage ? (
                        <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-text-2 bg-surface-hover/[0.04]">
                          <div className="flex min-w-0 items-center gap-2">
                            <ImageIcon size={14} className="text-text-3" />
                            <span className="truncate">Image diff previews are not available yet.</span>
                          </div>
                          <button
                            className="inline-flex items-center gap-1 text-text-2 hover:text-text-1"
                            onClick={() => showToast('Open in editor not wired yet', 'info')}
                          >
                            Open in editor
                          </button>
                        </div>
                      ) : (
                        <DiffView
                          diff={diff}
                          collapsed={false}
                          onToggleCollapse={undefined}
                          containerClassName="border-0 rounded-none bg-surface-solid"
                          enableHunkActions={false}
                          initialViewMode="unified"
                          showViewToggle={false}
                          showHeader={false}
                          showHunkHeader={false}
                          showSigns={false}
                          lineNumberMode="single"
                          enableInlineComments
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <aside className="flex w-[320px] flex-col bg-surface-solid">
          <div className="border-b border-stroke/10 p-3">
            <input
              type="text"
              placeholder="Filter files..."
              className="w-full rounded-xl border border-stroke/10 bg-surface-solid px-3 py-2 text-xs text-text-2 placeholder:text-text-3 focus:border-stroke/30 focus:outline-none"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {flattened.map(({ node, depth }) => {
              const isDir = node.type === 'dir'
              const isExpanded = autoExpand || effectiveExpandedDirs.has(node.path)
              const isSelected = node.path === resolvedSelectedPath
              const indent = depth * 12
              return (
                <button
                  key={`${node.type}-${node.path}`}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors',
                    isSelected
                      ? 'bg-surface-hover/[0.12] text-text-1 font-medium'
                      : 'text-text-2 hover:bg-surface-hover/[0.08]'
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
                  <span className="flex items-center gap-2" style={{ paddingLeft: indent }}>
                    {isDir ? (
                      isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : (
                      <span className="w-[14px]" />
                    )}
                    {isDir ? (
                      isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />
                    ) : (
                      getFileIcon(node.path)
                    )}
                    <span className="truncate">{node.name}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </aside>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-stroke/10 px-6 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-1">
          <span>Uncommitted changes</span>
          <ChevronDown size={16} className="text-text-3" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-status-success">+{stats.additions}</span>
          <span className="text-xs text-status-error">-{stats.deletions}</span>
          <button
            className="rounded-full border border-stroke/20 bg-surface-hover/[0.08] px-3 py-1 text-xs font-semibold text-text-1"
          >
            Unstaged · {stats.filesChanged}
          </button>
          <button className="text-xs font-semibold text-text-3 hover:text-text-1">Staged</button>
          <button
            className="rounded-full border border-stroke/20 bg-surface-solid p-1.5 text-text-3 shadow-[var(--shadow-1)] hover:bg-surface-hover/[0.12] hover:text-text-1"
            onClick={() => showToast('Open in editor not wired yet', 'info')}
            title="Open in editor"
          >
            <FolderOpen size={14} />
          </button>
          <button
            className="rounded-full border border-stroke/20 bg-surface-solid p-1.5 text-text-3 shadow-[var(--shadow-1)] hover:bg-surface-hover/[0.12] hover:text-text-1"
            onClick={() => showToast('More actions not wired yet', 'info')}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">{renderMainContent()}</div>

      {diffText && fileDiffs.length > 0 && (
        <div className="flex items-center justify-center border-t border-stroke/10 bg-surface-solid px-6 py-3 text-xs">
          <div className="flex items-center rounded-full border border-stroke/20 bg-surface-solid shadow-[var(--shadow-1)] overflow-hidden">
            <button
              className="inline-flex items-center gap-1 px-4 py-2 font-semibold text-text-2 hover:bg-surface-hover/[0.1]"
              onClick={() => showToast('Revert all is not wired yet', 'info')}
            >
              <RotateCcw size={14} />
              Revert all
            </button>
            <div className="h-4 w-px bg-stroke/20" />
            <button
              className="inline-flex items-center gap-1 px-4 py-2 font-semibold text-text-2 hover:bg-surface-hover/[0.1]"
              onClick={() => showToast('Stage all is not wired yet', 'info')}
            >
              <Plus size={14} />
              Stage all
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
