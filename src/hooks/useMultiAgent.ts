/**
 * useMultiAgent Hook - React hook for multi-agent system
 *
 * Provides convenient access to multi-agent store state and actions
 * 
 * PERFORMANCE NOTE: These hooks use stable selectors to prevent unnecessary re-renders.
 * Prefer using specific hooks (useAgentIds, useAgentById) over useAgents when possible.
 */

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useMultiAgentStore } from '../stores/multi-agent-v2'
import type { AgentStatus, AgentDescriptor } from '../stores/multi-agent-v2'
import { sortAgentsByStatus, groupAgentsByStatus } from '../lib/agent-utils'

/**
 * Get stable array of agent IDs (for rendering lists without re-creating arrays)
 */
export function useAgentIds(): string[] {
  return useMultiAgentStore(useShallow((state) => state.agentOrder))
}

export function useAgents(): AgentDescriptor[] {
  const agentOrder = useMultiAgentStore(useShallow((state) => state.agentOrder))
  const agents = useMultiAgentStore(useShallow((state) => state.agents))
  return useMemo(
    () => agentOrder.map((id) => agents[id]).filter((a): a is AgentDescriptor => a !== undefined),
    [agentOrder, agents]
  )
}

/**
 * Get agents sorted by status priority
 */
export function useSortedAgents(): AgentDescriptor[] {
  const agents = useAgents()
  return useMemo(() => sortAgentsByStatus(agents), [agents])
}

/**
 * Get agents grouped by status
 */
export function useAgentsByStatus(): Record<AgentStatus, AgentDescriptor[]> {
  const agents = useAgents()
  return useMemo(() => groupAgentsByStatus(agents), [agents])
}

/**
 * Get a single agent by ID
 */
export function useAgent(id: string): AgentDescriptor | undefined {
  return useMultiAgentStore((state) => state.agents[id])
}

/**
 * Get agent by thread ID
 */
export function useAgentByThreadId(threadId: string): AgentDescriptor | undefined {
  return useMultiAgentStore((state) => {
    const agentId = state.agentMapping[threadId]
    return agentId ? state.agents[agentId] : undefined
  })
}

/**
 * Get agents by status (memoized to prevent unnecessary re-renders)
 */
export function useAgentsWithStatus(status: AgentStatus): AgentDescriptor[] {
  const agentOrder = useMultiAgentStore(useShallow((state) => state.agentOrder))
  const agents = useMultiAgentStore(useShallow((state) => state.agents))
  return useMemo(
    () => agentOrder
      .map((id) => agents[id])
      .filter((a): a is AgentDescriptor => a !== undefined && a.status === status),
    [agentOrder, agents, status]
  )
}

/**
 * Get running agents count
 */
export function useRunningAgentsCount(): number {
  return useMultiAgentStore((state) => state.getAgentsByStatus('running').length)
}

/**
 * Get completed agents count
 */
export function useCompletedAgentsCount(): number {
  return useMultiAgentStore((state) => state.getAgentsByStatus('completed').length)
}

/**
 * Get failed agents count
 */
export function useFailedAgentsCount(): number {
  return useMultiAgentStore((state) => state.getAgentsByStatus('error').length)
}

/**
 * Get current workflow
 */
export function useWorkflow() {
  return useMultiAgentStore((state) => state.workflow)
}

export function useCurrentPhase() {
  return useMultiAgentStore((state) => {
    const workflow = state.workflow
    if (!workflow) return undefined
    return workflow.phases[workflow.currentPhaseIndex]
  })
}

/**
 * Get multi-agent config
 */
export function useMultiAgentConfig() {
  return useMultiAgentStore((state) => state.config)
}

/**
 * Get spawn agent action
 */
export function useSpawnAgent() {
  return useMultiAgentStore((state) => state.spawnAgent)
}

/**
 * Get cancel agent action
 */
export function useCancelAgent() {
  return useMultiAgentStore((state) => state.cancelAgent)
}

/**
 * Get pause agent action
 */
export function usePauseAgent() {
  return useMultiAgentStore((state) => state.pauseAgent)
}

/**
 * Get resume agent action
 */
export function useResumeAgent() {
  return useMultiAgentStore((state) => state.resumeAgent)
}

export function useMultiAgentActions() {
  const spawnAgent = useMultiAgentStore((state) => state.spawnAgent)
  const cancelAgent = useMultiAgentStore((state) => state.cancelAgent)
  const pauseAgent = useMultiAgentStore((state) => state.pauseAgent)
  const resumeAgent = useMultiAgentStore((state) => state.resumeAgent)
  const updateAgentStatus = useMultiAgentStore((state) => state.updateAgentStatus)
  const updateAgentProgress = useMultiAgentStore((state) => state.updateAgentProgress)
  const startWorkflow = useMultiAgentStore((state) => state.startWorkflow)
  const approvePhase = useMultiAgentStore((state) => state.approvePhase)
  const rejectPhase = useMultiAgentStore((state) => state.rejectPhase)
  const cancelWorkflow = useMultiAgentStore((state) => state.cancelWorkflow)
  
  return useMemo(() => ({
    spawnAgent,
    cancelAgent,
    pauseAgent,
    resumeAgent,
    updateAgentStatus,
    updateAgentProgress,
    startWorkflow,
    approvePhase,
    rejectPhase,
    cancelWorkflow,
  }), [
    spawnAgent, cancelAgent, pauseAgent, resumeAgent,
    updateAgentStatus, updateAgentProgress, startWorkflow,
    approvePhase, rejectPhase, cancelWorkflow,
  ])
}

/**
 * Check if any agent is running
 */
export function useHasRunningAgents(): boolean {
  return useMultiAgentStore((state) => state.getAgentsByStatus('running').length > 0)
}

/**
 * Check if all agents are completed
 */
export function useAllAgentsCompleted(): boolean {
  const agents = useAgents()
  if (agents.length === 0) return false
  return agents.every((a) => a.status === 'completed')
}

export function useAgentStats() {
  const agents = useAgents()
  return useMemo(() => ({
    total: agents.length,
    running: agents.filter((a) => a.status === 'running').length,
    pending: agents.filter((a) => a.status === 'pending').length,
    completed: agents.filter((a) => a.status === 'completed').length,
    error: agents.filter((a) => a.status === 'error').length,
    cancelled: agents.filter((a) => a.status === 'cancelled').length,
  }), [agents])
}
