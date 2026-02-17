import { useState, useMemo, useCallback, type CSSProperties } from 'react'
import {
  File,
  FileCode,
  FolderOpen,
  FolderClosed,
  Search,
  ChevronRight,
} from 'lucide-react'
import { List } from 'react-window'
import { cn } from '../../lib/utils'
import { Input } from '../ui/Input'
import type { FileEntry } from '../../lib/api'

interface FileTreeProps {
  files: FileEntry[]
  selectedPath: string | null
  onSelectFile: (path: string) => void
  isLoading?: boolean
}

interface TreeNode {
  name: string
  path: string
  isDir: boolean
  children: TreeNode[]
}

/** A flattened row for virtualized rendering */
interface FlatRow {
  node: TreeNode
  depth: number
}

/** Map file extension to icon color class */
function getFileIconColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'text-primary'
    case 'rs':
      return 'text-primary'
    case 'css':
    case 'scss':
      return 'text-primary'
    case 'json':
    case 'toml':
    case 'yaml':
    case 'yml':
      return 'text-text-2'
    case 'md':
    case 'txt':
      return 'text-text-3'
    case 'js':
    case 'jsx':
      return 'text-primary'
    case 'html':
      return 'text-primary'
    default:
      return 'text-text-3'
  }
}

/** Check if the file is a code file (uses FileCode icon) */
function isCodeFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase()
  const codeExts = new Set([
    'ts', 'tsx', 'js', 'jsx', 'rs', 'py', 'go', 'java', 'c', 'cpp', 'h',
    'css', 'scss', 'html', 'vue', 'svelte', 'rb', 'php', 'swift', 'kt',
    'sh', 'bash', 'zsh', 'sql',
  ])
  return ext ? codeExts.has(ext) : false
}

/** Build a tree structure from flat file entries */
function buildTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode[] = []
  const dirMap = new Map<string, TreeNode>()

  // First pass: create all directory nodes
  for (const file of files) {
    if (file.isDir) {
      const node: TreeNode = {
        name: file.name,
        path: file.path,
        isDir: true,
        children: [],
      }
      dirMap.set(file.path, node)
    }
  }

  // Second pass: build hierarchy
  for (const file of files) {
    const node: TreeNode = file.isDir
      ? dirMap.get(file.path)!
      : { name: file.name, path: file.path, isDir: false, children: [] }

    const parentPath = file.path.includes('/')
      ? file.path.substring(0, file.path.lastIndexOf('/'))
      : null

    if (parentPath && dirMap.has(parentPath)) {
      dirMap.get(parentPath)!.children.push(node)
    } else {
      root.push(node)
    }
  }

  // Sort each level: directories first, then alphabetically
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    for (const n of nodes) {
      if (n.children.length > 0) sortNodes(n.children)
    }
  }
  sortNodes(root)

  return root
}

/** Filter tree nodes by search query */
function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const q = query.toLowerCase()
  const result: TreeNode[] = []

  for (const node of nodes) {
    if (node.isDir) {
      const filteredChildren = filterTree(node.children, query)
      if (filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren })
      }
    } else {
      if (node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q)) {
        result.push(node)
      }
    }
  }
  return result
}

/** Flatten tree into a list of rows based on expanded directories */
function flattenNodes(nodes: TreeNode[], expandedDirs: Set<string>, depth: number = 0): FlatRow[] {
  const rows: FlatRow[] = []
  for (const node of nodes) {
    rows.push({ node, depth })
    if (node.isDir && expandedDirs.has(node.path)) {
      rows.push(...flattenNodes(node.children, expandedDirs, depth + 1))
    }
  }
  return rows
}

/** Row height in pixels - matches the py-1 (4px top + 4px bottom) + text line height */
const ROW_HEIGHT = 28

/** Props passed via rowProps to each virtualized row */
interface FileRowCustomProps {
  flatRows: FlatRow[]
  selectedPath: string | null
  expandedDirs: Set<string>
  onToggleDir: (path: string) => void
  onSelectFile: (path: string) => void
}

function FileRowComponent({
  index,
  style,
  flatRows,
  selectedPath,
  expandedDirs,
  onToggleDir,
  onSelectFile,
}: {
  index: number
  style: CSSProperties
  ariaAttributes: {
    'aria-posinset': number
    'aria-setsize': number
    role: 'listitem'
  }
} & FileRowCustomProps) {
  const { node, depth } = flatRows[index]
  const isExpanded = expandedDirs.has(node.path)
  const isSelected = selectedPath === node.path

  if (node.isDir) {
    return (
      <div style={style}>
        <button
          type="button"
          className={cn(
            'file-tree-row flex items-center w-full gap-1.5 py-1 px-2 text-left text-sm',
            'hover:bg-hover/5 rounded-md transition-colors duration-100',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onToggleDir(node.path)}
        >
          <ChevronRight
            className={cn(
              'icon-xxs text-text-3 shrink-0 transition-transform duration-100',
              isExpanded && 'rotate-90'
            )}
          />
          {isExpanded ? (
            <FolderOpen className="icon-sm text-text-2 shrink-0" />
          ) : (
            <FolderClosed className="icon-sm text-text-3 shrink-0" />
          )}
          <span className="text-text-2 truncate">{node.name}</span>
        </button>
      </div>
    )
  }

  const IconComponent = isCodeFile(node.name) ? FileCode : File
  const iconColor = getFileIconColor(node.name)

  return (
    <div style={style}>
      <button
        type="button"
        className={cn(
          'file-tree-row flex items-center w-full gap-1.5 py-1 px-2 text-left text-sm',
          'hover:bg-hover/5 rounded-md transition-colors duration-100',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40',
          isSelected && 'bg-primary/10 text-text-1'
        )}
        style={{ paddingLeft: `${depth * 16 + 24}px` }}
        onClick={() => onSelectFile(node.path)}
      >
        <IconComponent className={cn('icon-sm shrink-0', iconColor)} />
        <span className={cn('truncate', isSelected ? 'text-text-1' : 'text-text-2')}>
          {node.name}
        </span>
      </button>
    </div>
  )
}

/** Threshold: only virtualize when there are many rows */
const VIRTUALIZATION_THRESHOLD = 50

export function FileTree({ files, selectedPath, onSelectFile, isLoading }: FileTreeProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => new Set())

  const tree = useMemo(() => buildTree(files), [files])

  const displayTree = useMemo(() => {
    if (!searchQuery.trim()) return tree
    return filterTree(tree, searchQuery.trim())
  }, [tree, searchQuery])

  const handleToggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const flatRows = useMemo(
    () => flattenNodes(displayTree, expandedDirs),
    [displayTree, expandedDirs]
  )

  const shouldVirtualize = flatRows.length > VIRTUALIZATION_THRESHOLD

  const rowProps: FileRowCustomProps = useMemo(
    () => ({
      flatRows,
      selectedPath,
      expandedDirs,
      onToggleDir: handleToggleDir,
      onSelectFile,
    }),
    [flatRows, selectedPath, expandedDirs, handleToggleDir, onSelectFile]
  )

  // Generate stable skeleton widths to prevent flickering on re-renders
  const skeletonWidths = useMemo(
    () => Array.from({ length: 8 }, (_, i) => 60 + (i * 7) % 30),
    []
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-6 rounded loading-shimmer"
            style={{ width: `${skeletonWidths[i]}%` }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="file-tree-root flex flex-col h-full">
      <div className="p-2 border-b border-stroke/15">
        <Input
          inputSize="sm"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="icon-xs" />}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        {flatRows.length === 0 ? (
          <div className="px-3 py-6 text-center text-text-3 text-sm">
            {searchQuery ? 'No matching files' : 'No files found'}
          </div>
        ) : shouldVirtualize ? (
          <List<FileRowCustomProps>
            style={{ height: '100%', width: '100%' }}
            rowCount={flatRows.length}
            rowHeight={ROW_HEIGHT}
            rowProps={rowProps}
            rowComponent={FileRowComponent}
            overscanCount={10}
            defaultHeight={ROW_HEIGHT * 10}
          />
        ) : (
          <div className="overflow-y-auto h-full py-1">
            {flatRows.map((row) => {
              const { node, depth } = row
              const isExpanded = expandedDirs.has(node.path)
              const isSelected = selectedPath === node.path

              if (node.isDir) {
                return (
                  <button
                    key={node.path}
                    type="button"
                    className={cn(
                      'file-tree-row flex items-center w-full gap-1.5 py-1 px-2 text-left text-sm',
                      'hover:bg-hover/5 rounded-md transition-colors duration-100',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40'
                    )}
                    style={{ paddingLeft: `${depth * 16 + 8}px` }}
                    onClick={() => handleToggleDir(node.path)}
                  >
                    <ChevronRight
                      className={cn(
                        'icon-xxs text-text-3 shrink-0 transition-transform duration-100',
                        isExpanded && 'rotate-90'
                      )}
                    />
                    {isExpanded ? (
                      <FolderOpen className="icon-sm text-text-2 shrink-0" />
                    ) : (
                      <FolderClosed className="icon-sm text-text-3 shrink-0" />
                    )}
                    <span className="text-text-2 truncate">{node.name}</span>
                  </button>
                )
              }

              const IconComponent = isCodeFile(node.name) ? FileCode : File
              const iconColor = getFileIconColor(node.name)

              return (
                <button
                  key={node.path}
                  type="button"
                  className={cn(
                    'file-tree-row flex items-center w-full gap-1.5 py-1 px-2 text-left text-sm',
                    'hover:bg-hover/5 rounded-md transition-colors duration-100',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40',
                    isSelected && 'bg-primary/10 text-text-1'
                  )}
                  style={{ paddingLeft: `${depth * 16 + 24}px` }}
                  onClick={() => onSelectFile(node.path)}
                >
                  <IconComponent className={cn('icon-sm shrink-0', iconColor)} />
                  <span className={cn('truncate', isSelected ? 'text-text-1' : 'text-text-2')}>
                    {node.name}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
