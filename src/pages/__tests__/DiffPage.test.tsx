import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DiffPage } from '../DiffPage'

// Mock scrollIntoView which is not available in jsdom
Element.prototype.scrollIntoView = vi.fn()

// Mock external dependencies
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

const mockGetGitDiff = vi.fn().mockResolvedValue({ isGitRepo: true, diff: '' })
const mockGetGitDiffStaged = vi.fn().mockResolvedValue({ isGitRepo: true, diff: '' })
const mockGitStatusFn = vi.fn().mockResolvedValue([])
const mockGitStageFiles = vi.fn().mockResolvedValue(undefined)
const mockGitUnstageFiles = vi.fn().mockResolvedValue(undefined)

vi.mock('../../lib/api', () => ({
  projectApi: {
    getGitDiff: (...args: unknown[]) => mockGetGitDiff(...args),
    getGitDiffStaged: (...args: unknown[]) => mockGetGitDiffStaged(...args),
    gitStatus: (...args: unknown[]) => mockGitStatusFn(...args),
    gitStageFiles: (...args: unknown[]) => mockGitStageFiles(...args),
    gitUnstageFiles: (...args: unknown[]) => mockGitUnstageFiles(...args),
  },
}))

vi.mock('../../stores/projects', () => ({
  useProjectsStore: vi.fn((selector) => {
    const state = {
      selectedProjectId: 'proj-1',
      projects: [{ id: 'proj-1', path: '/test/project' }],
    }
    return typeof selector === 'function' ? selector(state) : state
  }),
}))

vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}))

vi.mock('../../components/ui/DiffView', () => ({
  DiffView: ({ diff }: { diff: { path: string } }) => <div data-testid={`diff-view-${diff.path}`}>{diff.path}</div>,
}))

vi.mock('../../lib/gitDiffUtils', () => ({
  parseGitDiff: vi.fn((raw: string) => {
    if (!raw.trim()) return []
    // Return mock parsed diffs based on the content
    return [
      {
        path: 'src/app.ts',
        hunks: [
          {
            header: '@@ -1,3 +1,5 @@',
            lines: [
              { type: 'context', content: 'line 1' },
              { type: 'add', content: 'added line 1' },
              { type: 'add', content: 'added line 2' },
              { type: 'remove', content: 'removed line' },
            ],
          },
        ],
      },
      {
        path: 'src/utils.ts',
        hunks: [
          {
            header: '@@ -5,2 +5,3 @@',
            lines: [
              { type: 'add', content: 'new util' },
            ],
          },
        ],
      },
    ]
  }),
  buildFileTree: vi.fn(() => []),
  flattenTree: vi.fn(() => []),
}))

vi.mock('../../lib/clipboard', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(true),
}))

vi.mock('../../lib/hostActions', () => ({
  openInVSCode: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../lib/tauri', () => ({
  isTauriAvailable: vi.fn(() => true),
}))

vi.mock('../../lib/appEvents', () => ({
  dispatchAppEvent: vi.fn(),
  APP_EVENTS: {
    OPEN_COMMIT_DIALOG: 'open-commit-dialog',
  },
}))

vi.mock('../../components/ui/IconButton', () => ({
  IconButton: ({ children, onClick, ...props }: React.PropsWithChildren<{ onClick?: (e: React.MouseEvent) => void }>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}))

vi.mock('../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}))

vi.mock('../../lib/errorUtils', () => ({
  parseError: (err: unknown) => err instanceof Error ? err.message : String(err),
  logError: vi.fn(),
}))

vi.mock('../../lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

describe('DiffPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetGitDiff.mockResolvedValue({ isGitRepo: true, diff: '' })
    mockGetGitDiffStaged.mockResolvedValue({ isGitRepo: true, diff: '' })
    mockGitStatusFn.mockResolvedValue([])
  })

  describe('rendering', () => {
    it('renders the page header', () => {
      render(<DiffPage />)
      expect(screen.getByText('Unstaged changes')).toBeInTheDocument()
    })

    it('renders mode toggle buttons', () => {
      render(<DiffPage />)
      expect(screen.getByText('Unstaged')).toBeInTheDocument()
      expect(screen.getByText('Staged')).toBeInTheDocument()
    })

    it('renders stat counters', () => {
      render(<DiffPage />)
      expect(screen.getByText(/0 file/)).toBeInTheDocument()
    })

    it('renders refresh button', () => {
      render(<DiffPage />)
      expect(screen.getByTitle('Refresh')).toBeInTheDocument()
    })

    it('renders copy diff button', () => {
      render(<DiffPage />)
      expect(screen.getByTitle('Copy diff')).toBeInTheDocument()
    })

    it('renders open in VS Code button', () => {
      render(<DiffPage />)
      expect(screen.getByTitle('Open in VS Code')).toBeInTheDocument()
    })

    it('renders commit button', () => {
      render(<DiffPage />)
      expect(screen.getByTitle(/Commit/)).toBeInTheDocument()
    })
  })

  describe('mode switching', () => {
    it('starts in unstaged mode', () => {
      render(<DiffPage />)
      expect(screen.getByText('Unstaged changes')).toBeInTheDocument()
    })

    it('switches to staged mode on click', async () => {
      render(<DiffPage />)
      fireEvent.click(screen.getByText('Staged'))
      await waitFor(() => {
        expect(screen.getByText('Staged changes')).toBeInTheDocument()
      })
    })

    it('switches back to unstaged mode', async () => {
      render(<DiffPage />)
      fireEvent.click(screen.getByText('Staged'))
      await waitFor(() => expect(screen.getByText('Staged changes')).toBeInTheDocument())
      fireEvent.click(screen.getByText('Unstaged'))
      await waitFor(() => expect(screen.getByText('Unstaged changes')).toBeInTheDocument())
    })

    it('fetches staged diff when switching to staged mode', async () => {
      render(<DiffPage />)
      fireEvent.click(screen.getByText('Staged'))
      await waitFor(() => {
        expect(mockGetGitDiffStaged).toHaveBeenCalledWith('/test/project')
      })
    })
  })

  describe('loading states', () => {
    it('shows empty state when no diff data', async () => {
      render(<DiffPage />)
      await waitFor(() => {
        expect(screen.getByText('No diff data available.')).toBeInTheDocument()
      })
    })

    it('shows not-git state when not a git repository', async () => {
      mockGetGitDiff.mockResolvedValue({ isGitRepo: false, diff: '' })
      render(<DiffPage />)
      await waitFor(() => {
        expect(screen.getByText('This workspace is not a git repository.')).toBeInTheDocument()
      })
    })

    it('shows error state on API failure', async () => {
      mockGetGitDiff.mockRejectedValue(new Error('Network error'))
      render(<DiffPage />)
      await waitFor(() => {
        expect(screen.getByText('Failed to decode diff data.')).toBeInTheDocument()
      })
    })

    it('shows diff content when data is available', async () => {
      mockGetGitDiff.mockResolvedValue({
        isGitRepo: true,
        diff: 'diff --git a/src/app.ts b/src/app.ts\n--- a/src/app.ts\n+++ b/src/app.ts\n@@ -1,3 +1,5 @@',
      })
      render(<DiffPage />)
      await waitFor(() => {
        expect(screen.getByTestId('diff-view-src/app.ts')).toBeInTheDocument()
      })
    })
  })

  describe('diff display with data', () => {
    beforeEach(() => {
      mockGetGitDiff.mockResolvedValue({
        isGitRepo: true,
        diff: 'diff --git a/src/app.ts b/src/app.ts\nindex abc..def 100644',
      })
    })

    it('renders file headers with stats', async () => {
      render(<DiffPage />)
      await waitFor(() => {
        const elements = screen.getAllByText('src/app.ts')
        expect(elements.length).toBeGreaterThan(0)
      })
    })

    it('shows diff stats per file', async () => {
      render(<DiffPage />)
      await waitFor(() => {
        // Stats for src/app.ts: +2 additions, -1 deletion
        const additionElements = screen.getAllByText('+2')
        expect(additionElements.length).toBeGreaterThan(0)
      })
    })

    it('renders diff views for each file', async () => {
      render(<DiffPage />)
      await waitFor(() => {
        expect(screen.getByTestId('diff-view-src/app.ts')).toBeInTheDocument()
        expect(screen.getByTestId('diff-view-src/utils.ts')).toBeInTheDocument()
      })
    })

    it('renders file action buttons (VS Code, copy, stage)', async () => {
      render(<DiffPage />)
      await waitFor(() => {
        const openButtons = screen.getAllByLabelText('Open file in VS Code')
        expect(openButtons.length).toBeGreaterThan(0)
        const copyButtons = screen.getAllByLabelText('Copy file path')
        expect(copyButtons.length).toBeGreaterThan(0)
        const stageButtons = screen.getAllByLabelText('Stage file')
        expect(stageButtons.length).toBeGreaterThan(0)
      })
    })

    it('shows bottom action bar with Commit and Stage all', async () => {
      render(<DiffPage />)
      await waitFor(() => {
        const commitButtons = screen.getAllByText('Commit')
        expect(commitButtons.length).toBeGreaterThan(0)
        expect(screen.getByText('Stage all')).toBeInTheDocument()
      })
    })
  })

  describe('refresh', () => {
    it('re-fetches diff when refresh is clicked', async () => {
      render(<DiffPage />)
      await waitFor(() => expect(mockGetGitDiff).toHaveBeenCalled())
      const callCountBefore = mockGetGitDiff.mock.calls.length
      fireEvent.click(screen.getByTitle('Refresh'))
      await waitFor(() => expect(mockGetGitDiff.mock.calls.length).toBeGreaterThan(callCountBefore))
    })
  })

  describe('copy diff', () => {
    it('copy button is disabled when no diff text', () => {
      render(<DiffPage />)
      const copyBtn = screen.getByTitle('Copy diff')
      expect(copyBtn).toBeDisabled()
    })
  })

  describe('file sidebar', () => {
    beforeEach(() => {
      mockGetGitDiff.mockResolvedValue({
        isGitRepo: true,
        diff: 'diff --git a/src/app.ts b/src/app.ts\nsome diff content',
      })
    })

    it('renders the filter input', async () => {
      render(<DiffPage />)
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Filter files...')).toBeInTheDocument()
      })
    })

    it('renders hotkey hints', async () => {
      render(<DiffPage />)
      await waitFor(() => {
        expect(screen.getByText(/Hotkeys:/)).toBeInTheDocument()
      })
    })

    it('filter input accepts text', async () => {
      render(<DiffPage />)
      await waitFor(() => {
        const input = screen.getByPlaceholderText('Filter files...')
        fireEvent.change(input, { target: { value: 'app' } })
        expect(input).toHaveValue('app')
      })
    })

    it('filter input has keyDown handler for Escape', async () => {
      render(<DiffPage />)
      await waitFor(() => expect(screen.getByPlaceholderText('Filter files...')).toBeInTheDocument())
      const input = screen.getByPlaceholderText('Filter files...')
      // Verify input responds to keyboard events without throwing
      fireEvent.keyDown(input, { key: 'Escape' })
      fireEvent.keyDown(input, { key: 'a' })
    })
  })

  describe('staging operations', () => {
    beforeEach(() => {
      mockGetGitDiff.mockResolvedValue({
        isGitRepo: true,
        diff: 'diff --git a/src/app.ts b/src/app.ts\nsome content',
      })
      mockGitStatusFn.mockResolvedValue([
        { path: 'src/app.ts', status: 'M', isStaged: false },
      ])
    })

    it('stage all button calls gitStageFiles', async () => {
      render(<DiffPage />)
      await waitFor(() => expect(screen.getByText('Stage all')).toBeInTheDocument())
      fireEvent.click(screen.getByText('Stage all'))
      await waitFor(() => {
        expect(mockGitStageFiles).toHaveBeenCalled()
      })
    })
  })

  describe('keyboard shortcuts registration', () => {
    it('registers keyboard shortcuts', async () => {
      const { useKeyboardShortcuts } = vi.mocked(
        await import('../../hooks/useKeyboardShortcuts')
      )
      render(<DiffPage />)
      expect(useKeyboardShortcuts).toHaveBeenCalled()
    })
  })
})
