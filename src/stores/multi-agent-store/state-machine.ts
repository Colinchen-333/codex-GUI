/**
 * Workflow State Machine
 * 
 * Defines valid state transitions for agents, phases, and workflows.
 * Provides guards and transition functions for safe state changes.
 */

import type { AgentStatus, WorkflowPhaseStatus, WorkflowStatus } from '../../lib/workflows/types'

// ==================== Agent State Machine ====================

const AGENT_TRANSITIONS: Record<AgentStatus, AgentStatus[]> = {
  pending: ['running', 'cancelled', 'error'],
  running: ['completed', 'error', 'cancelled', 'pending'],
  completed: [],
  error: ['pending'],
  cancelled: ['pending'],
}

export function canAgentTransition(from: AgentStatus, to: AgentStatus): boolean {
  return AGENT_TRANSITIONS[from]?.includes(to) ?? false
}

export function validateAgentTransition(from: AgentStatus, to: AgentStatus): void {
  if (!canAgentTransition(from, to)) {
    throw new Error(`Invalid agent transition: ${from} → ${to}`)
  }
}

// ==================== Phase State Machine ====================

const PHASE_TRANSITIONS: Record<WorkflowPhaseStatus, WorkflowPhaseStatus[]> = {
  pending: ['running'],
  running: ['awaiting_approval', 'completed', 'failed'],
  awaiting_approval: ['completed', 'failed', 'approval_timeout'],
  approval_timeout: ['awaiting_approval', 'completed', 'failed'],
  completed: [],
  failed: ['pending'],
}

export function canPhaseTransition(from: WorkflowPhaseStatus, to: WorkflowPhaseStatus): boolean {
  return PHASE_TRANSITIONS[from]?.includes(to) ?? false
}

export function validatePhaseTransition(from: WorkflowPhaseStatus, to: WorkflowPhaseStatus): void {
  if (!canPhaseTransition(from, to)) {
    throw new Error(`Invalid phase transition: ${from} → ${to}`)
  }
}

export function isPhaseTerminal(status: WorkflowPhaseStatus): boolean {
  return status === 'completed' || status === 'failed'
}

export function isPhaseAwaitingAction(status: WorkflowPhaseStatus): boolean {
  return status === 'awaiting_approval' || status === 'approval_timeout'
}

// ==================== Workflow State Machine ====================

const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  pending: ['running'],
  running: ['completed', 'failed', 'cancelled'],
  completed: [],
  failed: ['running'],
  cancelled: ['running'],
}

export function canWorkflowTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return WORKFLOW_TRANSITIONS[from]?.includes(to) ?? false
}

export function validateWorkflowTransition(from: WorkflowStatus, to: WorkflowStatus): void {
  if (!canWorkflowTransition(from, to)) {
    throw new Error(`Invalid workflow transition: ${from} → ${to}`)
  }
}

export function isWorkflowTerminal(status: WorkflowStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled'
}

export function isWorkflowRecoverable(status: WorkflowStatus): boolean {
  return status === 'failed' || status === 'cancelled'
}

// ==================== Error Classification ====================

export type ErrorDomain = 'agent' | 'phase' | 'workflow' | 'system'
export type ErrorSeverity = 'recoverable' | 'terminal' | 'transient'

export interface RecoveryGuidance {
  title: string
  description: string
  suggestion: string
  actions: Array<{
    label: string
    type: 'primary' | 'secondary' | 'danger'
    action: 'retry' | 'skip' | 'rollback' | 'cancel'
  }>
}

export interface ClassifiedError {
  domain: ErrorDomain
  severity: ErrorSeverity
  code: string
  message: string
  canRetry: boolean
  canRecover: boolean
  guidance?: RecoveryGuidance
}

const RECOVERABLE_ERROR_CODES = new Set([
  'DEPENDENCY_TIMEOUT',
  'DEPENDENCY_FAILED',
  'PAUSE_TIMEOUT',
  'APP_RESTART_LOST_CONNECTION',
  'SPAWN_FAILED',
])

const TRANSIENT_ERROR_CODES = new Set([
  'NETWORK_ERROR',
  'TIMEOUT',
  'RATE_LIMITED',
])

// Human-readable error descriptions and recovery guidance
const ERROR_GUIDANCE: Record<string, RecoveryGuidance> = {
  DEPENDENCY_TIMEOUT: {
    title: '依赖等待超时',
    description: '该代理等待上游依赖完成时超时。可能是因为依赖代理运行时间过长。',
    suggestion: '检查依赖代理的状态，或重试此代理。',
    actions: [
      { label: '重试代理', type: 'primary', action: 'retry' },
      { label: '跳过此代理', type: 'secondary', action: 'skip' },
    ],
  },
  DEPENDENCY_FAILED: {
    title: '依赖代理失败',
    description: '该代理依赖的上游代理执行失败。需要先修复依赖代理的问题。',
    suggestion: '先解决上游代理的错误，然后重试此代理。',
    actions: [
      { label: '查看依赖', type: 'secondary', action: 'skip' },
      { label: '重试代理', type: 'primary', action: 'retry' },
    ],
  },
  PAUSE_TIMEOUT: {
    title: '暂停超时',
    description: '工作流暂停时间过长，已自动终止以释放资源。',
    suggestion: '重试代理以继续执行。',
    actions: [
      { label: '重试代理', type: 'primary', action: 'retry' },
      { label: '取消工作流', type: 'danger', action: 'cancel' },
    ],
  },
  APP_RESTART_LOST_CONNECTION: {
    title: '应用重启后连接丢失',
    description: '应用重启导致与 Codex 服务器的连接断开。代理状态已保存，可以继续执行。',
    suggestion: '点击重试按钮继续执行此代理。',
    actions: [
      { label: '重试代理', type: 'primary', action: 'retry' },
      { label: '跳过此代理', type: 'secondary', action: 'skip' },
    ],
  },
  SPAWN_FAILED: {
    title: '代理启动失败',
    description: '无法启动 Codex 服务器进程。可能是因为 Codex CLI 未安装或配置错误。',
    suggestion: '检查 Codex CLI 是否已正确安装，然后重试。',
    actions: [
      { label: '重试代理', type: 'primary', action: 'retry' },
      { label: '取消工作流', type: 'danger', action: 'cancel' },
    ],
  },
  NETWORK_ERROR: {
    title: '网络错误',
    description: '与 Codex 服务器通信时发生网络错误。这可能是临时问题。',
    suggestion: '检查网络连接，然后重试。',
    actions: [
      { label: '重试代理', type: 'primary', action: 'retry' },
    ],
  },
  TIMEOUT: {
    title: '执行超时',
    description: '代理执行时间超过预设限制。可能是任务过于复杂或服务器响应缓慢。',
    suggestion: '考虑拆分任务或增加超时时间，然后重试。',
    actions: [
      { label: '重试代理', type: 'primary', action: 'retry' },
      { label: '跳过此代理', type: 'secondary', action: 'skip' },
    ],
  },
  RATE_LIMITED: {
    title: 'API 调用限流',
    description: 'API 调用频率超过限制。需要等待一段时间后重试。',
    suggestion: '等待几分钟后重试，或联系管理员增加配额。',
    actions: [
      { label: '稍后重试', type: 'primary', action: 'retry' },
    ],
  },
  // Default fallback for unknown errors
  UNKNOWN: {
    title: '未知错误',
    description: '发生了未预期的错误。请查看详细信息以了解更多。',
    suggestion: '尝试重试代理，如果问题持续，请报告此问题。',
    actions: [
      { label: '重试代理', type: 'primary', action: 'retry' },
      { label: '跳过此代理', type: 'secondary', action: 'skip' },
      { label: '取消工作流', type: 'danger', action: 'cancel' },
    ],
  },
}

export function classifyError(code: string, message: string, context?: { agentId?: string; phaseId?: string }): ClassifiedError {
  const isRecoverable = RECOVERABLE_ERROR_CODES.has(code)
  const isTransient = TRANSIENT_ERROR_CODES.has(code)

  let domain: ErrorDomain = 'system'
  if (context?.agentId && !context?.phaseId) {
    domain = 'agent'
  } else if (context?.phaseId) {
    domain = 'phase'
  } else if (code.startsWith('WORKFLOW_')) {
    domain = 'workflow'
  }

  let severity: ErrorSeverity = 'terminal'
  if (isTransient) {
    severity = 'transient'
  } else if (isRecoverable) {
    severity = 'recoverable'
  }

  const guidance = ERROR_GUIDANCE[code] || ERROR_GUIDANCE.UNKNOWN

  return {
    domain,
    severity,
    code,
    message,
    canRetry: isRecoverable || isTransient,
    canRecover: isRecoverable,
    guidance,
  }
}

export function getErrorGuidance(code: string): RecoveryGuidance {
  return ERROR_GUIDANCE[code] || ERROR_GUIDANCE.UNKNOWN
}

// ==================== Decision Priority ====================

export type DecisionType = 'phase_approval' | 'safety_approval' | 'error_recovery' | 'timeout_recovery'

export interface PendingDecision {
  type: DecisionType
  priority: number
  id: string
  label: string
  description: string
  actions: string[]
}

export function getDecisionPriority(type: DecisionType): number {
  switch (type) {
    case 'safety_approval':
      return 1
    case 'phase_approval':
      return 2
    case 'timeout_recovery':
      return 3
    case 'error_recovery':
      return 4
    default:
      return 99
  }
}

export function sortDecisionsByPriority(decisions: PendingDecision[]): PendingDecision[] {
  return [...decisions].sort((a, b) => a.priority - b.priority)
}
