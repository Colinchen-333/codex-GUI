import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

const { mockUseMultiAgentStore, mockUseAgents, mockUseWorkflow, mockUseThreadStore } = vi.hoisted(() => ({
  mockUseMultiAgentStore: vi.fn(),
  mockUseAgents: vi.fn(),
  mockUseWorkflow: vi.fn(),
  mockUseThreadStore: vi.fn(),
}))

vi.mock('@/stores/multi-agent-v2', () => ({
  useMultiAgentStore: mockUseMultiAgentStore,
}))

vi.mock('@/hooks/useMultiAgent', () => ({
  useAgents: mockUseAgents,
  useWorkflow: mockUseWorkflow,
}))

vi.mock('@/stores/thread', () => ({
  useThreadStore: mockUseThreadStore,
}))

import { WorkbenchStatusBar } from '../WorkbenchStatusBar'

describe('WorkbenchStatusBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAgents.mockReturnValue([])
    mockUseWorkflow.mockReturnValue(null)
    mockUseThreadStore.mockImplementation((selector: (state: { threads: Record<string, unknown> }) => unknown) => {
      if (typeof selector === 'function') {
        return selector({ threads: {} })
      }
      return undefined
    })
  })

  it('should display working directory when set', () => {
    const mockWorkingDirectory = '/Users/colin/Projects/codex-desktop'
    mockUseMultiAgentStore.mockImplementation((selector: (state: { workingDirectory: string }) => string) => {
      if (typeof selector === 'function') {
        return selector({ workingDirectory: mockWorkingDirectory })
      }
      return undefined
    })

    const { container } = render(<WorkbenchStatusBar />)

    const dirElement = container.textContent
    expect(dirElement).toContain(mockWorkingDirectory)
  })

  it('should show Folder icon next to path', () => {
    const mockWorkingDirectory = '/Users/colin/Projects'
    mockUseMultiAgentStore.mockImplementation((selector: (state: { workingDirectory: string }) => string) => {
      if (typeof selector === 'function') {
        return selector({ workingDirectory: mockWorkingDirectory })
      }
      return undefined
    })

    const { container } = render(<WorkbenchStatusBar />)

    const folderIcon = container.querySelector('svg')
    expect(folderIcon).toBeInTheDocument()
  })

  it('should truncate long paths with ellipsis', () => {
    const mockWorkingDirectory = '/Users/colin/Projects/codex-desktop/src/components/multi-agent-v2/workbench'
    mockUseMultiAgentStore.mockImplementation((selector: (state: { workingDirectory: string }) => string) => {
      if (typeof selector === 'function') {
        return selector({ workingDirectory: mockWorkingDirectory })
      }
      return undefined
    })

    const { container } = render(<WorkbenchStatusBar />)

    const pathElement = container.querySelector('[class*="truncate"]')
    expect(pathElement).toBeInTheDocument()
  })

  it('should show full path on hover (title attribute)', () => {
    const mockWorkingDirectory = '/Users/colin/Projects/codex-desktop'
    mockUseMultiAgentStore.mockImplementation((selector: (state: { workingDirectory: string }) => string) => {
      if (typeof selector === 'function') {
        return selector({ workingDirectory: mockWorkingDirectory })
      }
      return undefined
    })

    const { container } = render(<WorkbenchStatusBar />)

    const dirContainer = container.querySelector('[title]')
    expect(dirContainer).toHaveAttribute('title', mockWorkingDirectory)
  })

  it('should show nothing when no working directory is set', () => {
    mockUseMultiAgentStore.mockImplementation((selector: (state: { workingDirectory: string }) => string) => {
      if (typeof selector === 'function') {
        return selector({ workingDirectory: '' })
      }
      return undefined
    })

    const { container } = render(<WorkbenchStatusBar />)

    const titleElements = container.querySelectorAll('[title]')
    const hasWorkingDirTitle = Array.from(titleElements).some(
      (el) => el.getAttribute('title') === ''
    )
    expect(hasWorkingDirTitle).toBe(false)
  })
})
