import { useState, useMemo, useCallback } from 'react'
import {
  File,
  FileCode,
  FolderOpen,
  FolderClosed,
  Search,
  ChevronRight,
} from 'lucide-react'
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

/** Map file extension to icon color class */
function getFileIconColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'text-blue-400'
    case 'rs':
      return 'text-orange-400'
    case 'css':
    case 'scss':
      return 'text-purple-400'
    case 'json':
    case 'toml':
    case 'yaml':
    case 'yml':
      return 'text-yellow-400'
    case 'md':
    case 'txt':
      return 'text-text-3'
    case 'js':
    case 'jsx':
      return 'text-yellow-300'
    case 'html':
      return 'text-orange-300'
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

function TreeRow({
  node,
  depth,
  selectedPath,
  expandedDirs,
  onToggleDir,
  onSelectFile,
}: {
  node: TreeNode
  depth: number
  selectedPath: string | null
  expandedDirs: Set<string>
  onToggleDir: (path: string) => void
  onSelectFile: (path: string) => void
}) {
  const isExpanded = expandedDirs.has(node.path)
  const isSelected = selectedPath === node.path

  if (node.isDir) {
    return (
      <>
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
        {isExpanded &&
          node.children.map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expandedDirs={expandedDirs}
              onToggleDir={onToggleDir}
              onSelectFile={onSelectFile}
            />
          ))}
      </>
    )
  }

  const IconComponent = isCodeFile(node.name) ? FileCode : File
  const iconColor = getFileIconColor(node.name)

  return (
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
  )
}

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
      <div className="flex-1 overflow-y-auto py-1">
        {displayTree.length === 0 ? (
          <div className="px-3 py-6 text-center text-text-3 text-sm">
            {searchQuery ? 'No matching files' : 'No files found'}
          </div>
        ) : (
          displayTree.map((node) => (
            <TreeRow
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              expandedDirs={expandedDirs}
              onToggleDir={handleToggleDir}
              onSelectFile={onSelectFile}
            />
          ))
        )}
      </div>
    </div>
  )
}
