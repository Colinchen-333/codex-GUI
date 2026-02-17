import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSwarmStore, type SwarmTask, type SwarmWorker, type SwarmContext } from '../swarm'

// Mock crypto.randomUUID for deterministic IDs
let uuidCounter = 0
vi.stubGlobal('crypto', {
  randomUUID: () => `uuid-${++uuidCounter}`,
})

function makeTask(overrides: Partial<SwarmTask> = {}): SwarmTask {
  return {
    id: 'task-1',
    title: 'Test task',
    description: 'A test task',
    testCommand: 'npm test',
    status: 'pending',
    assignedWorker: null,
    dependsOn: [],
    mergeCommitSha: null,
    ...overrides,
  }
}

function makeWorker(overrides: Partial<SwarmWorker> = {}): SwarmWorker {
  return {
    id: 'worker-1',
    name: 'Worker 1',
    threadId: 'thread-1',
    worktreePath: '/tmp/worktree-1',
    worktreeBranch: 'swarm/task-1',
    status: 'idle',
    currentTaskId: null,
    lastMessage: null,
    ...overrides,
  }
}

describe('useSwarmStore', () => {
  beforeEach(() => {
    useSwarmStore.getState().reset()
    uuidCounter = 0
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useSwarmStore.getState()
      expect(state.isActive).toBe(false)
      expect(state.phase).toBe('idle')
      expect(state.userRequest).toBeNull()
      expect(state.teamLeadThreadId).toBeNull()
      expect(state.tasks).toEqual([])
      expect(state.workers).toEqual([])
      expect(state.messages).toEqual([])
      expect(state.context).toBeNull()
      expect(state.error).toBeNull()
      expect(state.testOutput).toBeNull()
      expect(state.testsPass).toBeNull()
      expect(state.stagingDiff).toBeNull()
      expect(state.startedAt).toBeNull()
    })
  })

  describe('activate / deactivate', () => {
    it('activates the swarm', () => {
      useSwarmStore.getState().activate()
      const state = useSwarmStore.getState()
      expect(state.isActive).toBe(true)
      expect(state.phase).toBe('idle')
      expect(state.error).toBeNull()
    })

    it('deactivate resets to initial state', () => {
      useSwarmStore.getState().activate()
      useSwarmStore.getState().setPhase('working')
      useSwarmStore.getState().addTask(makeTask())

      useSwarmStore.getState().deactivate()

      const state = useSwarmStore.getState()
      expect(state.isActive).toBe(false)
      expect(state.phase).toBe('idle')
      expect(state.tasks).toEqual([])
    })
  })

  describe('setPhase', () => {
    it('sets phase', () => {
      useSwarmStore.getState().setPhase('planning')
      expect(useSwarmStore.getState().phase).toBe('planning')
    })

    it('sets startedAt on first exploring phase', () => {
      expect(useSwarmStore.getState().startedAt).toBeNull()

      useSwarmStore.getState().setPhase('exploring')

      expect(useSwarmStore.getState().startedAt).toBeGreaterThan(0)
    })

    it('does not overwrite startedAt on subsequent phase changes', () => {
      useSwarmStore.getState().setPhase('exploring')
      const firstStartedAt = useSwarmStore.getState().startedAt

      useSwarmStore.getState().setPhase('planning')

      expect(useSwarmStore.getState().startedAt).toBe(firstStartedAt)
    })
  })

  describe('setUserRequest', () => {
    it('stores the user request', () => {
      useSwarmStore.getState().setUserRequest('Build a new feature')
      expect(useSwarmStore.getState().userRequest).toBe('Build a new feature')
    })
  })

  describe('setTeamLeadThread', () => {
    it('stores the team lead thread ID', () => {
      useSwarmStore.getState().setTeamLeadThread('thread-lead')
      expect(useSwarmStore.getState().teamLeadThreadId).toBe('thread-lead')
    })
  })

  describe('setContext', () => {
    it('stores the swarm context', () => {
      const ctx: SwarmContext = {
        stagingBranch: 'swarm/staging',
        originalBranch: 'main',
        projectPath: '/project',
        projectId: 'proj-1',
        workerPaths: ['/tmp/w1', '/tmp/w2'],
      }
      useSwarmStore.getState().setContext(ctx)
      expect(useSwarmStore.getState().context).toEqual(ctx)
    })
  })

  describe('task management', () => {
    it('addTask appends a task', () => {
      useSwarmStore.getState().addTask(makeTask({ id: 't1' }))
      useSwarmStore.getState().addTask(makeTask({ id: 't2' }))

      const tasks = useSwarmStore.getState().tasks
      expect(tasks).toHaveLength(2)
      expect(tasks[0].id).toBe('t1')
      expect(tasks[1].id).toBe('t2')
    })

    it('updateTaskStatus changes status', () => {
      useSwarmStore.getState().addTask(makeTask({ id: 't1', status: 'pending' }))

      useSwarmStore.getState().updateTaskStatus('t1', 'in_progress', 'worker-1')

      const task = useSwarmStore.getState().tasks[0]
      expect(task.status).toBe('in_progress')
      expect(task.assignedWorker).toBe('worker-1')
    })

    it('updateTaskStatus preserves assignedWorker when workerId is undefined', () => {
      useSwarmStore.getState().addTask(
        makeTask({ id: 't1', assignedWorker: 'worker-1' })
      )

      useSwarmStore.getState().updateTaskStatus('t1', 'merged')

      const task = useSwarmStore.getState().tasks[0]
      expect(task.status).toBe('merged')
      expect(task.assignedWorker).toBe('worker-1')
    })

    it('updateTaskStatus can clear assignedWorker with null', () => {
      useSwarmStore.getState().addTask(
        makeTask({ id: 't1', assignedWorker: 'worker-1' })
      )

      useSwarmStore.getState().updateTaskStatus('t1', 'pending', null)

      expect(useSwarmStore.getState().tasks[0].assignedWorker).toBeNull()
    })

    it('setTasks replaces all tasks', () => {
      useSwarmStore.getState().addTask(makeTask({ id: 'old' }))

      useSwarmStore.getState().setTasks([
        makeTask({ id: 'new1' }),
        makeTask({ id: 'new2' }),
      ])

      const tasks = useSwarmStore.getState().tasks
      expect(tasks).toHaveLength(2)
      expect(tasks[0].id).toBe('new1')
    })
  })

  describe('worker management', () => {
    it('addWorker appends a worker', () => {
      useSwarmStore.getState().addWorker(makeWorker({ id: 'w1' }))
      expect(useSwarmStore.getState().workers).toHaveLength(1)
    })

    it('updateWorker applies partial updates', () => {
      useSwarmStore.getState().addWorker(makeWorker({ id: 'w1', status: 'idle' }))

      useSwarmStore.getState().updateWorker('w1', {
        status: 'working',
        currentTaskId: 't1',
      })

      const worker = useSwarmStore.getState().workers[0]
      expect(worker.status).toBe('working')
      expect(worker.currentTaskId).toBe('t1')
      expect(worker.name).toBe('Worker 1') // unchanged
    })

    it('removeWorker removes by ID', () => {
      useSwarmStore.getState().addWorker(makeWorker({ id: 'w1' }))
      useSwarmStore.getState().addWorker(makeWorker({ id: 'w2' }))

      useSwarmStore.getState().removeWorker('w1')

      const workers = useSwarmStore.getState().workers
      expect(workers).toHaveLength(1)
      expect(workers[0].id).toBe('w2')
    })
  })

  describe('addMessage', () => {
    it('appends a message with generated id and timestamp', () => {
      useSwarmStore.getState().addMessage({
        from: 'orchestrator',
        content: 'Starting task',
        type: 'status',
      })

      const msgs = useSwarmStore.getState().messages
      expect(msgs).toHaveLength(1)
      expect(msgs[0].id).toBe('uuid-1')
      expect(msgs[0].from).toBe('orchestrator')
      expect(msgs[0].content).toBe('Starting task')
      expect(msgs[0].type).toBe('status')
      expect(msgs[0].timestamp).toBeGreaterThan(0)
    })

    it('caps messages at 200 entries', () => {
      // Pre-fill with 200 messages
      const existing = Array.from({ length: 200 }, (_, i) => ({
        id: `msg-${i}`,
        from: 'test',
        content: `Message ${i}`,
        timestamp: i,
        type: 'status' as const,
      }))
      useSwarmStore.setState({ messages: existing })

      useSwarmStore.getState().addMessage({
        from: 'test',
        content: 'New message',
        type: 'broadcast',
      })

      const msgs = useSwarmStore.getState().messages
      expect(msgs).toHaveLength(200)
      // The oldest message should be trimmed, newest preserved
      expect(msgs[msgs.length - 1].content).toBe('New message')
      expect(msgs[0].id).toBe('msg-1') // msg-0 was trimmed
    })
  })

  describe('results', () => {
    it('setTestResults stores output and pass flag', () => {
      useSwarmStore.getState().setTestResults('All tests passed', true)

      const state = useSwarmStore.getState()
      expect(state.testOutput).toBe('All tests passed')
      expect(state.testsPass).toBe(true)
    })

    it('setStagingDiff stores diff string', () => {
      useSwarmStore.getState().setStagingDiff('diff --git a/file.ts b/file.ts')

      expect(useSwarmStore.getState().stagingDiff).toBe(
        'diff --git a/file.ts b/file.ts'
      )
    })

    it('setError stores error message', () => {
      useSwarmStore.getState().setError('Something went wrong')
      expect(useSwarmStore.getState().error).toBe('Something went wrong')
    })

    it('setError can clear error with null', () => {
      useSwarmStore.getState().setError('error')
      useSwarmStore.getState().setError(null)
      expect(useSwarmStore.getState().error).toBeNull()
    })
  })

  describe('reset', () => {
    it('resets all state to initial values', () => {
      useSwarmStore.getState().activate()
      useSwarmStore.getState().setPhase('working')
      useSwarmStore.getState().addTask(makeTask())
      useSwarmStore.getState().addWorker(makeWorker())
      useSwarmStore.getState().setError('fail')

      useSwarmStore.getState().reset()

      const state = useSwarmStore.getState()
      expect(state.isActive).toBe(false)
      expect(state.phase).toBe('idle')
      expect(state.tasks).toEqual([])
      expect(state.workers).toEqual([])
      expect(state.error).toBeNull()
    })
  })
})
