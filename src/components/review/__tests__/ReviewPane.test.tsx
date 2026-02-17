import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReviewPane, ReviewPaneToggle } from '../ReviewPane'

// Mock external dependencies
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

const mockGetGitDiff = vi.fn().mockResolvedValue({ isGitRepo: true, diff: '' })
const mockGetGitDiffStaged = vi.fn().mockResolvedValue({ diff: '' })
const mockGitStatus = vi.fn().mockResolvedValue([])
const mockGitDiffBranch = vi.fn().mockResolvedValue('')
const mockGitStageFiles = vi.fn().mockResolvedValue(undefined)
const mockGitUnstageFiles = vi.fn().mockResolvedValue(undefined)

vi.mock('../../../lib/api', () => ({
  projectApi: {
    getGitDiff: (...args: unknown[]) => mockGetGitDiff(...args),
    getGitDiffStaged: (...args: unknown[]) => mockGetGitDiffStaged(...args),
    gitStatus: (...args: unknown[]) => mockGitStatus(...args),
    gitDiffBranch: (...args: unknown[]) => mockGitDiffBranch(...args),
    gitStageFiles: (...args: unknown[]) => mockGitStageFiles(...args),
    gitUnstageFiles: (...args: unknown[]) => mockGitUnstageFiles(...args),
  },
}))

vi.mock('../../../stores/projects', () => ({
  useProjectsStore: vi.fn((selector) => {
    const state = {
      selectedProjectId: 'proj-1',
      projects: [{ id: 'proj-1', path: '/test/project' }],
      gitInfo: { 'proj-1': { branch: 'feature-branch' } },
    }
    return typeof selector === 'function' ? selector(state) : state
  }),
}))

vi.mock('../../ui/DiffView', () => ({
  DiffView: ({ diff }: { diff: { path: string } }) => <div data-testid="diff-view">{diff.path}</div>,
}))

vi.mock('../../../lib/gitDiffUtils', () => ({
  parseGitDiff: vi.fn((raw: string) => {
    if (!raw.trim()) return []
    return [
      {
        path: 'src/test.ts',
        hunks: [
          {
            header: '@@ -1,3 +1,4 @@',
            lines: [
              { type: 'context', content: 'line 1' },
              { type: 'add', content: 'new line' },
              { type: 'remove', content: 'old line' },
            ],
          },
        ],
      },
    ]
  }),
  buildFileTree: vi.fn(() => []),
  flattenTree: vi.fn(() => []),
}))

vi.mock('../../ui/Input', () => ({
  Input: ({ placeholder, value, onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input placeholder={placeholder} value={value} onChange={onChange} {...props} />
  ),
}))

vi.mock('../../ui/Button', () => ({
  Button: ({ children, onClick, ...props }: React.PropsWithChildren<{ onClick?: () => void }>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}))

vi.mock('../../ui/IconButton', () => ({
  IconButton: ({ children, onClick, ...props }: React.PropsWithChildren<{ onClick?: () => void }>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}))

vi.mock('../../../lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

describe('ReviewPane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetGitDiff.mockResolvedValue({ isGitRepo: true, diff: '' })
    mockGetGitDiffStaged.mockResolvedValue({ diff: '' })
    mockGitStatus.mockResolvedValue([])
  })

  describe('when closed', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <ReviewPane isOpen={false} onClose={vi.fn()} />
      )
      expect(container.innerHTML).toBe('')
    })
  })

  describe('when open with no changes', () => {
    it('renders the panel', () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      // Should show loading then empty
    })

    it('renders scope toggles', async () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('Uncommitted')).toBeInTheDocument()
      expect(screen.getByText('Branch')).toBeInTheDocument()
    })

    it('renders close button', () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByLabelText('Close panel')).toBeInTheDocument()
    })

    it('renders refresh button', () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByLabelText('Refresh')).toBeInTheDocument()
    })

    it('renders commit button', () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('Commit')).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn()
      render(<ReviewPane isOpen={true} onClose={onClose} />)
      fireEvent.click(screen.getByLabelText('Close panel'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onCommit when commit button is clicked', () => {
      const onCommit = vi.fn()
      render(<ReviewPane isOpen={true} onClose={vi.fn()} onCommit={onCommit} />)
      fireEvent.click(screen.getByText('Commit'))
      expect(onCommit).toHaveBeenCalledTimes(1)
    })

    it('shows empty state when no changes found', async () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      await waitFor(() => {
        expect(screen.getByText('No changes')).toBeInTheDocument()
      })
    })

    it('shows file count badge', () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText(/0 files/)).toBeInTheDocument()
    })
  })

  describe('scope switching', () => {
    it('uncommitted scope is active by default', () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      const uncommittedBtn = screen.getByText('Uncommitted')
      // Active scope has specific styling classes
      expect(uncommittedBtn.className).toContain('text-text-1')
    })

    it('clicking Branch switches scope', () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      fireEvent.click(screen.getByText('Branch'))
      const branchBtn = screen.getByText('Branch')
      expect(branchBtn.className).toContain('text-text-1')
    })
  })

  describe('staged/unstaged filter (uncommitted scope)', () => {
    it('shows staged/unstaged filter in uncommitted scope', () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText(/^all$/i)).toBeInTheDocument()
      expect(screen.getByText(/^staged$/i)).toBeInTheDocument()
      expect(screen.getByText(/^unstaged$/i)).toBeInTheDocument()
    })

    it('shows stage all and unstage all buttons', () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText('Stage all')).toBeInTheDocument()
      expect(screen.getByText('Unstage all')).toBeInTheDocument()
    })

    it('hides staged/unstaged filter in branch scope', () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      fireEvent.click(screen.getByText('Branch'))
      expect(screen.queryByText('Stage all')).not.toBeInTheDocument()
    })
  })

  describe('loading diff data', () => {
    it('fetches diff when panel opens', async () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      await waitFor(() => {
        expect(mockGetGitDiff).toHaveBeenCalledWith('/test/project')
        expect(mockGetGitDiffStaged).toHaveBeenCalledWith('/test/project')
      })
    })

    it('fetches git status alongside diffs', async () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      await waitFor(() => {
        expect(mockGitStatus).toHaveBeenCalledWith('/test/project')
      })
    })

    it('shows not-git state when project is not a git repo', async () => {
      mockGetGitDiff.mockResolvedValue({ isGitRepo: false, diff: '' })
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      await waitFor(() => {
        expect(screen.getByText('Not a git repository')).toBeInTheDocument()
      })
    })

    it('shows error state on API failure', async () => {
      mockGetGitDiff.mockRejectedValue(new Error('API error'))
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      await waitFor(() => {
        expect(screen.getByText('Failed to load diff')).toBeInTheDocument()
      })
    })

    it('shows diff view when changes exist', async () => {
      mockGetGitDiff.mockResolvedValue({ isGitRepo: true, diff: 'diff --git a/src/test.ts b/src/test.ts' })
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      await waitFor(() => {
        expect(screen.getByTestId('diff-view')).toBeInTheDocument()
      })
    })
  })

  describe('refresh', () => {
    it('re-fetches diff on refresh click', async () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      await waitFor(() => expect(mockGetGitDiff).toHaveBeenCalled())

      const callCountBefore = mockGetGitDiff.mock.calls.length
      fireEvent.click(screen.getByLabelText('Refresh'))
      await waitFor(() => expect(mockGetGitDiff.mock.calls.length).toBeGreaterThan(callCountBefore))
    })
  })

  describe('filter input', () => {
    it('renders filter input in the file list', () => {
      render(<ReviewPane isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByPlaceholderText('Filter files...')).toBeInTheDocument()
    })
  })
})

describe('ReviewPaneToggle', () => {
  it('renders the Review button', () => {
    render(<ReviewPaneToggle onClick={vi.fn()} />)
    expect(screen.getByText('Review')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<ReviewPaneToggle onClick={onClick} />)
    fireEvent.click(screen.getByText('Review'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies highlight styles when hasChanges is true', () => {
    render(<ReviewPaneToggle onClick={vi.fn()} hasChanges={true} />)
    const button = screen.getByText('Review').closest('button')!
    expect(button.className).toContain('text-primary')
  })

  it('applies muted styles when hasChanges is false', () => {
    render(<ReviewPaneToggle onClick={vi.fn()} hasChanges={false} />)
    const button = screen.getByText('Review').closest('button')!
    expect(button.className).toContain('text-text-2')
  })
})
