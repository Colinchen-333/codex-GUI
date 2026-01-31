import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDecisionQueue } from '../useDecisionQueue'
import type { AgentDescriptor } from '../../stores/multi-agent-store/types'
import type { Workflow, WorkflowPhase } from '../../lib/workflows/types'

vi.mock('../../stores/multi-agent-v2', () => ({
  useMultiAgentStore: vi.fn(),
}))

vi.mock('../../stores/thread', () => ({
  useThreadStore: vi.fn(),
}))

vi.mock('zustand/react/shallow', () => ({
  useShallow: (fn: unknown) => fn,
}))

import { useMultiAgentStore } from '../../stores/multi-agent-v2'
import { useThreadStore } from '../../stores/thread'

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
    createdAt: new Date(),
    error: undefined,
    ...overrides,
  }
}

function createMockPhase(overrides: Partial<WorkflowPhase> = {}): WorkflowPhase {
  return {
    id: 'phase-1',
    kind: 'explore',
    name: 'Test Phase',
    description: 'Test phase description',
    agentIds: [],
    status: 'running',
    requiresApproval: true,
    createdAt: new Date(),
    ...overrides,
  }
}

function createMockWorkflow(phases: WorkflowPhase[]): Workflow {
  return {
    id: 'workflow-1',
    name: 'Test Workflow',
    description: 'Test workflow description',
    status: 'running',
    phases,
    currentPhaseIndex: 0,
    createdAt: new Date(),
  }
}

describe('useDecisionQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupMocks(config: {
    agents?: AgentDescriptor[]
    agentOrder?: string[]
    workflow?: Workflow | null
    threads?: Record<string, { pendingApprovals?: unknown[] }>
  }) {
    const {
      agents = [],
      agentOrder = agents.map(a => a.id),
      workflow = null,
      threads = {},
    } = config

    const agentsMap = agents.reduce<Record<string, AgentDescriptor>>((acc, agent) => {
      acc[agent.id] = agent
      return acc
    }, {})

    const mockMultiAgentStore = vi.mocked(useMultiAgentStore)
    mockMultiAgentStore.mockImplementation((selector: unknown) => {
      const state = {
        agentOrder,
        agents: agentsMap,
        workflow,
      }
      if (typeof selector === 'function') {
        return (selector as (s: typeof state) => unknown)(state)
      }
      return state
    })

    const mockThreadStore = vi.mocked(useThreadStore)
    mockThreadStore.mockImplementation((selector: unknown) => {
      const state = { threads }
      if (typeof selector === 'function') {
        return (selector as (s: typeof state) => unknown)(state)
      }
      return state
    })
  }

  describe('empty queue handling', () => {
    it('should return empty state when no agents and no workflow', () => {
      setupMocks({})

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toEqual([])
      expect(result.current.primaryDecision).toBeNull()
      expect(result.current.hasDecisions).toBe(false)
      expect(result.current.hasCriticalDecisions).toBe(false)
      expect(result.current.counts).toEqual({
        safetyApprovals: 0,
        phaseApprovals: 0,
        timeoutRecoveries: 0,
        errorRecoveries: 0,
        total: 0,
      })
    })

    it('should return empty state when agents have no pending approvals', () => {
      const agent = createMockAgent()
      setupMocks({
        agents: [agent],
        threads: { 'thread-1': { pendingApprovals: [] } },
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toEqual([])
      expect(result.current.hasDecisions).toBe(false)
    })

    it('should return empty state when agent has no threadId', () => {
      const agent = createMockAgent({ threadId: undefined as unknown as string })
      setupMocks({
        agents: [agent],
        threads: {},
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toEqual([])
    })
  })

  describe('safety approvals (priority 1)', () => {
    it('should detect safety approvals from pending thread approvals', () => {
      const agent = createMockAgent({ type: 'code-writer' })
      setupMocks({
        agents: [agent],
        threads: {
          'thread-1': { pendingApprovals: [{ id: 'approval-1' }, { id: 'approval-2' }] },
        },
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toHaveLength(1)
      expect(result.current.decisions[0]).toMatchObject({
        type: 'safety_approval',
        priority: 1,
        id: 'safety-agent-1',
      })
      expect(result.current.decisions[0].label).toContain('2')
      expect(result.current.decisions[0].description).toContain('编码代理')
      expect(result.current.counts.safetyApprovals).toBe(1)
    })

    it('should use agent type name from AGENT_TYPE_NAMES mapping', () => {
      const agents = [
        createMockAgent({ id: 'a1', type: 'explore', threadId: 't1', threadStoreRef: 't1' }),
        createMockAgent({ id: 'a2', type: 'plan', threadId: 't2', threadStoreRef: 't2' }),
        createMockAgent({ id: 'a3', type: 'reviewer', threadId: 't3', threadStoreRef: 't3' }),
      ]
      setupMocks({
        agents,
        threads: {
          t1: { pendingApprovals: [{}] },
          t2: { pendingApprovals: [{}] },
          t3: { pendingApprovals: [{}] },
        },
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toHaveLength(3)
      expect(result.current.decisions.some(d => d.description.includes('探索代理'))).toBe(true)
      expect(result.current.decisions.some(d => d.description.includes('计划代理'))).toBe(true)
      expect(result.current.decisions.some(d => d.description.includes('审查代理'))).toBe(true)
    })

    it('should fallback to agent type when no mapping exists', () => {
      const agent = createMockAgent({ type: 'unknown-type' as AgentDescriptor['type'] })
      setupMocks({
        agents: [agent],
        threads: { 'thread-1': { pendingApprovals: [{}] } },
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions[0].description).toContain('unknown-type')
    })
  })

  describe('phase approvals (priority 2)', () => {
    it('should detect phase awaiting approval', () => {
      const phase = createMockPhase({
        id: 'phase-design',
        name: '设计阶段',
        status: 'awaiting_approval',
      })
      setupMocks({
        workflow: createMockWorkflow([phase]),
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toHaveLength(1)
      expect(result.current.decisions[0]).toMatchObject({
        type: 'phase_approval',
        priority: 2,
        id: 'phase-phase-design',
        label: '阶段审批: 设计阶段',
        actions: ['approve', 'reject'],
      })
      expect(result.current.counts.phaseApprovals).toBe(1)
    })

    it('should not detect non-awaiting phases', () => {
      const phases = [
        createMockPhase({ status: 'pending' }),
        createMockPhase({ id: 'phase-2', status: 'running' }),
        createMockPhase({ id: 'phase-3', status: 'completed' }),
      ]
      setupMocks({
        workflow: createMockWorkflow(phases),
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toHaveLength(0)
      expect(result.current.counts.phaseApprovals).toBe(0)
    })
  })

  describe('timeout recoveries (priority 3)', () => {
    it('should detect phase approval timeout', () => {
      const phase = createMockPhase({
        id: 'phase-timeout',
        name: '超时阶段',
        status: 'approval_timeout',
      })
      setupMocks({
        workflow: createMockWorkflow([phase]),
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toHaveLength(1)
      expect(result.current.decisions[0]).toMatchObject({
        type: 'timeout_recovery',
        priority: 3,
        id: 'timeout-phase-timeout',
        actions: ['recover', 'approve', 'reject'],
      })
      expect(result.current.counts.timeoutRecoveries).toBe(1)
    })
  })

  describe('error recoveries (priority 4)', () => {
    it('should detect recoverable agent errors', () => {
      const agent = createMockAgent({
        id: 'error-agent',
        type: 'tester',
        status: 'error',
        error: { recoverable: true, message: 'Test error message', code: 'TEST_ERROR' },
      })
      setupMocks({
        agents: [agent],
        threads: {},
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toHaveLength(1)
      expect(result.current.decisions[0]).toMatchObject({
        type: 'error_recovery',
        priority: 4,
        id: 'error-error-agent',
        label: '错误恢复: 测试代理',
        description: 'Test error message',
        actions: ['retry', 'dismiss'],
      })
      expect(result.current.counts.errorRecoveries).toBe(1)
    })

    it('should not detect non-recoverable agent errors', () => {
      const agent = createMockAgent({
        status: 'error',
        error: { recoverable: false, message: 'Fatal error', code: 'FATAL' },
      })
      setupMocks({
        agents: [agent],
        threads: {},
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toHaveLength(0)
      expect(result.current.counts.errorRecoveries).toBe(0)
    })

    it('should not detect error agents without error object', () => {
      const agent = createMockAgent({
        status: 'error',
        error: undefined,
      })
      setupMocks({
        agents: [agent],
        threads: {},
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toHaveLength(0)
    })
  })

  describe('priority sorting', () => {
    it('should sort decisions by priority (safety > phase > timeout > error)', () => {
      const agentWithApproval = createMockAgent({ id: 'a1', type: 'code-writer', threadId: 't1', threadStoreRef: 't1' })
      const agentWithError = createMockAgent({
        id: 'a2',
        type: 'tester',
        threadId: 't2',
        threadStoreRef: 't2',
        status: 'error',
        error: { recoverable: true, message: 'Error', code: 'ERR' },
      })

      const phaseApproval = createMockPhase({
        id: 'p1',
        name: 'Approval Phase',
        status: 'awaiting_approval',
      })

      setupMocks({
        agents: [agentWithError, agentWithApproval],
        threads: {
          t1: { pendingApprovals: [{}] },
          t2: { pendingApprovals: [] },
        },
        workflow: createMockWorkflow([phaseApproval]),
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toHaveLength(3)
      expect(result.current.decisions[0].type).toBe('safety_approval')
      expect(result.current.decisions[0].priority).toBe(1)
      expect(result.current.decisions[1].type).toBe('phase_approval')
      expect(result.current.decisions[1].priority).toBe(2)
      expect(result.current.decisions[2].type).toBe('error_recovery')
      expect(result.current.decisions[2].priority).toBe(4)
    })

    it('should set primaryDecision to highest priority decision', () => {
      const agent = createMockAgent({
        status: 'error',
        error: { recoverable: true, message: 'Error', code: 'ERR' },
      })
      const phase = createMockPhase({ status: 'awaiting_approval' })

      setupMocks({
        agents: [agent],
        threads: { 'thread-1': { pendingApprovals: [{}] } },
        workflow: createMockWorkflow([phase]),
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.primaryDecision).not.toBeNull()
      expect(result.current.primaryDecision?.type).toBe('safety_approval')
    })
  })

  describe('counts calculation', () => {
    it('should correctly count all decision types', () => {
      const agents = [
        createMockAgent({ id: 'a1', threadId: 't1', threadStoreRef: 't1' }),
        createMockAgent({ id: 'a2', threadId: 't2', threadStoreRef: 't2' }),
        createMockAgent({
          id: 'a3',
          threadId: 't3',
          threadStoreRef: 't3',
          status: 'error',
          error: { recoverable: true, message: 'Error 1', code: 'ERR1' },
        }),
        createMockAgent({
          id: 'a4',
          threadId: 't4',
          threadStoreRef: 't4',
          status: 'error',
          error: { recoverable: true, message: 'Error 2', code: 'ERR2' },
        }),
      ]

      setupMocks({
        agents,
        threads: {
          t1: { pendingApprovals: [{}] },
          t2: { pendingApprovals: [{}, {}] },
          t3: { pendingApprovals: [] },
          t4: { pendingApprovals: [] },
        },
        workflow: createMockWorkflow([
          createMockPhase({ status: 'awaiting_approval' }),
        ]),
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.counts).toEqual({
        safetyApprovals: 2,
        phaseApprovals: 1,
        timeoutRecoveries: 0,
        errorRecoveries: 2,
        total: 5,
      })
    })
  })

  describe('hasCriticalDecisions flag', () => {
    it('should be true when safety approvals exist', () => {
      const agent = createMockAgent()
      setupMocks({
        agents: [agent],
        threads: { 'thread-1': { pendingApprovals: [{}] } },
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.hasCriticalDecisions).toBe(true)
    })

    it('should be true when phase approvals exist', () => {
      setupMocks({
        workflow: createMockWorkflow([
          createMockPhase({ status: 'awaiting_approval' }),
        ]),
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.hasCriticalDecisions).toBe(true)
    })

    it('should be false when only timeout/error recoveries exist', () => {
      const agent = createMockAgent({
        status: 'error',
        error: { recoverable: true, message: 'Error', code: 'ERR' },
      })
      setupMocks({
        agents: [agent],
        threads: {},
        workflow: createMockWorkflow([
          createMockPhase({ status: 'approval_timeout' }),
        ]),
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.hasDecisions).toBe(true)
      expect(result.current.hasCriticalDecisions).toBe(false)
    })
  })

  describe('workflow edge cases', () => {
    it('should handle workflow with no current phase', () => {
      setupMocks({
        workflow: {
          id: 'w1',
          name: 'Empty Workflow',
          description: 'Empty workflow description',
          status: 'running',
          phases: [],
          currentPhaseIndex: 0,
          createdAt: new Date(),
        },
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toHaveLength(0)
    })

    it('should only check current phase, not all phases', () => {
      const phases = [
        createMockPhase({ id: 'p1', status: 'completed' }),
        createMockPhase({ id: 'p2', status: 'awaiting_approval' }),
      ]

      setupMocks({
        workflow: {
          ...createMockWorkflow(phases),
          currentPhaseIndex: 0,
        },
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toHaveLength(0)
    })
  })

  describe('agent filtering', () => {
    it('should skip agents not in agentOrder', () => {
      const agent = createMockAgent({ id: 'orphan-agent' })
      setupMocks({
        agents: [agent],
        agentOrder: [],
        threads: { 'thread-1': { pendingApprovals: [{}] } },
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toHaveLength(0)
    })

    it('should handle missing thread for agent', () => {
      const agent = createMockAgent({ threadId: 'missing-thread' })
      setupMocks({
        agents: [agent],
        threads: {},
      })

      const { result } = renderHook(() => useDecisionQueue())

      expect(result.current.decisions).toHaveLength(0)
    })
  })
})
