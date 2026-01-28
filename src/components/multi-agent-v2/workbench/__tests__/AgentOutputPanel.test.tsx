import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockRespondToApprovalInThread = vi.fn()

const { mockUseAgents, mockUseAgent, mockUseThreadStore } = vi.hoisted(() => ({
  mockUseAgents: vi.fn(),
  mockUseAgent: vi.fn(),
  mockUseThreadStore: Object.assign(vi.fn(), {
    getState: vi.fn(() => ({
      respondToApprovalInThread: mockRespondToApprovalInThread,
    })),
  }),
}))

// Mock dependencies
vi.mock('@/hooks/useMultiAgent', () => ({
  useAgents: mockUseAgents,
  useAgent: mockUseAgent,
}))

vi.mock('@/stores/thread', () => ({
  useThreadStore: mockUseThreadStore,
}))

import { AgentOutputPanel } from '../AgentOutputPanel'

describe('AgentOutputPanel - Approval Buttons', () => {
  const mockOnAgentSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useThreadStore
    mockUseThreadStore.mockImplementation((selector: (state: unknown) => unknown) => {
      if (typeof selector === 'function') {
        return selector({
          threads: {
            'thread-1': {
              itemOrder: ['item-1'],
              items: {
                'item-1': {
                  type: 'fileChange',
                  content: {
                    changes: [{ path: 'test.ts', kind: 'modify' }],
                    needsApproval: true,
                    approved: false,
                  },
                },
              },
            },
          },
        })
      }
      return undefined
    })
  })

  it('renders approval buttons when needsApproval=true and approved=false for fileChange', () => {
    mockUseAgents.mockReturnValue([
      { 
        id: 'agent-1', 
        type: 'code-writer', 
        status: 'running', 
        threadId: 'thread-1', 
        threadStoreRef: 'thread-1',
        task: 'test task',
        dependencies: [],
        progress: { current: 0, total: 0, description: 'working' },
        createdAt: new Date(),
        config: {},
      },
    ])
    mockUseAgent.mockReturnValue({
      id: 'agent-1',
      type: 'code-writer',
      status: 'running',
      threadId: 'thread-1',
      threadStoreRef: 'thread-1',
      task: 'test task',
      dependencies: [],
      progress: { current: 0, total: 0, description: 'working' },
      createdAt: new Date(),
      config: {},
    })

    render(
      <AgentOutputPanel
        activeAgentId="agent-1"
        onAgentSelect={mockOnAgentSelect}
      />
    )

    expect(screen.getByText('应用')).toBeInTheDocument()
    expect(screen.getByText('拒绝')).toBeInTheDocument()
  })

  it('does NOT render approval buttons when needsApproval=false', () => {
    mockUseThreadStore.mockImplementation((selector: (state: unknown) => unknown) => {
      if (typeof selector === 'function') {
        return selector({
          threads: {
            'thread-1': {
              itemOrder: ['item-1'],
              items: {
                'item-1': {
                  type: 'fileChange',
                  content: {
                    changes: [{ path: 'test.ts', kind: 'modify' }],
                    needsApproval: false,
                    approved: false,
                  },
                },
              },
            },
          },
        })
      }
      return undefined
    })

    mockUseAgents.mockReturnValue([
      { 
        id: 'agent-1', 
        type: 'code-writer', 
        status: 'running', 
        threadId: 'thread-1', 
        threadStoreRef: 'thread-1',
        task: 'test task',
        dependencies: [],
        progress: { current: 0, total: 0, description: 'working' },
        createdAt: new Date(),
        config: {},
      },
    ])
    mockUseAgent.mockReturnValue({
      id: 'agent-1',
      type: 'code-writer',
      status: 'running',
      threadId: 'thread-1',
      threadStoreRef: 'thread-1',
      task: 'test task',
      dependencies: [],
      progress: { current: 0, total: 0, description: 'working' },
      createdAt: new Date(),
      config: {},
    })

    render(
      <AgentOutputPanel
        activeAgentId="agent-1"
        onAgentSelect={mockOnAgentSelect}
      />
    )

    expect(screen.queryByText('应用')).not.toBeInTheDocument()
    expect(screen.queryByText('拒绝')).not.toBeInTheDocument()
  })

  it('does NOT render approval buttons when approved=true', () => {
    mockUseThreadStore.mockImplementation((selector: (state: unknown) => unknown) => {
      if (typeof selector === 'function') {
        return selector({
          threads: {
            'thread-1': {
              itemOrder: ['item-1'],
              items: {
                'item-1': {
                  type: 'fileChange',
                  content: {
                    changes: [{ path: 'test.ts', kind: 'modify' }],
                    needsApproval: true,
                    approved: true,
                  },
                },
              },
            },
          },
        })
      }
      return undefined
    })

    mockUseAgents.mockReturnValue([
      { 
        id: 'agent-1', 
        type: 'code-writer', 
        status: 'running', 
        threadId: 'thread-1', 
        threadStoreRef: 'thread-1',
        task: 'test task',
        dependencies: [],
        progress: { current: 0, total: 0, description: 'working' },
        createdAt: new Date(),
        config: {},
      },
    ])
    mockUseAgent.mockReturnValue({
      id: 'agent-1',
      type: 'code-writer',
      status: 'running',
      threadId: 'thread-1',
      threadStoreRef: 'thread-1',
      task: 'test task',
      dependencies: [],
      progress: { current: 0, total: 0, description: 'working' },
      createdAt: new Date(),
      config: {},
    })

    render(
      <AgentOutputPanel
        activeAgentId="agent-1"
        onAgentSelect={mockOnAgentSelect}
      />
    )

    expect(screen.queryByText('应用')).not.toBeInTheDocument()
    expect(screen.queryByText('拒绝')).not.toBeInTheDocument()
  })

  it('calls respondToApprovalInThread with accept when approve button clicked', async () => {
    const user = userEvent.setup()
    
    mockUseAgents.mockReturnValue([
      { 
        id: 'agent-1', 
        type: 'code-writer', 
        status: 'running', 
        threadId: 'thread-1', 
        threadStoreRef: 'thread-1',
        task: 'test task',
        dependencies: [],
        progress: { current: 0, total: 0, description: 'working' },
        createdAt: new Date(),
        config: {},
      },
    ])
    mockUseAgent.mockReturnValue({
      id: 'agent-1',
      type: 'code-writer',
      status: 'running',
      threadId: 'thread-1',
      threadStoreRef: 'thread-1',
      task: 'test task',
      dependencies: [],
      progress: { current: 0, total: 0, description: 'working' },
      createdAt: new Date(),
      config: {},
    })

    render(
      <AgentOutputPanel
        activeAgentId="agent-1"
        onAgentSelect={mockOnAgentSelect}
      />
    )

    const approveButton = screen.getByText('应用')
    await user.click(approveButton)

    expect(mockRespondToApprovalInThread).toHaveBeenCalledWith('thread-1', 'item-1', 'accept')
  })

  it('calls respondToApprovalInThread with decline when reject button clicked', async () => {
    const user = userEvent.setup()
    
    mockUseAgents.mockReturnValue([
      { 
        id: 'agent-1', 
        type: 'code-writer', 
        status: 'running', 
        threadId: 'thread-1', 
        threadStoreRef: 'thread-1',
        task: 'test task',
        dependencies: [],
        progress: { current: 0, total: 0, description: 'working' },
        createdAt: new Date(),
        config: {},
      },
    ])
    mockUseAgent.mockReturnValue({
      id: 'agent-1',
      type: 'code-writer',
      status: 'running',
      threadId: 'thread-1',
      threadStoreRef: 'thread-1',
      task: 'test task',
      dependencies: [],
      progress: { current: 0, total: 0, description: 'working' },
      createdAt: new Date(),
      config: {},
    })

    render(
      <AgentOutputPanel
        activeAgentId="agent-1"
        onAgentSelect={mockOnAgentSelect}
      />
    )

    const rejectButton = screen.getByText('拒绝')
    await user.click(rejectButton)

    expect(mockRespondToApprovalInThread).toHaveBeenCalledWith('thread-1', 'item-1', 'decline')
  })
})
