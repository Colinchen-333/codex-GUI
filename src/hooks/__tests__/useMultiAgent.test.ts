import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useAgentIds,
  useAgents,
  useSortedAgents,
  useAgentsByStatus,
  useAgent,
  useAgentByThreadId,
  useAgentsWithStatus,
  useRunningAgentsCount,
  useCompletedAgentsCount,
  useFailedAgentsCount,
  useWorkflow,
  useCurrentPhase,
  useMultiAgentConfig,
  useSpawnAgent,
  useCancelAgent,
  usePauseAgent,
  useResumeAgent,
  useMultiAgentActions,
  useHasRunningAgents,
  useAllAgentsCompleted,
  useAgentStats,
} from '../useMultiAgent'
import type { AgentDescriptor, MultiAgentConfig } from '../../stores/multi-agent-store/types'
import type { Workflow, WorkflowPhase } from '../../lib/workflows/types'

vi.mock('../../stores/multi-agent-v2', () => ({
  useMultiAgentStore: vi.fn(),
}))

vi.mock('zustand/react/shallow', () => ({
  useShallow: (fn: unknown) => fn,
}))

import { useMultiAgentStore } from '../../stores/multi-agent-v2'

function createMockAgent(overrides: Partial<AgentDescriptor> = {}): AgentDescriptor {
  return {
    id: 'agent-1',
    type: 'explore',
    status: 'running',
    task: 'test task',
    threadId: 'thread-1',
    threadStoreRef: 'thread-1',
    dependencies: [],
    progress: { current: 0, total: 1, description: '' },
    config: {},
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }
}

function createMockPhase(overrides: Partial<WorkflowPhase> = {}): WorkflowPhase {
  return {
    id: 'phase-1',
    kind: 'explore',
    name: 'Test Phase',
    description: 'Test description',
    agentIds: [],
    status: 'running',
    requiresApproval: true,
    createdAt: new Date(),
    ...overrides,
  }
}

function createMockWorkflow(phases: WorkflowPhase[] = []): Workflow {
  return {
    id: 'workflow-1',
    name: 'Test Workflow',
    description: 'Test description',
    status: 'running',
    phases,
    currentPhaseIndex: 0,
    createdAt: new Date(),
  }
}

function createMockConfig(overrides: Partial<MultiAgentConfig> = {}): MultiAgentConfig {
  return {
    cwd: '/test/path',
    model: 'gpt-4',
    approvalPolicy: 'always',
    timeout: 300,
    maxConcurrentAgents: 5,
    ...overrides,
  }
}

describe('useMultiAgent hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupMocks(config: {
    agents?: AgentDescriptor[]
    agentOrder?: string[]
    agentMapping?: Record<string, string>
    workflow?: Workflow | null
    config?: MultiAgentConfig
    actions?: Record<string, unknown>
  }) {
    const {
      agents = [],
      agentOrder = agents.map(a => a.id),
      agentMapping = agents.reduce<Record<string, string>>((acc, a) => {
        acc[a.threadId] = a.id
        return acc
      }, {}),
      workflow = null,
      config: multiAgentConfig = createMockConfig(),
      actions = {},
    } = config

    const agentsMap = agents.reduce<Record<string, AgentDescriptor>>((acc, agent) => {
      acc[agent.id] = agent
      return acc
    }, {})

    const mockStore = vi.mocked(useMultiAgentStore)
    mockStore.mockImplementation((selector: unknown) => {
      const state = {
        agentOrder,
        agents: agentsMap,
        agentMapping,
        workflow,
        config: multiAgentConfig,
        getAgentsByStatus: (status: string) => agents.filter(a => a.status === status),
        spawnAgent: actions.spawnAgent ?? vi.fn(),
        cancelAgent: actions.cancelAgent ?? vi.fn(),
        pauseAgent: actions.pauseAgent ?? vi.fn(),
        resumeAgent: actions.resumeAgent ?? vi.fn(),
        updateAgentStatus: actions.updateAgentStatus ?? vi.fn(),
        updateAgentProgress: actions.updateAgentProgress ?? vi.fn(),
        startWorkflow: actions.startWorkflow ?? vi.fn(),
        approvePhase: actions.approvePhase ?? vi.fn(),
        rejectPhase: actions.rejectPhase ?? vi.fn(),
        cancelWorkflow: actions.cancelWorkflow ?? vi.fn(),
      }
      if (typeof selector === 'function') {
        return (selector as (s: typeof state) => unknown)(state)
      }
      return state
    })
  }

  describe('useAgentIds', () => {
    it('should return empty array when no agents', () => {
      setupMocks({ agents: [] })
      const { result } = renderHook(() => useAgentIds())
      expect(result.current).toEqual([])
    })

    it('should return agent IDs in order', () => {
      const agents = [
        createMockAgent({ id: 'a1' }),
        createMockAgent({ id: 'a2' }),
        createMockAgent({ id: 'a3' }),
      ]
      setupMocks({ agents, agentOrder: ['a1', 'a2', 'a3'] })
      const { result } = renderHook(() => useAgentIds())
      expect(result.current).toEqual(['a1', 'a2', 'a3'])
    })
  })

  describe('useAgents', () => {
    it('should return empty array when no agents', () => {
      setupMocks({ agents: [] })
      const { result } = renderHook(() => useAgents())
      expect(result.current).toEqual([])
    })

    it('should return agents in order', () => {
      const agents = [
        createMockAgent({ id: 'a1', task: 'task1' }),
        createMockAgent({ id: 'a2', task: 'task2' }),
      ]
      setupMocks({ agents })
      const { result } = renderHook(() => useAgents())
      expect(result.current).toHaveLength(2)
      expect(result.current[0].id).toBe('a1')
      expect(result.current[1].id).toBe('a2')
    })

    it('should filter out undefined agents from order', () => {
      const agents = [createMockAgent({ id: 'a1' })]
      setupMocks({ agents, agentOrder: ['a1', 'missing-agent'] })
      const { result } = renderHook(() => useAgents())
      expect(result.current).toHaveLength(1)
      expect(result.current[0].id).toBe('a1')
    })
  })

  describe('useSortedAgents', () => {
    it('should sort agents by status priority (running > pending > error > completed > cancelled)', () => {
      const agents = [
        createMockAgent({ id: 'a1', status: 'completed', createdAt: new Date('2024-01-01') }),
        createMockAgent({ id: 'a2', status: 'running', createdAt: new Date('2024-01-02') }),
        createMockAgent({ id: 'a3', status: 'pending', createdAt: new Date('2024-01-03') }),
        createMockAgent({ id: 'a4', status: 'error', createdAt: new Date('2024-01-04') }),
      ]
      setupMocks({ agents })
      const { result } = renderHook(() => useSortedAgents())
      expect(result.current.map(a => a.status)).toEqual(['running', 'pending', 'error', 'completed'])
    })

    it('should sort by creation time when status is equal', () => {
      const agents = [
        createMockAgent({ id: 'a1', status: 'running', createdAt: new Date('2024-01-03') }),
        createMockAgent({ id: 'a2', status: 'running', createdAt: new Date('2024-01-01') }),
        createMockAgent({ id: 'a3', status: 'running', createdAt: new Date('2024-01-02') }),
      ]
      setupMocks({ agents })
      const { result } = renderHook(() => useSortedAgents())
      expect(result.current.map(a => a.id)).toEqual(['a2', 'a3', 'a1'])
    })
  })

  describe('useAgentsByStatus', () => {
    it('should group agents by status', () => {
      const agents = [
        createMockAgent({ id: 'a1', status: 'running' }),
        createMockAgent({ id: 'a2', status: 'running' }),
        createMockAgent({ id: 'a3', status: 'completed' }),
        createMockAgent({ id: 'a4', status: 'error' }),
      ]
      setupMocks({ agents })
      const { result } = renderHook(() => useAgentsByStatus())

      expect(result.current.running).toHaveLength(2)
      expect(result.current.completed).toHaveLength(1)
      expect(result.current.error).toHaveLength(1)
      expect(result.current.pending).toHaveLength(0)
      expect(result.current.cancelled).toHaveLength(0)
    })
  })

  describe('useAgent', () => {
    it('should return undefined for non-existent agent', () => {
      setupMocks({ agents: [] })
      const { result } = renderHook(() => useAgent('non-existent'))
      expect(result.current).toBeUndefined()
    })

    it('should return agent by ID', () => {
      const agent = createMockAgent({ id: 'my-agent', task: 'my task' })
      setupMocks({ agents: [agent] })
      const { result } = renderHook(() => useAgent('my-agent'))
      expect(result.current).toBeDefined()
      expect(result.current?.task).toBe('my task')
    })
  })

  describe('useAgentByThreadId', () => {
    it('should return undefined for non-existent thread', () => {
      setupMocks({ agents: [] })
      const { result } = renderHook(() => useAgentByThreadId('non-existent'))
      expect(result.current).toBeUndefined()
    })

    it('should return agent by thread ID', () => {
      const agent = createMockAgent({ id: 'agent-1', threadId: 'my-thread', task: 'thread task' })
      setupMocks({ agents: [agent] })
      const { result } = renderHook(() => useAgentByThreadId('my-thread'))
      expect(result.current).toBeDefined()
      expect(result.current?.task).toBe('thread task')
    })
  })

  describe('useAgentsWithStatus', () => {
    it('should return only agents with specified status', () => {
      const agents = [
        createMockAgent({ id: 'a1', status: 'running' }),
        createMockAgent({ id: 'a2', status: 'completed' }),
        createMockAgent({ id: 'a3', status: 'running' }),
      ]
      setupMocks({ agents })
      const { result } = renderHook(() => useAgentsWithStatus('running'))
      expect(result.current).toHaveLength(2)
      expect(result.current.every(a => a.status === 'running')).toBe(true)
    })

    it('should return empty array when no agents match', () => {
      const agents = [createMockAgent({ status: 'completed' })]
      setupMocks({ agents })
      const { result } = renderHook(() => useAgentsWithStatus('error'))
      expect(result.current).toEqual([])
    })
  })

  describe('count hooks', () => {
    it('useRunningAgentsCount should return count of running agents', () => {
      const agents = [
        createMockAgent({ status: 'running' }),
        createMockAgent({ id: 'a2', status: 'running' }),
        createMockAgent({ id: 'a3', status: 'completed' }),
      ]
      setupMocks({ agents })
      const { result } = renderHook(() => useRunningAgentsCount())
      expect(result.current).toBe(2)
    })

    it('useCompletedAgentsCount should return count of completed agents', () => {
      const agents = [
        createMockAgent({ status: 'completed' }),
        createMockAgent({ id: 'a2', status: 'completed' }),
        createMockAgent({ id: 'a3', status: 'running' }),
      ]
      setupMocks({ agents })
      const { result } = renderHook(() => useCompletedAgentsCount())
      expect(result.current).toBe(2)
    })

    it('useFailedAgentsCount should return count of error agents', () => {
      const agents = [
        createMockAgent({ status: 'error' }),
        createMockAgent({ id: 'a2', status: 'completed' }),
      ]
      setupMocks({ agents })
      const { result } = renderHook(() => useFailedAgentsCount())
      expect(result.current).toBe(1)
    })
  })

  describe('useWorkflow', () => {
    it('should return null when no workflow', () => {
      setupMocks({ workflow: null })
      const { result } = renderHook(() => useWorkflow())
      expect(result.current).toBeNull()
    })

    it('should return workflow', () => {
      const workflow = createMockWorkflow()
      setupMocks({ workflow })
      const { result } = renderHook(() => useWorkflow())
      expect(result.current).toBeDefined()
      expect(result.current?.name).toBe('Test Workflow')
    })
  })

  describe('useCurrentPhase', () => {
    it('should return undefined when no workflow', () => {
      setupMocks({ workflow: null })
      const { result } = renderHook(() => useCurrentPhase())
      expect(result.current).toBeUndefined()
    })

    it('should return undefined when workflow has no phases', () => {
      setupMocks({ workflow: createMockWorkflow([]) })
      const { result } = renderHook(() => useCurrentPhase())
      expect(result.current).toBeUndefined()
    })

    it('should return current phase based on currentPhaseIndex', () => {
      const phases = [
        createMockPhase({ id: 'p1', name: 'Phase 1' }),
        createMockPhase({ id: 'p2', name: 'Phase 2' }),
      ]
      const workflow = { ...createMockWorkflow(phases), currentPhaseIndex: 1 }
      setupMocks({ workflow })
      const { result } = renderHook(() => useCurrentPhase())
      expect(result.current?.name).toBe('Phase 2')
    })
  })

  describe('useMultiAgentConfig', () => {
    it('should return config', () => {
      const config = createMockConfig({ model: 'claude-3' })
      setupMocks({ config })
      const { result } = renderHook(() => useMultiAgentConfig())
      expect(result.current.model).toBe('claude-3')
    })
  })

  describe('action hooks', () => {
    it('useSpawnAgent should return spawn function', () => {
      const spawnAgent = vi.fn()
      setupMocks({ actions: { spawnAgent } })
      const { result } = renderHook(() => useSpawnAgent())
      expect(result.current).toBe(spawnAgent)
    })

    it('useCancelAgent should return cancel function', () => {
      const cancelAgent = vi.fn()
      setupMocks({ actions: { cancelAgent } })
      const { result } = renderHook(() => useCancelAgent())
      expect(result.current).toBe(cancelAgent)
    })

    it('usePauseAgent should return pause function', () => {
      const pauseAgent = vi.fn()
      setupMocks({ actions: { pauseAgent } })
      const { result } = renderHook(() => usePauseAgent())
      expect(result.current).toBe(pauseAgent)
    })

    it('useResumeAgent should return resume function', () => {
      const resumeAgent = vi.fn()
      setupMocks({ actions: { resumeAgent } })
      const { result } = renderHook(() => useResumeAgent())
      expect(result.current).toBe(resumeAgent)
    })
  })

  describe('useMultiAgentActions', () => {
    it('should return all actions as memoized object', () => {
      const actions = {
        spawnAgent: vi.fn(),
        cancelAgent: vi.fn(),
        pauseAgent: vi.fn(),
        resumeAgent: vi.fn(),
        updateAgentStatus: vi.fn(),
        updateAgentProgress: vi.fn(),
        startWorkflow: vi.fn(),
        approvePhase: vi.fn(),
        rejectPhase: vi.fn(),
        cancelWorkflow: vi.fn(),
      }
      setupMocks({ actions })
      const { result } = renderHook(() => useMultiAgentActions())

      expect(result.current.spawnAgent).toBe(actions.spawnAgent)
      expect(result.current.cancelAgent).toBe(actions.cancelAgent)
      expect(result.current.pauseAgent).toBe(actions.pauseAgent)
      expect(result.current.resumeAgent).toBe(actions.resumeAgent)
      expect(result.current.updateAgentStatus).toBe(actions.updateAgentStatus)
      expect(result.current.updateAgentProgress).toBe(actions.updateAgentProgress)
      expect(result.current.startWorkflow).toBe(actions.startWorkflow)
      expect(result.current.approvePhase).toBe(actions.approvePhase)
      expect(result.current.rejectPhase).toBe(actions.rejectPhase)
      expect(result.current.cancelWorkflow).toBe(actions.cancelWorkflow)
    })
  })

  describe('useHasRunningAgents', () => {
    it('should return false when no running agents', () => {
      const agents = [createMockAgent({ status: 'completed' })]
      setupMocks({ agents })
      const { result } = renderHook(() => useHasRunningAgents())
      expect(result.current).toBe(false)
    })

    it('should return true when has running agents', () => {
      const agents = [createMockAgent({ status: 'running' })]
      setupMocks({ agents })
      const { result } = renderHook(() => useHasRunningAgents())
      expect(result.current).toBe(true)
    })
  })

  describe('useAllAgentsCompleted', () => {
    it('should return false when no agents', () => {
      setupMocks({ agents: [] })
      const { result } = renderHook(() => useAllAgentsCompleted())
      expect(result.current).toBe(false)
    })

    it('should return false when some agents not completed', () => {
      const agents = [
        createMockAgent({ id: 'a1', status: 'completed' }),
        createMockAgent({ id: 'a2', status: 'running' }),
      ]
      setupMocks({ agents })
      const { result } = renderHook(() => useAllAgentsCompleted())
      expect(result.current).toBe(false)
    })

    it('should return true when all agents completed', () => {
      const agents = [
        createMockAgent({ id: 'a1', status: 'completed' }),
        createMockAgent({ id: 'a2', status: 'completed' }),
      ]
      setupMocks({ agents })
      const { result } = renderHook(() => useAllAgentsCompleted())
      expect(result.current).toBe(true)
    })
  })

  describe('useAgentStats', () => {
    it('should return correct stats', () => {
      const agents = [
        createMockAgent({ id: 'a1', status: 'running' }),
        createMockAgent({ id: 'a2', status: 'running' }),
        createMockAgent({ id: 'a3', status: 'pending' }),
        createMockAgent({ id: 'a4', status: 'completed' }),
        createMockAgent({ id: 'a5', status: 'error' }),
        createMockAgent({ id: 'a6', status: 'cancelled' }),
      ]
      setupMocks({ agents })
      const { result } = renderHook(() => useAgentStats())

      expect(result.current).toEqual({
        total: 6,
        running: 2,
        pending: 1,
        completed: 1,
        error: 1,
        cancelled: 1,
      })
    })

    it('should return zero counts when no agents', () => {
      setupMocks({ agents: [] })
      const { result } = renderHook(() => useAgentStats())

      expect(result.current).toEqual({
        total: 0,
        running: 0,
        pending: 0,
        completed: 0,
        error: 0,
        cancelled: 0,
      })
    })
  })
})
