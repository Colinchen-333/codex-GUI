import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useMultiAgentStore } from '../stores/multi-agent-v2'
import { useThreadStore } from '../stores/thread'
import {
  getDecisionPriority,
  sortDecisionsByPriority,
  type PendingDecision,
} from '../stores/multi-agent-store/state-machine'

export interface DecisionQueueState {
  decisions: PendingDecision[]
  primaryDecision: PendingDecision | null
  
  counts: {
    safetyApprovals: number
    phaseApprovals: number
    timeoutRecoveries: number
    errorRecoveries: number
    total: number
  }
  
  hasDecisions: boolean
  hasCriticalDecisions: boolean
}

const AGENT_TYPE_NAMES: Record<string, string> = {
  explore: '探索代理',
  plan: '计划代理',
  'code-writer': '编码代理',
  bash: '命令代理',
  tester: '测试代理',
  reviewer: '审查代理',
  documenter: '文档代理',
}

export function useDecisionQueue(): DecisionQueueState {
  const agentOrder = useMultiAgentStore(useShallow((state) => state.agentOrder))
  const agentsMap = useMultiAgentStore(useShallow((state) => state.agents))
  const agents = useMemo(
    () => agentOrder.map(id => agentsMap[id]).filter((a): a is NonNullable<typeof a> => a !== undefined),
    [agentOrder, agentsMap]
  )
  const workflow = useMultiAgentStore((state) => state.workflow)
  const threadStoreState = useThreadStore(useShallow((state) => state.threads))

  const decisions = useMemo((): PendingDecision[] => {
    const items: PendingDecision[] = []

    for (const agent of agents) {
      if (!agent.threadId) continue
      const thread = threadStoreState[agent.threadId]
      if (thread?.pendingApprovals && thread.pendingApprovals.length > 0) {
        const agentName = AGENT_TYPE_NAMES[agent.type] ?? agent.type
        items.push({
          type: 'safety_approval',
          priority: getDecisionPriority('safety_approval'),
          id: `safety-${agent.id}`,
          label: `${thread.pendingApprovals.length} 个待审批`,
          description: `${agentName} 有 ${thread.pendingApprovals.length} 个文件变更或命令执行需要审批`,
          actions: ['approve', 'reject'],
        })
      }
    }

    if (workflow) {
      const currentPhase = workflow.phases[workflow.currentPhaseIndex]
      if (currentPhase) {
        if (currentPhase.status === 'awaiting_approval') {
          items.push({
            type: 'phase_approval',
            priority: getDecisionPriority('phase_approval'),
            id: `phase-${currentPhase.id}`,
            label: `阶段审批: ${currentPhase.name}`,
            description: `${currentPhase.name} 阶段已完成，请审批是否继续`,
            actions: ['approve', 'reject'],
          })
        }

        if (currentPhase.status === 'approval_timeout') {
          items.push({
            type: 'timeout_recovery',
            priority: getDecisionPriority('timeout_recovery'),
            id: `timeout-${currentPhase.id}`,
            label: `审批超时: ${currentPhase.name}`,
            description: `${currentPhase.name} 阶段审批已超时，您仍可操作`,
            actions: ['recover', 'approve', 'reject'],
          })
        }
      }
    }

    for (const agent of agents) {
      if (agent.status === 'error' && agent.error?.recoverable) {
        const agentName = AGENT_TYPE_NAMES[agent.type] ?? agent.type
        items.push({
          type: 'error_recovery',
          priority: getDecisionPriority('error_recovery'),
          id: `error-${agent.id}`,
          label: `错误恢复: ${agentName}`,
          description: agent.error.message,
          actions: ['retry', 'dismiss'],
        })
      }
    }

    return sortDecisionsByPriority(items)
  }, [agents, workflow, threadStoreState])

  const counts = useMemo(() => {
    let safetyApprovals = 0
    let phaseApprovals = 0
    let timeoutRecoveries = 0
    let errorRecoveries = 0

    for (const decision of decisions) {
      switch (decision.type) {
        case 'safety_approval':
          safetyApprovals++
          break
        case 'phase_approval':
          phaseApprovals++
          break
        case 'timeout_recovery':
          timeoutRecoveries++
          break
        case 'error_recovery':
          errorRecoveries++
          break
      }
    }

    return {
      safetyApprovals,
      phaseApprovals,
      timeoutRecoveries,
      errorRecoveries,
      total: decisions.length,
    }
  }, [decisions])

  return useMemo(() => {
    const primaryDecision = decisions.length > 0 ? decisions[0] : null
    const hasDecisions = decisions.length > 0
    const hasCriticalDecisions = counts.safetyApprovals > 0 || counts.phaseApprovals > 0

    return {
      decisions,
      primaryDecision,
      counts,
      hasDecisions,
      hasCriticalDecisions,
    }
  }, [decisions, counts])
}
