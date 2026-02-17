import { describe, it, expect } from 'vitest'
import { parseGitDiff, buildFileTree, flattenTree, type FileNode } from '../gitDiffUtils'

// Mock the DiffView parseDiff function
vi.mock('../../components/ui/DiffView', () => ({
  parseDiff: vi.fn((section: string) => {
    // Return minimal hunks based on presence of @@ lines
    const hunkMatches = section.match(/@@ .+? @@/g)
    return (hunkMatches || []).map(() => ({
      oldStart: 1,
      oldLines: 1,
      newStart: 1,
      newLines: 1,
      lines: [],
    }))
  }),
}))

import { vi } from 'vitest'

describe('parseGitDiff', () => {
  it('parses a simple file modification', () => {
    const diff = `diff --git a/src/main.ts b/src/main.ts
index abc..def 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,3 +1,4 @@
 line1
+added line
 line2
 line3`

    const result = parseGitDiff(diff)

    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('src/main.ts')
    expect(result[0].kind).toBe('modify')
  })

  it('parses a new file addition', () => {
    const diff = `diff --git a/newfile.ts b/newfile.ts
new file mode 100644
--- /dev/null
+++ b/newfile.ts
@@ -0,0 +1,3 @@
+line1
+line2
+line3`

    const result = parseGitDiff(diff)

    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('newfile.ts')
    expect(result[0].kind).toBe('add')
  })

  it('parses a file deletion', () => {
    const diff = `diff --git a/old.ts b/old.ts
deleted file mode 100644
--- a/old.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-line1
-line2
-line3`

    const result = parseGitDiff(diff)

    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('old.ts')
    expect(result[0].kind).toBe('delete')
  })

  it('parses a file rename', () => {
    const diff = `diff --git a/old-name.ts b/new-name.ts
similarity index 90%
rename from old-name.ts
rename to new-name.ts
--- a/old-name.ts
+++ b/new-name.ts
@@ -1,3 +1,3 @@
 line1
-old line
+new line
 line3`

    const result = parseGitDiff(diff)

    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe('rename')
    expect(result[0].path).toBe('new-name.ts')
    expect(result[0].oldPath).toBe('old-name.ts')
  })

  it('parses multiple files in a single diff', () => {
    const diff = `diff --git a/file1.ts b/file1.ts
--- a/file1.ts
+++ b/file1.ts
@@ -1,3 +1,3 @@
 a
-b
+c
 d
diff --git a/file2.ts b/file2.ts
new file mode 100644
--- /dev/null
+++ b/file2.ts
@@ -0,0 +1 @@
+new file`

    const result = parseGitDiff(diff)

    expect(result).toHaveLength(2)
    expect(result[0].path).toBe('file1.ts')
    expect(result[0].kind).toBe('modify')
    expect(result[1].path).toBe('file2.ts')
    expect(result[1].kind).toBe('add')
  })

  it('returns empty array for empty diff', () => {
    expect(parseGitDiff('')).toEqual([])
  })

  it('returns empty array for diff with no file sections', () => {
    expect(parseGitDiff('some random text\nwithout diff markers')).toEqual([])
  })

  it('stores raw section content', () => {
    const diff = `diff --git a/test.ts b/test.ts
--- a/test.ts
+++ b/test.ts
@@ -1 +1 @@
-old
+new`

    const result = parseGitDiff(diff)
    expect(result[0].raw).toContain('diff --git')
    expect(result[0].raw).toContain('-old')
    expect(result[0].raw).toContain('+new')
  })
})

describe('buildFileTree', () => {
  function makeDiff(path: string, kind: 'add' | 'modify' | 'delete' | 'rename' = 'modify') {
    return { path, kind, hunks: [], raw: '' }
  }

  it('creates flat file nodes for root-level files', () => {
    const tree = buildFileTree([makeDiff('file1.ts'), makeDiff('file2.ts')])

    expect(tree).toHaveLength(2)
    expect(tree[0].type).toBe('file')
    expect(tree[0].name).toBe('file1.ts')
    expect(tree[1].name).toBe('file2.ts')
  })

  it('creates nested directory nodes', () => {
    const tree = buildFileTree([
      makeDiff('src/components/Button.tsx'),
      makeDiff('src/components/Input.tsx'),
      makeDiff('src/lib/utils.ts'),
    ])

    expect(tree).toHaveLength(1) // 'src' directory
    expect(tree[0].type).toBe('dir')
    expect(tree[0].name).toBe('src')

    const srcChildren = tree[0].children!
    expect(srcChildren).toHaveLength(2) // 'components' and 'lib'
  })

  it('sorts directories before files', () => {
    const tree = buildFileTree([
      makeDiff('readme.md'),
      makeDiff('src/index.ts'),
    ])

    expect(tree[0].type).toBe('dir')
    expect(tree[0].name).toBe('src')
    expect(tree[1].type).toBe('file')
    expect(tree[1].name).toBe('readme.md')
  })

  it('sorts items alphabetically within same type', () => {
    const tree = buildFileTree([
      makeDiff('z-file.ts'),
      makeDiff('a-file.ts'),
      makeDiff('m-file.ts'),
    ])

    expect(tree[0].name).toBe('a-file.ts')
    expect(tree[1].name).toBe('m-file.ts')
    expect(tree[2].name).toBe('z-file.ts')
  })

  it('attaches diff to file nodes', () => {
    const diff = makeDiff('test.ts', 'add')
    const tree = buildFileTree([diff])

    expect(tree[0].diff).toBe(diff)
  })

  it('attaches fileStatus from statusMap', () => {
    const statusMap = new Map([
      ['src/file.ts', { path: 'src/file.ts', status: 'M', isStaged: true, statusLabel: 'Modified' }],
    ])

    const tree = buildFileTree([makeDiff('src/file.ts')], statusMap)

    const srcDir = tree[0]
    const fileNode = srcDir.children![0]
    expect(fileNode.fileStatus).toEqual({
      path: 'src/file.ts',
      status: 'M',
      isStaged: true,
      statusLabel: 'Modified',
    })
  })

  it('returns empty array for empty diffs', () => {
    expect(buildFileTree([])).toEqual([])
  })
})

describe('flattenTree', () => {
  function makeFileNode(name: string, path: string): FileNode {
    return { type: 'file', name, path }
  }

  function makeDirNode(name: string, path: string, children: FileNode[]): FileNode {
    return { type: 'dir', name, path, children }
  }

  it('flattens a simple list of files', () => {
    const nodes = [makeFileNode('a.ts', 'a.ts'), makeFileNode('b.ts', 'b.ts')]

    const result = flattenTree(nodes, new Set(), false)

    expect(result).toHaveLength(2)
    expect(result[0].depth).toBe(0)
    expect(result[1].depth).toBe(0)
  })

  it('includes children when directory is expanded', () => {
    const tree = [
      makeDirNode('src', 'src', [
        makeFileNode('index.ts', 'src/index.ts'),
      ]),
    ]

    const result = flattenTree(tree, new Set(['src']), false)

    expect(result).toHaveLength(2)
    expect(result[0].node.name).toBe('src')
    expect(result[0].depth).toBe(0)
    expect(result[1].node.name).toBe('index.ts')
    expect(result[1].depth).toBe(1)
  })

  it('hides children when directory is collapsed', () => {
    const tree = [
      makeDirNode('src', 'src', [
        makeFileNode('index.ts', 'src/index.ts'),
      ]),
    ]

    const result = flattenTree(tree, new Set(), false)

    expect(result).toHaveLength(1)
    expect(result[0].node.name).toBe('src')
  })

  it('expands all directories when autoExpand is true', () => {
    const tree = [
      makeDirNode('src', 'src', [
        makeDirNode('lib', 'src/lib', [
          makeFileNode('utils.ts', 'src/lib/utils.ts'),
        ]),
      ]),
    ]

    const result = flattenTree(tree, new Set(), true)

    expect(result).toHaveLength(3)
    expect(result[0].depth).toBe(0)
    expect(result[1].depth).toBe(1)
    expect(result[2].depth).toBe(2)
  })

  it('handles deeply nested structures', () => {
    const tree = [
      makeDirNode('a', 'a', [
        makeDirNode('b', 'a/b', [
          makeDirNode('c', 'a/b/c', [
            makeFileNode('deep.ts', 'a/b/c/deep.ts'),
          ]),
        ]),
      ]),
    ]

    const result = flattenTree(tree, new Set(['a', 'a/b', 'a/b/c']), false)

    expect(result).toHaveLength(4)
    expect(result[3].depth).toBe(3)
    expect(result[3].node.name).toBe('deep.ts')
  })

  it('returns empty array for empty input', () => {
    expect(flattenTree([], new Set(), false)).toEqual([])
  })
})
