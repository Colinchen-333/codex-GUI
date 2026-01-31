import type { StoreSlice } from './types'
import type { AgentDescriptor, AgentStatus, WorkflowPhase } from '../../lib/workflows/types'

export interface SelectorSlice {
  getAgent: (id: string) => AgentDescriptor | undefined
  getAgentByThreadId: (threadId: string) => AgentDescriptor | undefined
  getAgentsByStatus: (status: AgentStatus) => AgentDescriptor[]
  getCurrentPhase: () => WorkflowPhase | undefined
}

export const createSelectors: StoreSlice<SelectorSlice> = (_set, get) => ({
  getAgent: (id: string) => {
    return get().agents[id]
  },

  getAgentByThreadId: (threadId: string) => {
    const agentId = get().agentMapping[threadId]
    return agentId ? get().agents[agentId] : undefined
  },

  getAgentsByStatus: (status: AgentStatus) => {
    return Object.values(get().agents).filter((a) => a.status === status)
  },

  getCurrentPhase: () => {
    const workflow = get().workflow
    if (!workflow) return undefined
    return workflow.phases[workflow.currentPhaseIndex]
  },
})
