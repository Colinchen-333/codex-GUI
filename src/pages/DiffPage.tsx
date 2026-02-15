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
  RotateCcw,
  Plus,
  RefreshCw,
  Copy,
  Code2,
  Check,
  Minus,
  GitCommit,
} from 'lucide-react'
import { DiffView, parseDiff, type FileDiff } from '../components/ui/DiffView'
import { cn } from '../lib/utils'
import { parseError } from '../lib/errorUtils'
import { projectApi, type GitFileStatus } from '../lib/api'
import { useProjectsStore } from '../stores/projects'
import { useToast } from '../components/ui/Toast'
import { copyTextToClipboard } from '../lib/clipboard'
import { openInVSCode } from '../lib/hostActions'
import { isTauriAvailable } from '../lib/tauri'
import { dispatchAppEvent, APP_EVENTS } from '../lib/appEvents'
import { IconButton } from '../components/ui/IconButton'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

type LoadState = 'idle' | 'loading' | 'error' | 'not-git' | 'empty'
type DiffMode = 'unstaged' | 'staged'

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
  const tauriAvailable = isTauriAvailable()

  const [diffMode, setDiffMode] = useState<DiffMode>('unstaged')
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [diffText, setDiffText] = useState<string>('')
  const [fileDiffs, setFileDiffs] = useState<FileDiff[]>([])
  const [gitStatus, setGitStatus] = useState<GitFileStatus[]>([])
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set())
  const fileRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const filterInputRef = useRef<HTMLInputElement | null>(null)

  const fetchDiff = useCallback(async () => {
    if (!selectedProject) {
      setLoadState('empty')
      setDiffText('')
      setFileDiffs([])
      setGitStatus([])
      return
    }

    setLoadState('loading')
    try {
      const result =
        diffMode === 'staged'
          ? await projectApi.getGitDiffStaged(selectedProject.path)
          : await projectApi.getGitDiff(selectedProject.path)
      if (!result.isGitRepo) {
        setLoadState('not-git')
        setDiffText('')
        setFileDiffs([])
        setGitStatus([])
        return
      }

      try {
        const status = await projectApi.gitStatus(selectedProject.path)
        setGitStatus(status)
      } catch {
        setGitStatus([])
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
      setGitStatus([])
      console.error('Failed to load diff:', parseError(error))
    }
  }, [diffMode, selectedProject])

  useEffect(() => {
    void fetchDiff()
  }, [fetchDiff])

  const requireTauri = useCallback((): boolean => {
    if (tauriAvailable) return true
    showToast('Unavailable in web mode', 'error')
    return false
  }, [showToast, tauriAvailable])

  const handleCopyDiff = useCallback(async () => {
    if (!diffText) return
    try {
      const ok = await copyTextToClipboard(diffText)
      if (!ok) throw new Error('Clipboard unavailable')
      showToast('Diff copied', 'success')
    } catch {
      showToast('Copy failed', 'error')
    }
  }, [diffText, showToast])

  const handleOpenInVSCode = useCallback(async () => {
    if (!selectedProject) return
    if (!requireTauri()) return
    try {
      await openInVSCode(selectedProject.path)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to open in VS Code', 'error')
    }
  }, [requireTauri, selectedProject, showToast])

  const handleOpenFileInVSCode = useCallback(async (relativePath: string) => {
    if (!selectedProject) return
    if (!requireTauri()) return
    const absolutePath = `${selectedProject.path}/${relativePath}`
    try {
      await openInVSCode(absolutePath)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to open file in VS Code', 'error')
    }
  }, [requireTauri, selectedProject, showToast])

  const statusByPath = useMemo(() => {
    const map = new Map<string, GitFileStatus>()
    for (const file of gitStatus) {
      map.set(file.path, file)
    }
    return map
  }, [gitStatus])

  const copyPath = useCallback(async (path: string) => {
    try {
      const ok = await copyTextToClipboard(path)
      if (!ok) throw new Error('Clipboard unavailable')
      showToast('Path copied', 'success')
    } catch {
      showToast('Copy failed', 'error')
    }
  }, [showToast])

  const stageOrUnstageFile = useCallback(async (path: string) => {
    if (!selectedProject) return
    if (!requireTauri()) return

    try {
      if (diffMode === 'staged') {
        await projectApi.gitUnstageFiles(selectedProject.path, [path])
        showToast('Unstaged file', 'success')
      } else {
        await projectApi.gitStageFiles(selectedProject.path, [path])
        showToast('Staged file', 'success')
      }
      await fetchDiff()
    } catch (err) {
      showToast(`${diffMode === 'staged' ? 'Unstage' : 'Stage'} failed: ${parseError(err)}`, 'error')
    }
  }, [diffMode, fetchDiff, requireTauri, selectedProject, showToast])

  const handleStageAll = useCallback(async () => {
    if (!selectedProject) return
    if (!requireTauri()) return
    try {
      const status = await projectApi.gitStatus(selectedProject.path)
      const filesToStage = status.filter((f) => !f.isStaged).map((f) => f.path)
      if (filesToStage.length === 0) {
        showToast('Nothing to stage', 'info')
        return
      }
      await projectApi.gitStageFiles(selectedProject.path, filesToStage)
      showToast(`Staged ${filesToStage.length} file(s)`, 'success')
      await fetchDiff()
    } catch (err) {
      showToast(`Stage all failed: ${parseError(err)}`, 'error')
    }
  }, [fetchDiff, requireTauri, selectedProject, showToast])

  const handleUnstageAll = useCallback(async () => {
    if (!selectedProject) return
    if (!requireTauri()) return
    try {
      const status = await projectApi.gitStatus(selectedProject.path)
      const filesToUnstage = status.filter((f) => f.isStaged).map((f) => f.path)
      if (filesToUnstage.length === 0) {
        showToast('Nothing to unstage', 'info')
        return
      }
      await projectApi.gitUnstageFiles(selectedProject.path, filesToUnstage)
      showToast(`Unstaged ${filesToUnstage.length} file(s)`, 'success')
      await fetchDiff()
    } catch (err) {
      showToast(`Unstage all failed: ${parseError(err)}`, 'error')
    }
  }, [fetchDiff, requireTauri, selectedProject, showToast])

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

  const focusFilter = useCallback(() => {
    filterInputRef.current?.focus()
    filterInputRef.current?.select()
  }, [])

  const copySelectedPath = useCallback(async () => {
    if (!resolvedSelectedPath) {
      showToast('No file selected', 'info')
      return
    }
    await copyPath(resolvedSelectedPath)
  }, [copyPath, resolvedSelectedPath, showToast])

  const openSelected = useCallback(async () => {
    if (resolvedSelectedPath) {
      await handleOpenFileInVSCode(resolvedSelectedPath)
      return
    }
    await handleOpenInVSCode()
  }, [handleOpenFileInVSCode, handleOpenInVSCode, resolvedSelectedPath])

  const toggleStageSelected = useCallback(async () => {
    if (!resolvedSelectedPath) {
      showToast('No file selected', 'info')
      return
    }
    await stageOrUnstageFile(resolvedSelectedPath)
  }, [resolvedSelectedPath, showToast, stageOrUnstageFile])

  const refresh = useCallback(() => {
    void fetchDiff()
  }, [fetchDiff])

  const selectRelativeFile = useCallback((delta: number) => {
    if (visibleDiffs.length === 0) return
    const current = resolvedSelectedPath
    const currentIndex = current ? visibleDiffs.findIndex((d) => d.path === current) : -1
    const startIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = (startIndex + delta + visibleDiffs.length) % visibleDiffs.length
    const nextPath = visibleDiffs[nextIndex]?.path
    if (nextPath) {
      setSelectedPath(nextPath)
    }
  }, [resolvedSelectedPath, visibleDiffs])

  const selectFirstFile = useCallback(() => {
    const first = visibleDiffs[0]?.path
    if (first) setSelectedPath(first)
  }, [visibleDiffs])

  const selectLastFile = useCallback(() => {
    const last = visibleDiffs[visibleDiffs.length - 1]?.path
    if (last) setSelectedPath(last)
  }, [visibleDiffs])

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: '/', description: 'Focus filter', handler: focusFilter },
        { key: 'r', description: 'Refresh diff', handler: refresh },
        { key: 'j', description: 'Next file', handler: () => selectRelativeFile(1) },
        { key: 'k', description: 'Previous file', handler: () => selectRelativeFile(-1) },
        { key: 'g', description: 'First file', handler: selectFirstFile },
        { key: 'g', shift: true, description: 'Last file', handler: selectLastFile },
        { key: 'c', description: 'Copy selected path', handler: () => void copySelectedPath() },
        { key: 'o', description: 'Open selected file in VS Code', handler: () => void openSelected() },
        { key: 's', description: 'Stage/unstage selected file', handler: () => void toggleStageSelected() },
      ],
      [
        copySelectedPath,
        focusFilter,
        openSelected,
        refresh,
        selectFirstFile,
        selectLastFile,
        selectRelativeFile,
        toggleStageSelected,
      ]
    )
  )

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
              const status = statusByPath.get(diff.path) ?? null
              const showStage = diffMode === 'unstaged'

              return (
                <div
                  key={diff.path}
                  ref={(node) => {
                    fileRefs.current[diff.path] = node
                  }}
                  className="rounded-2xl border border-stroke/10 bg-surface-solid shadow-[var(--shadow-1)] overflow-hidden"
                >
                  <div
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left bg-surface-hover/[0.06]',
                      'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    )}
                    role="button"
                    tabIndex={0}
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
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
                      }
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2 text-sm text-text-1">
                      <span className="truncate font-semibold">{diff.path}</span>
                      <span className="text-xs font-semibold text-status-success">+{diffStats.additions}</span>
                      <span className="text-xs font-semibold text-status-error">-{diffStats.deletions}</span>
                      {status?.isStaged && (
                        <span className="rounded-xs border border-stroke/20 bg-surface-hover/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-text-2">
                          STAGED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          void handleOpenFileInVSCode(diff.path)
                        }}
                        disabled={!isTauriAvailable()}
                        aria-label="Open file in VS Code"
                        title="Open file in VS Code"
                      >
                        <Code2 size={14} />
                      </IconButton>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          void copyPath(diff.path)
                        }}
                        aria-label="Copy file path"
                        title="Copy file path"
                      >
                        <Copy size={14} />
                      </IconButton>
                      <IconButton
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          void stageOrUnstageFile(diff.path)
                        }}
                        disabled={!isTauriAvailable()}
                        aria-label={showStage ? 'Stage file' : 'Unstage file'}
                        title={showStage ? 'Stage file (git add)' : 'Unstage file (git reset HEAD --)'}
                      >
                        {showStage ? <Check size={14} /> : <Minus size={14} />}
                      </IconButton>
                      <ChevronUp
                        size={14}
                        className={cn('text-text-3 transition-transform', isCollapsed && 'rotate-180')}
                      />
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="border-t border-stroke/10">
                      {isLarge ? (
                        <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-text-2 bg-surface-hover/[0.04]">
                          <span className="min-w-0 flex-1 truncate">This file is too large to display here.</span>
                          <button
                            className="inline-flex items-center gap-1 text-text-2 hover:text-text-1"
                            onClick={() => void handleOpenFileInVSCode(diff.path)}
                          >
                            Open in VS Code
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
                            onClick={() => void handleOpenFileInVSCode(diff.path)}
                          >
                            Open in VS Code
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
              ref={filterInputRef}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
	            {flattened.map(({ node, depth }) => {
	              const isDir = node.type === 'dir'
	              const isExpanded = autoExpand || effectiveExpandedDirs.has(node.path)
	              const isSelected = node.path === resolvedSelectedPath
	              const status = !isDir ? statusByPath.get(node.path) ?? null : null
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
	                    {!isDir && status?.isStaged && (
	                      <span className="ml-1 rounded-xs border border-stroke/20 bg-surface-hover/[0.08] px-1 py-0.5 text-[10px] font-semibold text-text-3">
	                        S
	                      </span>
	                    )}
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
          <span>{diffMode === 'staged' ? 'Staged changes' : 'Unstaged changes'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-status-success">+{stats.additions}</span>
          <span className="text-xs text-status-error">-{stats.deletions}</span>
          <span className="text-xs text-text-3">{stats.filesChanged} file(s)</span>
          <button
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold',
              diffMode === 'unstaged'
                ? 'border-stroke/20 bg-surface-hover/[0.08] text-text-1'
                : 'border-transparent bg-transparent text-text-3 hover:text-text-1'
            )}
            onClick={() => setDiffMode('unstaged')}
          >
            Unstaged
          </button>
          <button
            className={cn(
              'text-xs font-semibold',
              diffMode === 'staged' ? 'text-text-1' : 'text-text-3 hover:text-text-1'
            )}
            onClick={() => setDiffMode('staged')}
          >
            Staged
          </button>
          <button
            className="rounded-full border border-stroke/20 bg-surface-solid p-1.5 text-text-3 shadow-[var(--shadow-1)] hover:bg-surface-hover/[0.12] hover:text-text-1"
            onClick={() => void fetchDiff()}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            className="rounded-full border border-stroke/20 bg-surface-solid p-1.5 text-text-3 shadow-[var(--shadow-1)] hover:bg-surface-hover/[0.12] hover:text-text-1"
            onClick={() => void handleCopyDiff()}
            title="Copy diff"
            disabled={!diffText}
          >
            <Copy size={14} />
          </button>
          <button
            className="rounded-full border border-stroke/20 bg-surface-solid p-1.5 text-text-3 shadow-[var(--shadow-1)] hover:bg-surface-hover/[0.12] hover:text-text-1 disabled:opacity-50 disabled:pointer-events-none"
            onClick={() => void handleOpenInVSCode()}
            disabled={!tauriAvailable}
            title="Open in VS Code"
          >
            <Code2 size={14} />
          </button>
          <button
            className="rounded-full border border-stroke/20 bg-surface-solid p-1.5 text-text-3 shadow-[var(--shadow-1)] hover:bg-surface-hover/[0.12] hover:text-text-1 disabled:opacity-50 disabled:pointer-events-none"
            onClick={() => dispatchAppEvent(APP_EVENTS.OPEN_COMMIT_DIALOG)}
            disabled={!tauriAvailable}
            title={tauriAvailable ? 'Commit' : 'Unavailable in web mode'}
          >
            <GitCommit size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">{renderMainContent()}</div>

      {diffText && fileDiffs.length > 0 && (
        <div className="flex items-center justify-center border-t border-stroke/10 bg-surface-solid px-6 py-3 text-xs">
          <div className="flex items-center rounded-full border border-stroke/20 bg-surface-solid shadow-[var(--shadow-1)] overflow-hidden">
            <button
              className="inline-flex items-center gap-1 px-4 py-2 font-semibold text-text-2 hover:bg-surface-hover/[0.1] disabled:opacity-50 disabled:pointer-events-none"
              onClick={() => dispatchAppEvent(APP_EVENTS.OPEN_COMMIT_DIALOG)}
              disabled={!tauriAvailable}
            >
              <GitCommit size={14} />
              Commit
            </button>
            <div className="h-4 w-px bg-stroke/20" />
            <button
              className="inline-flex items-center gap-1 px-4 py-2 font-semibold text-text-2 hover:bg-surface-hover/[0.1] disabled:opacity-50 disabled:pointer-events-none"
              onClick={() => {
                if (diffMode === 'staged') void handleUnstageAll()
                else void handleStageAll()
              }}
              disabled={!tauriAvailable}
            >
              {diffMode === 'staged' ? <RotateCcw size={14} /> : <Plus size={14} />}
              {diffMode === 'staged' ? 'Unstage all' : 'Stage all'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
