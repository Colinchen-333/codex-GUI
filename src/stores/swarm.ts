import { create } from 'zustand'

// ==================== Types ====================

export type SwarmPhase =
  | 'idle'
  | 'exploring'
  | 'planning'
  | 'awaiting_approval'
  | 'spawning'
  | 'working'
  | 'reviewing'
  | 'testing'
  | 'completed'
  | 'failed'
  | 'cleaning_up'

export type SwarmTaskStatus = 'pending' | 'in_progress' | 'merging' | 'merged' | 'failed'

export interface SwarmTask {
  id: string
  title: string
  description: string
  testCommand: string
  status: SwarmTaskStatus
  assignedWorker: string | null
  dependsOn: string[]
  mergeCommitSha: string | null
}

export interface SwarmWorker {
  id: string
  name: string
  threadId: string
  worktreePath: string
  worktreeBranch: string
  status: 'starting' | 'working' | 'idle' | 'merging' | 'done' | 'failed'
  currentTaskId: string | null
  lastMessage: string | null
}

export interface SwarmMessage {
  id: string
  from: string
  content: string
  timestamp: number
  type: 'broadcast' | 'discovery' | 'status' | 'error'
}

export interface SwarmContext {
  stagingBranch: string
  originalBranch: string
  projectPath: string
  projectId: string
  workerPaths: string[]
}

// ==================== State Interface ====================

export interface SwarmState {
  // Core state
  isActive: boolean
  phase: SwarmPhase
  userRequest: string | null
  teamLeadThreadId: string | null

  // Task board
  tasks: SwarmTask[]

  // Workers
  workers: SwarmWorker[]

  // Messages
  messages: SwarmMessage[]

  // Context
  context: SwarmContext | null

  // Plan approval
  approvalState: 'pending' | 'approved' | 'rejected' | null

  // Results
  error: string | null
  testOutput: string | null
  testsPass: boolean | null
  stagingDiff: string | null

  // Per-task accept/reject decisions
  taskDecisions: Record<string, 'accept' | 'reject'>

  // Token usage tracking
  tokenUsage: { totalTokens: number; perWorker: Record<string, number> }

  // Elapsed time
  startedAt: number | null

  // Actions
  activate: () => void
  deactivate: () => void
  setPhase: (phase: SwarmPhase) => void
  setUserRequest: (request: string) => void
  setTeamLeadThread: (threadId: string) => void
  setContext: (ctx: SwarmContext) => void

  addTask: (task: SwarmTask) => void
  updateTaskStatus: (taskId: string, status: SwarmTaskStatus, workerId?: string | null) => void
  setTasks: (tasks: SwarmTask[]) => void

  addWorker: (worker: SwarmWorker) => void
  updateWorker: (workerId: string, updates: Partial<SwarmWorker>) => void
  removeWorker: (workerId: string) => void

  addMessage: (msg: Omit<SwarmMessage, 'id' | 'timestamp'>) => void

  approvePlan: () => void
  rejectPlan: () => void

  setTaskMergeCommit: (taskId: string, sha: string) => void

  setTaskDecision: (taskId: string, decision: 'accept' | 'reject') => void
  clearTaskDecisions: () => void

  updateTokenUsage: (workerId: string, tokens: number) => void

  setTestResults: (output: string, pass: boolean) => void
  setStagingDiff: (diff: string) => void
  setError: (error: string | null) => void

  reset: () => void
}

// ==================== Initial State ====================

const initialState = {
  isActive: false,
  phase: 'idle' as SwarmPhase,
  userRequest: null,
  teamLeadThreadId: null,
  tasks: [] as SwarmTask[],
  workers: [] as SwarmWorker[],
  messages: [] as SwarmMessage[],
  context: null as SwarmContext | null,
  approvalState: null as 'pending' | 'approved' | 'rejected' | null,
  taskDecisions: {} as Record<string, 'accept' | 'reject'>,
  tokenUsage: { totalTokens: 0, perWorker: {} as Record<string, number> },
  error: null as string | null,
  testOutput: null as string | null,
  testsPass: null as boolean | null,
  stagingDiff: null as string | null,
  startedAt: null as number | null,
}

// ==================== Store ====================

export const useSwarmStore = create<SwarmState>((set) => ({
  ...initialState,

  activate: () => {
    set({
      isActive: true,
      phase: 'idle',
      startedAt: null,
      error: null,
      taskDecisions: {},
    })
  },

  deactivate: () => {
    set({ ...initialState })
  },

  setPhase: (phase) => {
    set((state) => ({
      phase,
      startedAt: phase === 'exploring' && !state.startedAt ? Date.now() : state.startedAt,
    }))
  },

  setUserRequest: (request) => {
    set({ userRequest: request })
  },

  setTeamLeadThread: (threadId) => {
    set({ teamLeadThreadId: threadId })
  },

  setContext: (ctx) => {
    set({ context: ctx })
  },

  addTask: (task) => {
    set((state) => ({
      tasks: [...state.tasks, task],
    }))
  },

  updateTaskStatus: (taskId, status, workerId) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              assignedWorker: workerId !== undefined ? workerId : t.assignedWorker,
            }
          : t
      ),
    }))
  },

  setTasks: (tasks) => {
    set({ tasks })
  },

  addWorker: (worker) => {
    set((state) => ({
      workers: [...state.workers, worker],
    }))
  },

  updateWorker: (workerId, updates) => {
    set((state) => ({
      workers: state.workers.map((w) =>
        w.id === workerId ? { ...w, ...updates } : w
      ),
    }))
  },

  removeWorker: (workerId) => {
    set((state) => ({
      workers: state.workers.filter((w) => w.id !== workerId),
    }))
  },

  addMessage: (msg) => {
    set((state) => {
      const next = [
        ...state.messages,
        { ...msg, id: crypto.randomUUID(), timestamp: Date.now() },
      ]
      return { messages: next.length > 200 ? next.slice(-200) : next }
    })
  },

  approvePlan: () => {
    set({ approvalState: 'approved' })
  },

  rejectPlan: () => {
    set({ approvalState: 'rejected' })
  },

  setTaskMergeCommit: (taskId, sha) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, mergeCommitSha: sha } : t
      ),
    }))
  },

  setTaskDecision: (taskId, decision) => {
    set((state) => ({
      taskDecisions: { ...state.taskDecisions, [taskId]: decision },
    }))
  },

  clearTaskDecisions: () => {
    set({ taskDecisions: {} })
  },

  updateTokenUsage: (workerId, tokens) => {
    set((state) => ({
      tokenUsage: {
        totalTokens: state.tokenUsage.totalTokens + tokens,
        perWorker: {
          ...state.tokenUsage.perWorker,
          [workerId]: (state.tokenUsage.perWorker[workerId] || 0) + tokens,
        },
      },
    }))
  },

  setTestResults: (output, pass) => {
    set({ testOutput: output, testsPass: pass })
  },

  setStagingDiff: (diff) => {
    set({ stagingDiff: diff })
  },

  setError: (error) => {
    set({ error })
  },

  reset: () => {
    set({ ...initialState })
  },
}))
