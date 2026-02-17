/**
 * Shared git diff parsing and file tree utilities.
 * Used by ReviewPane and DiffPage.
 */

import { parseDiff, type FileDiff } from '../components/ui/DiffView'
import type { GitFileStatus } from './api'

// ==================== Types ====================

export type FileNode = {
  type: 'dir' | 'file'
  name: string
  path: string
  children?: FileNode[]
  diff?: FileDiff
  fileStatus?: GitFileStatus
}

export type FlattenedNode = {
  node: FileNode
  depth: number
}

// ==================== Diff Parsing ====================

export function parseGitDiff(diff: string): FileDiff[] {
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

export function buildFileTree(diffs: FileDiff[], statusMap?: Map<string, GitFileStatus>): FileNode[] {
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

export function flattenTree(
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
