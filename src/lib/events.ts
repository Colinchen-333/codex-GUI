import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { log } from './logger'

// ==================== Event Types ====================

export interface ThreadInfoPayload {
  id: string
  cwd: string
  model?: string | null
  modelProvider?: string | null
  preview?: string | null
  createdAt?: number | null
  cliVersion?: string | null
  gitInfo?: {
    sha?: string | null
    branch?: string | null
    originUrl?: string | null
  } | null
}

export interface TurnErrorPayload {
  message: string
  codexErrorInfo?: unknown
  additionalDetails?: string | null
}

export interface TurnInfoPayload {
  id: string
  status: string
  items?: unknown[]
  error?: TurnErrorPayload | null
}

export interface ThreadStartedEvent {
  thread: ThreadInfoPayload
}

export interface TurnStartedEvent {
  threadId: string
  turn: TurnInfoPayload
}

export interface TurnCompletedEvent {
  threadId: string
  turn: TurnInfoPayload
}

export interface TurnDiffUpdatedEvent {
  threadId: string
  turnId: string
  diff: string
}

export interface TurnPlanUpdatedEvent {
  threadId: string
  turnId: string
  explanation?: string | null
  plan: Array<{
    step: string
    status: string
  }>
}

export interface ThreadCompactedEvent {
  threadId: string
  turnId: string
  summary?: string[] | string
}

// Item lifecycle events
export interface ThreadItemPayload {
  id: string
  type: string
  [key: string]: unknown
}

export interface ItemStartedEvent {
  item: ThreadItemPayload
  threadId: string
  turnId: string
}

export interface ItemCompletedEvent {
  item: ThreadItemPayload
  threadId: string
  turnId: string
}

// Agent message events
export interface AgentMessageDeltaEvent {
  itemId: string
  threadId: string
  turnId: string
  delta: string
}

// Reasoning events
export interface ReasoningSummaryTextDeltaEvent {
  itemId: string
  threadId: string
  turnId: string
  delta: string
  summaryIndex?: number
}

export interface ReasoningSummaryPartAddedEvent {
  itemId: string
  threadId: string
  turnId: string
  summaryIndex: number
}

export interface ReasoningTextDeltaEvent {
  itemId: string
  threadId: string
  turnId: string
  delta: string
  contentIndex?: number
}

// Command execution events
export interface CommandExecutionOutputDeltaEvent {
  itemId: string
  threadId: string
  turnId: string
  delta: string
}

// File change events
export interface FileChangeOutputDeltaEvent {
  itemId: string
  threadId: string
  turnId: string
  delta: string
}

// Tool call event (item/tool/call)
export interface ItemToolCallEvent {
  itemId: string
  threadId: string
  turnId: string
  tool: {
    name: string
    arguments?: unknown
    result?: unknown
  }
}

// Plan delta streaming event (item/plan/delta)
export interface ItemPlanDeltaEvent {
  threadId: string
  turnId: string
  delta: string
}

// Connected apps list updated (app/list/updated)
export interface AppListUpdatedEvent {
  apps: Array<{
    id: string
    name: string
    [key: string]: unknown
  }>
}

// Automation runs updated
export interface AutomationRunsUpdatedEvent {
  automationId: string
  runs: Array<{
    id: string
    status: string
    startedAt?: number | null
    completedAt?: number | null
    result?: unknown
    [key: string]: unknown
  }>
}

// MCP tool events
export interface McpToolCallProgressEvent {
  itemId: string
  threadId: string
  turnId: string
  message: string
}

// Token usage event
export interface TokenUsageEvent {
  threadId: string
  turnId: string
  tokenUsage: {
    total: {
      totalTokens: number
      inputTokens: number
      cachedInputTokens: number
      outputTokens: number
      reasoningOutputTokens?: number
    }
    last: {
      totalTokens: number
      inputTokens: number
      cachedInputTokens: number
      outputTokens: number
      reasoningOutputTokens?: number
    }
    modelContextWindow?: number | null
  }
}

// Error events
export interface StreamErrorEvent {
  threadId: string
  turnId: string
  error: TurnErrorPayload
  willRetry: boolean
}

// Rate limit event
export interface RateLimitExceededEvent {
  threadId: string
  turnId: string
  retryAfterMs?: number
}

export interface CommandApprovalRequestedEvent {
  itemId: string
  threadId: string
  turnId: string
  reason?: string | null
  proposedExecpolicyAmendment?: { command: string[] } | null
  _requestId: number // JSON-RPC request ID for responding
}

export interface FileChangeApprovalRequestedEvent {
  itemId: string
  threadId: string
  turnId: string
  reason?: string | null
  grantRoot?: string | null
  _requestId: number // JSON-RPC request ID for responding
}

export type ServerDisconnectedEvent = Record<string, never>

// ==================== Event Handlers ====================

export type EventHandlers = {
  // Thread lifecycle
  onThreadStarted?: (event: ThreadStartedEvent) => void
  onTurnStarted?: (event: TurnStartedEvent) => void
  onTurnCompleted?: (event: TurnCompletedEvent) => void
  onTurnDiffUpdated?: (event: TurnDiffUpdatedEvent) => void
  onTurnPlanUpdated?: (event: TurnPlanUpdatedEvent) => void
  onThreadCompacted?: (event: ThreadCompactedEvent) => void

  // Item lifecycle
  onItemStarted?: (event: ItemStartedEvent) => void
  onItemCompleted?: (event: ItemCompletedEvent) => void

  // Agent message
  onAgentMessageDelta?: (event: AgentMessageDeltaEvent) => void

  // Reasoning
  onReasoningSummaryTextDelta?: (event: ReasoningSummaryTextDeltaEvent) => void
  onReasoningSummaryPartAdded?: (event: ReasoningSummaryPartAddedEvent) => void
  onReasoningTextDelta?: (event: ReasoningTextDeltaEvent) => void

  // Command execution
  onCommandExecutionOutputDelta?: (event: CommandExecutionOutputDeltaEvent) => void
  onFileChangeOutputDelta?: (event: FileChangeOutputDeltaEvent) => void

  // Tool call & plan delta (item-level granular events)
  onItemToolCall?: (event: ItemToolCallEvent) => void
  onItemPlanDelta?: (event: ItemPlanDeltaEvent) => void

  // MCP tools
  onMcpToolCallProgress?: (event: McpToolCallProgressEvent) => void

  // Token usage
  onTokenUsage?: (event: TokenUsageEvent) => void

  // Approvals
  onCommandApprovalRequested?: (event: CommandApprovalRequestedEvent) => void
  onFileChangeApprovalRequested?: (event: FileChangeApprovalRequestedEvent) => void

  // Errors
  onStreamError?: (event: StreamErrorEvent) => void
  onServerDisconnected?: (event: ServerDisconnectedEvent) => void

  // Rate limiting
  onRateLimitExceeded?: (event: RateLimitExceededEvent) => void

  // Account & server notifications (official protocol)
  onAccountUpdated?: (event: Record<string, unknown>) => void
  onAccountLoginCompleted?: (event: Record<string, unknown>) => void
  onAccountRateLimitsUpdated?: (event: Record<string, unknown>) => void
  onThreadStatusChanged?: (event: { threadId: string; status: string }) => void
  onThreadNameUpdated?: (event: { threadId: string; name: string }) => void
  onThreadArchived?: (event: { threadId: string }) => void
  onThreadUnarchived?: (event: { threadId: string }) => void
  onSkillsChanged?: (event: Record<string, unknown>) => void
  onModelRerouted?: (event: { threadId: string; originalModel: string; routedModel: string }) => void
  onServerReconnected?: (event: Record<string, unknown>) => void

  // Apps & automations
  onAppListUpdated?: (event: AppListUpdatedEvent) => void
  onAutomationRunsUpdated?: (event: AutomationRunsUpdatedEvent) => void
}

// ==================== Setup Event Listeners ====================

export async function setupEventListeners(
  handlers: EventHandlers
): Promise<UnlistenFn[]> {
  if (typeof window === 'undefined') return []
  const tauriEvent = (window as { __TAURI__?: { event?: { listen?: unknown } } }).__TAURI__?.event?.listen
  if (typeof tauriEvent !== 'function') return []
  log.info('setupEventListeners called', 'Events')

  // Define all event-handler pairs for parallel registration
  const eventHandlerPairs: Array<[string, EventHandlers[keyof EventHandlers]]> = [
    // Thread lifecycle
    ['thread-started', handlers.onThreadStarted],
    ['turn-started', handlers.onTurnStarted],
    ['turn-completed', handlers.onTurnCompleted],
    ['turn-diff-updated', handlers.onTurnDiffUpdated],
    ['turn-plan-updated', handlers.onTurnPlanUpdated],
    ['thread-compacted', handlers.onThreadCompacted],
    // Item lifecycle
    ['item-started', handlers.onItemStarted],
    ['item-completed', handlers.onItemCompleted],
    // Agent message
    ['item-agentMessage-delta', handlers.onAgentMessageDelta],
    // Reasoning
    ['item-reasoning-summaryTextDelta', handlers.onReasoningSummaryTextDelta],
    ['item-reasoning-summaryPartAdded', handlers.onReasoningSummaryPartAdded],
    ['item-reasoning-textDelta', handlers.onReasoningTextDelta],
    // Command execution + file change output
    ['item-commandExecution-outputDelta', handlers.onCommandExecutionOutputDelta],
    ['item-fileChange-outputDelta', handlers.onFileChangeOutputDelta],
    // Tool call & plan delta
    ['item-toolCall', handlers.onItemToolCall],
    ['item-plan-delta', handlers.onItemPlanDelta],
    // MCP tools
    ['item-mcpToolCall-progress', handlers.onMcpToolCallProgress],
    // Token usage
    ['thread-tokenUsage-updated', handlers.onTokenUsage],
    // Approvals
    ['item-commandExecution-requestApproval', handlers.onCommandApprovalRequested],
    ['item-fileChange-requestApproval', handlers.onFileChangeApprovalRequested],
    // Errors
    ['error', handlers.onStreamError],
    ['app-server-disconnected', handlers.onServerDisconnected],
    // Rate limiting
    ['turn-rateLimitExceeded', handlers.onRateLimitExceeded],
    // Account & server notifications
    ['account-updated', handlers.onAccountUpdated],
    ['account-login-completed', handlers.onAccountLoginCompleted],
    ['account-rateLimits-updated', handlers.onAccountRateLimitsUpdated],
    ['thread-status-changed', handlers.onThreadStatusChanged],
    ['thread-name-updated', handlers.onThreadNameUpdated],
    ['thread-archived', handlers.onThreadArchived],
    ['thread-unarchived', handlers.onThreadUnarchived],
    ['skills-changed', handlers.onSkillsChanged],
    ['model-rerouted', handlers.onModelRerouted],
    ['app-server-reconnected', handlers.onServerReconnected],
    // Apps & automations
    ['app-list-updated', handlers.onAppListUpdated],
    ['automation-runs-updated', handlers.onAutomationRunsUpdated],
  ]

  // Register all listeners in parallel for faster startup
  const unlisteners = await Promise.all(
    eventHandlerPairs.map(async ([eventName, handler]) => {
      if (!handler) return null
      try {
        const unlisten = await listen(eventName, (event) => {
          handler(event.payload as never)
        })
        log.debug(`Listener registered for: ${eventName}`, 'Events')
        return unlisten
      } catch (error) {
        log.error(`Failed to register listener for ${eventName}: ${error}`, 'Events')
        return null
      }
    })
  )

  // Filter out nulls (failed or skipped handlers)
  const validUnlisteners = unlisteners.filter((u): u is UnlistenFn => u !== null)

  log.info(`setupEventListeners completed - ${validUnlisteners.length} listeners registered`, 'Events')
  return validUnlisteners
}

// ==================== Standalone Event Subscriptions ====================

// Turn plan delta (granular streaming of plan updates)
export interface TurnPlanDeltaEvent {
  threadId: string
  turnId: string
  delta: unknown
}
export function onTurnPlanDelta(callback: (event: TurnPlanDeltaEvent) => void) {
  return listen<TurnPlanDeltaEvent>('turn-plan-delta', (e) => callback(e.payload))
}

// Background terminal cleanup (thread-background-terminals-clean)
export interface BackgroundTerminalCleanEvent {
  threadId: string
  terminalIds: string[]
}
export function onBackgroundTerminalClean(callback: (event: BackgroundTerminalCleanEvent) => void) {
  return listen<BackgroundTerminalCleanEvent>('thread-background-terminals-clean', (e) => callback(e.payload))
}

// Config key changed (config-changed)
export interface ConfigChangedEvent {
  key: string
  value: unknown
}
export function onConfigChanged(callback: (event: ConfigChangedEvent) => void) {
  return listen<ConfigChangedEvent>('config-changed', (e) => callback(e.payload))
}

// MCP server status changed (mcp-server-status-changed)
export interface McpServerStatusChangedEvent {
  serverName: string
  status: string
}
export function onMcpServerStatusChanged(callback: (event: McpServerStatusChangedEvent) => void) {
  return listen<McpServerStatusChangedEvent>('mcp-server-status-changed', (e) => callback(e.payload))
}

// Cleanup all listeners with error handling
export function cleanupEventListeners(unlisteners: UnlistenFn[]) {
  unlisteners.forEach((unlisten) => {
    try {
      unlisten()
    } catch (error) {
      log.error(`Failed to cleanup event listener: ${error}`, 'Events')
    }
  })
}
