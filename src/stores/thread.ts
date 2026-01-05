import { create } from 'zustand'
import { threadApi, snapshotApi, type ThreadInfo, type Snapshot } from '../lib/api'
import { parseError } from '../lib/errorUtils'
import type {
  ItemStartedEvent,
  ItemCompletedEvent,
  AgentMessageDeltaEvent,
  CommandApprovalRequestedEvent,
  FileChangeApprovalRequestedEvent,
  TurnCompletedEvent,
  TurnFailedEvent,
  ExecCommandBeginEvent,
  ExecCommandOutputDeltaEvent,
  ExecCommandEndEvent,
  ReasoningDeltaEvent,
  ReasoningCompletedEvent,
  McpToolCallBeginEvent,
  McpToolCallEndEvent,
  TokenUsageEvent,
  StreamErrorEvent,
} from '../lib/events'

// ==================== Thread Item Types ====================

export type ThreadItemType =
  | 'userMessage'
  | 'agentMessage'
  | 'commandExecution'
  | 'fileChange'
  | 'reasoning'
  | 'mcpTool'
  | 'webSearch'
  | 'error'

export interface ThreadItem {
  id: string
  type: ThreadItemType
  status: 'pending' | 'inProgress' | 'completed' | 'failed'
  content: unknown
  createdAt: number
}

export interface UserMessageItem extends ThreadItem {
  type: 'userMessage'
  content: {
    text: string
    images?: string[]
  }
}

export interface AgentMessageItem extends ThreadItem {
  type: 'agentMessage'
  content: {
    text: string
    isStreaming: boolean
  }
}

export interface CommandExecutionItem extends ThreadItem {
  type: 'commandExecution'
  content: {
    callId: string
    command: string | string[]
    cwd: string
    commandActions?: string[]
    output?: string
    stdout?: string
    stderr?: string
    exitCode?: number
    durationMs?: number
    needsApproval?: boolean
    approved?: boolean
    isRunning?: boolean
  }
}

export interface FileChangeItem extends ThreadItem {
  type: 'fileChange'
  content: {
    changes: Array<{
      path: string
      kind: 'add' | 'modify' | 'delete'
      diff: string
    }>
    needsApproval: boolean
    approved?: boolean
    applied?: boolean
    snapshotId?: string
  }
}

export interface ReasoningItem extends ThreadItem {
  type: 'reasoning'
  content: {
    summary: string[]
    fullContent?: string[]
    isStreaming: boolean
  }
}

export interface McpToolItem extends ThreadItem {
  type: 'mcpTool'
  content: {
    callId: string
    server: string
    tool: string
    arguments: unknown
    result?: unknown
    error?: string
    durationMs?: number
    isRunning: boolean
  }
}

export interface WebSearchItem extends ThreadItem {
  type: 'webSearch'
  content: {
    query: string
    results?: Array<{
      title: string
      url: string
      snippet: string
    }>
    isSearching: boolean
  }
}

export interface ErrorItem extends ThreadItem {
  type: 'error'
  content: {
    message: string
    errorType?: string
    httpStatusCode?: number
    willRetry?: boolean
  }
}

export type AnyThreadItem =
  | UserMessageItem
  | AgentMessageItem
  | CommandExecutionItem
  | FileChangeItem
  | ReasoningItem
  | McpToolItem
  | WebSearchItem
  | ErrorItem
  | ThreadItem

// ==================== Turn Status ====================

export type TurnStatus = 'idle' | 'running' | 'completed' | 'failed' | 'interrupted'

// ==================== Pending Approval ====================

export interface PendingApproval {
  itemId: string
  type: 'command' | 'fileChange'
  data: CommandApprovalRequestedEvent | FileChangeApprovalRequestedEvent
  requestId: number // JSON-RPC request ID for responding
}

// ==================== Store State ====================

// Token usage statistics
export interface TokenUsage {
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  totalTokens: number
}

interface ThreadState {
  activeThread: ThreadInfo | null
  items: Map<string, AnyThreadItem>
  itemOrder: string[]
  turnStatus: TurnStatus
  currentTurnId: string | null
  pendingApprovals: PendingApproval[]
  snapshots: Snapshot[]
  tokenUsage: TokenUsage
  isLoading: boolean
  error: string | null

  // Actions
  startThread: (
    projectId: string,
    cwd: string,
    model?: string,
    sandboxMode?: string,
    approvalPolicy?: string
  ) => Promise<void>
  resumeThread: (threadId: string) => Promise<void>
  sendMessage: (text: string, images?: string[]) => Promise<void>
  interrupt: () => Promise<void>
  respondToApproval: (
    itemId: string,
    decision: 'accept' | 'acceptForSession' | 'acceptAlways' | 'decline',
    snapshotId?: string
  ) => Promise<void>
  clearThread: () => void

  // Event handlers
  handleItemStarted: (event: ItemStartedEvent) => void
  handleItemCompleted: (event: ItemCompletedEvent) => void
  handleAgentMessageDelta: (event: AgentMessageDeltaEvent) => void
  handleCommandApprovalRequested: (event: CommandApprovalRequestedEvent) => void
  handleFileChangeApprovalRequested: (event: FileChangeApprovalRequestedEvent) => void
  handleTurnCompleted: (event: TurnCompletedEvent) => void
  handleTurnFailed: (event: TurnFailedEvent) => void
  handleExecCommandBegin: (event: ExecCommandBeginEvent) => void
  handleExecCommandOutputDelta: (event: ExecCommandOutputDeltaEvent) => void
  handleExecCommandEnd: (event: ExecCommandEndEvent) => void
  // New event handlers
  handleReasoningDelta: (event: ReasoningDeltaEvent) => void
  handleReasoningCompleted: (event: ReasoningCompletedEvent) => void
  handleMcpToolCallBegin: (event: McpToolCallBeginEvent) => void
  handleMcpToolCallEnd: (event: McpToolCallEndEvent) => void
  handleTokenUsage: (event: TokenUsageEvent) => void
  handleStreamError: (event: StreamErrorEvent) => void

  // Snapshot actions
  createSnapshot: (projectPath: string) => Promise<Snapshot>
  revertToSnapshot: (snapshotId: string, projectPath: string) => Promise<void>
  fetchSnapshots: () => Promise<void>
}

// Helper to map item types from server to our types
function mapItemType(type: string): ThreadItemType {
  const typeMap: Record<string, ThreadItemType> = {
    'user_message': 'userMessage',
    'userMessage': 'userMessage',
    'agent_message': 'agentMessage',
    'agentMessage': 'agentMessage',
    'message': 'agentMessage',
    'command_execution': 'commandExecution',
    'commandExecution': 'commandExecution',
    'tool_call': 'commandExecution',
    'file_change': 'fileChange',
    'fileChange': 'fileChange',
    'reasoning': 'reasoning',
    'mcp_tool': 'mcpTool',
    'mcpTool': 'mcpTool',
    'web_search': 'webSearch',
    'webSearch': 'webSearch',
    'error': 'error',
  }
  return typeMap[type] || 'agentMessage'
}

// Default token usage
const defaultTokenUsage: TokenUsage = {
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
}

export const useThreadStore = create<ThreadState>((set, get) => ({
  activeThread: null,
  items: new Map(),
  itemOrder: [],
  turnStatus: 'idle',
  currentTurnId: null,
  pendingApprovals: [],
  snapshots: [],
  tokenUsage: defaultTokenUsage,
  isLoading: false,
  error: null,

  startThread: async (projectId, cwd, model, sandboxMode, approvalPolicy) => {
    set({ isLoading: true, error: null })
    try {
      const response = await threadApi.start(
        projectId,
        cwd,
        model,
        sandboxMode,
        approvalPolicy
      )
      set({
        activeThread: response.thread,
        items: new Map(),
        itemOrder: [],
        turnStatus: 'idle',
        pendingApprovals: [],
        isLoading: false,
      })
    } catch (error) {
      set({ error: parseError(error), isLoading: false })
      throw error
    }
  },

  resumeThread: async (threadId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await threadApi.resume(threadId)

      // Convert items from response to our format
      const items = new Map<string, AnyThreadItem>()
      const itemOrder: string[] = []

      for (const rawItem of response.items) {
        const item = rawItem as { id: string; type: string; content?: unknown }
        if (!item.id || !item.type) continue

        const threadItem: AnyThreadItem = {
          id: item.id,
          type: mapItemType(item.type),
          status: 'completed',
          content: item.content || {},
          createdAt: Date.now(),
        }

        items.set(item.id, threadItem)
        itemOrder.push(item.id)
      }

      set({
        activeThread: response.thread,
        items,
        itemOrder,
        turnStatus: 'idle',
        pendingApprovals: [],
        isLoading: false,
      })
    } catch (error) {
      set({ error: parseError(error), isLoading: false })
      throw error
    }
  },

  sendMessage: async (text, images) => {
    const { activeThread } = get()
    if (!activeThread) {
      throw new Error('No active thread')
    }

    // Add user message to items
    const userMessageId = `user-${Date.now()}`
    const userMessage: UserMessageItem = {
      id: userMessageId,
      type: 'userMessage',
      status: 'completed',
      content: { text, images },
      createdAt: Date.now(),
    }

    set((state) => ({
      items: new Map(state.items).set(userMessageId, userMessage),
      itemOrder: [...state.itemOrder, userMessageId],
      turnStatus: 'running',
    }))

    try {
      const response = await threadApi.sendMessage(activeThread.id, text, images)
      set({ currentTurnId: response.turn.id })
    } catch (error) {
      set({ turnStatus: 'failed', error: String(error) })
      throw error
    }
  },

  interrupt: async () => {
    const { activeThread } = get()
    if (!activeThread) return

    try {
      await threadApi.interrupt(activeThread.id)
      set({ turnStatus: 'interrupted' })
    } catch (error) {
      set({ error: parseError(error) })
    }
  },

  respondToApproval: async (itemId, decision, snapshotId) => {
    const { activeThread, pendingApprovals } = get()
    if (!activeThread) return

    // Find the pending approval to get the requestId
    const pendingApproval = pendingApprovals.find((p) => p.itemId === itemId)
    if (!pendingApproval) {
      console.error('No pending approval found for itemId:', itemId)
      return
    }

    try {
      await threadApi.respondToApproval(activeThread.id, itemId, decision, pendingApproval.requestId)

      // Update item status
      set((state) => {
        const items = new Map(state.items)
        const item = items.get(itemId)
        if (item && (item.type === 'commandExecution' || item.type === 'fileChange')) {
          const content = item.content as Record<string, unknown>
          const isApproved = decision !== 'decline'

          // For file changes, also set applied and snapshotId
          const extraFields =
            item.type === 'fileChange' && isApproved
              ? {
                  applied: true,
                  // Use the provided snapshotId (created before applying)
                  snapshotId: snapshotId,
                }
              : {}

          const updatedItem = {
            ...item,
            content: {
              ...content,
              needsApproval: false,
              approved: isApproved,
              ...extraFields,
            },
          }
          items.set(itemId, updatedItem as AnyThreadItem)
        }

        return {
          items,
          pendingApprovals: state.pendingApprovals.filter((p) => p.itemId !== itemId),
        }
      })
    } catch (error) {
      set({ error: parseError(error) })
      throw error
    }
  },

  clearThread: () => {
    set({
      activeThread: null,
      items: new Map(),
      itemOrder: [],
      turnStatus: 'idle',
      currentTurnId: null,
      pendingApprovals: [],
      snapshots: [],
      error: null,
    })
  },

  // Event Handlers
  handleItemStarted: (event) => {
    const item: ThreadItem = {
      id: event.itemId,
      type: event.type as ThreadItemType,
      status: 'inProgress',
      content: {},
      createdAt: Date.now(),
    }

    set((state) => ({
      items: new Map(state.items).set(event.itemId, item as AnyThreadItem),
      itemOrder: [...state.itemOrder, event.itemId],
    }))
  },

  handleItemCompleted: (event) => {
    set((state) => {
      const items = new Map(state.items)
      const existing = items.get(event.itemId)
      if (existing) {
        // Merge content to preserve approval state and other existing fields
        const existingContent = existing.content as Record<string, unknown>
        const newContent = event.content as Record<string, unknown>
        items.set(event.itemId, {
          ...existing,
          status: 'completed',
          content: {
            ...existingContent,
            ...newContent,
            // Preserve these fields from existing content if they exist
            needsApproval: existingContent.needsApproval ?? newContent.needsApproval,
            approved: existingContent.approved ?? newContent.approved,
            applied: existingContent.applied ?? newContent.applied,
          },
        } as AnyThreadItem)
      } else {
        // Create new item if it doesn't exist
        const item: AnyThreadItem = {
          id: event.itemId,
          type: mapItemType(event.type),
          status: 'completed',
          content: event.content,
          createdAt: Date.now(),
        }
        items.set(event.itemId, item)
        return {
          items,
          itemOrder: state.itemOrder.includes(event.itemId)
            ? state.itemOrder
            : [...state.itemOrder, event.itemId],
        }
      }
      return { items }
    })
  },

  handleAgentMessageDelta: (event) => {
    set((state) => {
      const items = new Map(state.items)
      const existing = items.get(event.itemId) as AgentMessageItem | undefined

      if (existing && existing.type === 'agentMessage') {
        items.set(event.itemId, {
          ...existing,
          content: {
            text: existing.content.text + event.delta,
            isStreaming: true,
          },
        })
      } else {
        // Create new agent message item
        const newItem: AgentMessageItem = {
          id: event.itemId,
          type: 'agentMessage',
          status: 'inProgress',
          content: {
            text: event.delta,
            isStreaming: true,
          },
          createdAt: Date.now(),
        }
        items.set(event.itemId, newItem)
        return {
          items,
          itemOrder: state.itemOrder.includes(event.itemId)
            ? state.itemOrder
            : [...state.itemOrder, event.itemId],
        }
      }

      return { items }
    })
  },

  handleCommandApprovalRequested: (event) => {
    const commandItem: CommandExecutionItem = {
      id: event.itemId,
      type: 'commandExecution',
      status: 'inProgress',
      content: {
        command: event.command,
        cwd: event.cwd,
        commandActions: event.commandActions,
        needsApproval: true,
      },
      createdAt: Date.now(),
    }

    set((state) => ({
      items: new Map(state.items).set(event.itemId, commandItem),
      itemOrder: state.itemOrder.includes(event.itemId)
        ? state.itemOrder
        : [...state.itemOrder, event.itemId],
      pendingApprovals: [
        ...state.pendingApprovals,
        { itemId: event.itemId, type: 'command', data: event, requestId: event._requestId },
      ],
    }))
  },

  handleFileChangeApprovalRequested: (event) => {
    const fileChangeItem: FileChangeItem = {
      id: event.itemId,
      type: 'fileChange',
      status: 'inProgress',
      content: {
        changes: event.changes,
        needsApproval: true,
      },
      createdAt: Date.now(),
    }

    set((state) => ({
      items: new Map(state.items).set(event.itemId, fileChangeItem),
      itemOrder: state.itemOrder.includes(event.itemId)
        ? state.itemOrder
        : [...state.itemOrder, event.itemId],
      pendingApprovals: [
        ...state.pendingApprovals,
        { itemId: event.itemId, type: 'fileChange', data: event, requestId: event._requestId },
      ],
    }))
  },

  handleTurnCompleted: (_event) => {
    set((state) => {
      // Mark all streaming items as complete
      const items = new Map(state.items)
      items.forEach((item, id) => {
        if (item.type === 'agentMessage' && (item as AgentMessageItem).content.isStreaming) {
          items.set(id, {
            ...item,
            status: 'completed',
            content: {
              ...(item as AgentMessageItem).content,
              isStreaming: false,
            },
          } as AgentMessageItem)
        }
      })

      return {
        items,
        turnStatus: 'completed',
        currentTurnId: null,
      }
    })
  },

  handleTurnFailed: (event) => {
    set({
      turnStatus: 'failed',
      error: event.error,
      currentTurnId: null,
    })
  },

  // Command Execution Handlers
  handleExecCommandBegin: (event) => {
    const commandItem: CommandExecutionItem = {
      id: event.callId,
      type: 'commandExecution',
      status: 'inProgress',
      content: {
        callId: event.callId,
        command: event.command,
        cwd: event.cwd,
        output: '',
        isRunning: true,
      },
      createdAt: Date.now(),
    }

    set((state) => ({
      items: new Map(state.items).set(event.callId, commandItem),
      itemOrder: state.itemOrder.includes(event.callId)
        ? state.itemOrder
        : [...state.itemOrder, event.callId],
    }))
  },

  handleExecCommandOutputDelta: (event) => {
    set((state) => {
      const items = new Map(state.items)
      const existing = items.get(event.callId) as CommandExecutionItem | undefined

      if (existing && existing.type === 'commandExecution') {
        items.set(event.callId, {
          ...existing,
          content: {
            ...existing.content,
            output: (existing.content.output || '') + event.delta,
          },
        })
      }

      return { items }
    })
  },

  handleExecCommandEnd: (event) => {
    set((state) => {
      const items = new Map(state.items)
      const existing = items.get(event.callId) as CommandExecutionItem | undefined

      if (existing && existing.type === 'commandExecution') {
        items.set(event.callId, {
          ...existing,
          status: 'completed',
          content: {
            ...existing.content,
            command: event.command,
            cwd: event.cwd,
            stdout: event.stdout,
            stderr: event.stderr,
            exitCode: event.exitCode,
            durationMs: event.durationMs,
            output: event.stdout + (event.stderr ? '\n' + event.stderr : ''),
            isRunning: false,
          },
        })
      } else {
        // Create new item if it doesn't exist (shouldn't happen normally)
        const newItem: CommandExecutionItem = {
          id: event.callId,
          type: 'commandExecution',
          status: 'completed',
          content: {
            callId: event.callId,
            command: event.command,
            cwd: event.cwd,
            stdout: event.stdout,
            stderr: event.stderr,
            exitCode: event.exitCode,
            durationMs: event.durationMs,
            output: event.stdout + (event.stderr ? '\n' + event.stderr : ''),
            isRunning: false,
          },
          createdAt: Date.now(),
        }
        items.set(event.callId, newItem)
        return {
          items,
          itemOrder: state.itemOrder.includes(event.callId)
            ? state.itemOrder
            : [...state.itemOrder, event.callId],
        }
      }

      return { items }
    })
  },

  // Reasoning Handlers
  handleReasoningDelta: (event) => {
    set((state) => {
      const items = new Map(state.items)
      const existing = items.get(event.itemId) as ReasoningItem | undefined

      if (existing && existing.type === 'reasoning') {
        const summary = [...existing.content.summary]
        const index = event.summaryIndex ?? 0
        summary[index] = (summary[index] || '') + event.delta

        items.set(event.itemId, {
          ...existing,
          content: {
            ...existing.content,
            summary,
            isStreaming: true,
          },
        })
      } else {
        // Create new reasoning item
        const summary: string[] = []
        const index = event.summaryIndex ?? 0
        summary[index] = event.delta

        const newItem: ReasoningItem = {
          id: event.itemId,
          type: 'reasoning',
          status: 'inProgress',
          content: {
            summary,
            isStreaming: true,
          },
          createdAt: Date.now(),
        }
        items.set(event.itemId, newItem)
        return {
          items,
          itemOrder: state.itemOrder.includes(event.itemId)
            ? state.itemOrder
            : [...state.itemOrder, event.itemId],
        }
      }

      return { items }
    })
  },

  handleReasoningCompleted: (event) => {
    set((state) => {
      const items = new Map(state.items)
      const existing = items.get(event.itemId) as ReasoningItem | undefined

      if (existing && existing.type === 'reasoning') {
        items.set(event.itemId, {
          ...existing,
          status: 'completed',
          content: {
            summary: event.summary,
            fullContent: event.content,
            isStreaming: false,
          },
        })
      } else {
        // Create completed reasoning item
        const newItem: ReasoningItem = {
          id: event.itemId,
          type: 'reasoning',
          status: 'completed',
          content: {
            summary: event.summary,
            fullContent: event.content,
            isStreaming: false,
          },
          createdAt: Date.now(),
        }
        items.set(event.itemId, newItem)
        return {
          items,
          itemOrder: state.itemOrder.includes(event.itemId)
            ? state.itemOrder
            : [...state.itemOrder, event.itemId],
        }
      }

      return { items }
    })
  },

  // MCP Tool Handlers
  handleMcpToolCallBegin: (event) => {
    const mcpItem: McpToolItem = {
      id: event.callId,
      type: 'mcpTool',
      status: 'inProgress',
      content: {
        callId: event.callId,
        server: event.server,
        tool: event.tool,
        arguments: event.arguments,
        isRunning: true,
      },
      createdAt: Date.now(),
    }

    set((state) => ({
      items: new Map(state.items).set(event.callId, mcpItem),
      itemOrder: state.itemOrder.includes(event.callId)
        ? state.itemOrder
        : [...state.itemOrder, event.callId],
    }))
  },

  handleMcpToolCallEnd: (event) => {
    set((state) => {
      const items = new Map(state.items)
      const existing = items.get(event.callId) as McpToolItem | undefined

      if (existing && existing.type === 'mcpTool') {
        items.set(event.callId, {
          ...existing,
          status: event.error ? 'failed' : 'completed',
          content: {
            ...existing.content,
            result: event.result,
            error: event.error,
            durationMs: event.durationMs,
            isRunning: false,
          },
        })
      } else {
        // Create completed MCP item
        const newItem: McpToolItem = {
          id: event.callId,
          type: 'mcpTool',
          status: event.error ? 'failed' : 'completed',
          content: {
            callId: event.callId,
            server: event.server,
            tool: event.tool,
            arguments: {},
            result: event.result,
            error: event.error,
            durationMs: event.durationMs,
            isRunning: false,
          },
          createdAt: Date.now(),
        }
        items.set(event.callId, newItem)
        return {
          items,
          itemOrder: state.itemOrder.includes(event.callId)
            ? state.itemOrder
            : [...state.itemOrder, event.callId],
        }
      }

      return { items }
    })
  },

  // Token Usage Handler
  handleTokenUsage: (event) => {
    set((state) => {
      const newInput = state.tokenUsage.inputTokens + event.inputTokens
      const newCached = state.tokenUsage.cachedInputTokens + event.cachedInputTokens
      const newOutput = state.tokenUsage.outputTokens + event.outputTokens

      return {
        tokenUsage: {
          inputTokens: newInput,
          cachedInputTokens: newCached,
          outputTokens: newOutput,
          totalTokens: newInput + newOutput,
        },
      }
    })
  },

  // Stream Error Handler
  handleStreamError: (event) => {
    const errorItem: ErrorItem = {
      id: `error-${Date.now()}`,
      type: 'error',
      status: 'completed',
      content: {
        message: event.message,
        errorType: event.errorInfo?.type,
        httpStatusCode: event.errorInfo?.httpStatusCode,
        willRetry: event.willRetry,
      },
      createdAt: Date.now(),
    }

    set((state) => ({
      items: new Map(state.items).set(errorItem.id, errorItem),
      itemOrder: [...state.itemOrder, errorItem.id],
      error: event.message,
    }))
  },

  // Snapshot Actions
  createSnapshot: async (projectPath) => {
    const { activeThread } = get()
    if (!activeThread) {
      throw new Error('No active thread')
    }

    const snapshot = await snapshotApi.create(activeThread.id, projectPath)
    set((state) => ({
      snapshots: [snapshot, ...state.snapshots],
    }))
    return snapshot
  },

  revertToSnapshot: async (snapshotId, projectPath) => {
    await snapshotApi.revert(snapshotId, projectPath)
  },

  fetchSnapshots: async () => {
    const { activeThread } = get()
    if (!activeThread) return

    try {
      const snapshots = await snapshotApi.list(activeThread.id)
      set({ snapshots })
    } catch (error) {
      console.error('Failed to fetch snapshots:', error)
    }
  },
}))
