import { log } from '../../../lib/logger'
import { threadApi } from '../../../lib/api'
import { useThreadStore } from '../../thread'
import type { StoreSlice } from '../types'

export interface RecoveryActionSlice {
  retryDependencyWait: (agentId: string) => Promise<void>
  retryPhase: (phaseId: string) => Promise<void>
  retryWorkflow: () => Promise<void>
  recoverCancelledWorkflow: () => Promise<void>
  _autoResumeAfterRestart: () => Promise<void>
}

export const createRecoveryActions: StoreSlice<RecoveryActionSlice> = (set, get) => ({
  retryDependencyWait: async (agentId: string) => {
    const agent = get().agents[agentId]
    if (!agent) return

    if (agent.status !== 'error' || agent.error?.code !== 'DEPENDENCY_TIMEOUT') {
      log.warn(`[retryDependencyWait] Agent ${agentId} is not in dependency timeout state`, 'multi-agent')
      return
    }

    log.info(`[retryDependencyWait] Retrying dependency wait for agent ${agentId}`, 'multi-agent')

    const newAgentId = await get().spawnAgent(agent.type, agent.task, agent.dependencies, agent.config)
    if (newAgentId) {
      get().removeAgent(agentId)
      log.info(`[retryDependencyWait] Agent ${agentId} replaced with new agent ${newAgentId}`, 'multi-agent')
    } else {
      log.error(`[retryDependencyWait] Failed to respawn agent ${agentId}`, 'multi-agent')
    }
  },

  retryPhase: async (phaseId: string) => {
    const state = get()
    const workflow = state.workflow

    if (!workflow) {
      log.error('[retryPhase] No active workflow', 'multi-agent')
      return
    }

    const phaseIndex = workflow.phases.findIndex((p) => p.id === phaseId)
    if (phaseIndex === -1) {
      log.error(`[retryPhase] Phase ${phaseId} not found`, 'multi-agent')
      return
    }

    const phase = workflow.phases[phaseIndex]

    if (phase.status !== 'failed') {
      log.error(`[retryPhase] Phase ${phaseId} is not in 'failed' status (current: ${phase.status})`, 'multi-agent')
      return
    }

    set((s) => {
      s.phaseOperationVersion++
    })

    log.info(`[retryPhase] Retrying phase: ${phase.name} (${phaseId})`, 'multi-agent')

    const oldAgentIds = phase.agentIds || []
    for (const agentId of oldAgentIds) {
      const agent = state.agents[agentId]
      if (agent) {
        if (agent.status === 'running' && agent.threadId) {
          try {
            await threadApi.interrupt(agent.threadId)
          } catch (error) {
            log.error(`[retryPhase] Failed to interrupt agent ${agentId}: ${error}`, 'multi-agent')
          }
        }
        get().removeAgent(agentId)
      }
    }

    set((s) => {
      if (!s.workflow) return

      const p = s.workflow.phases.find((wp) => wp.id === phaseId)
      if (p) {
        if (p.output && p.output.startsWith('Phase rejected:')) {
          p.metadata = {
            ...p.metadata,
            lastRejectionReason: p.output.replace('Phase rejected: ', ''),
          }
        }
        p.status = 'pending'
        p.startedAt = undefined
        p.completedAt = undefined
        p.output = undefined
        p.agentIds = []
        if (p.metadata?.spawnFailedCount) {
          delete p.metadata.spawnFailedCount
        }
      }

      s.workflow.status = 'running'
      s.workflow.completedAt = undefined

      s.workflow.currentPhaseIndex = phaseIndex

      if (s.phaseCompletionInFlight === phaseId) {
        s.phaseCompletionInFlight = null
      }
    })

    const updatedWorkflow = get().workflow
    if (updatedWorkflow) {
      const updatedPhase = updatedWorkflow.phases[phaseIndex]
      if (updatedPhase) {
        await get()._executePhase(updatedPhase)
      }
    }

    log.info(`[retryPhase] Phase ${phase.name} retry initiated`, 'multi-agent')
    log.info(`[AUDIT] Phase retry: ${phase.name} (${phaseId}), cleaned up ${oldAgentIds.length} previous agents`, 'multi-agent')
  },

  retryWorkflow: async () => {
    const state = get()
    const workflow = state.workflow

    if (!workflow) {
      log.error('[retryWorkflow] No active workflow', 'multi-agent')
      return
    }

    if (workflow.status !== 'failed') {
      log.error(`[retryWorkflow] Workflow is not in 'failed' status (current: ${workflow.status})`, 'multi-agent')
      return
    }

    const failedPhase = workflow.phases.find((p) => p.status === 'failed')

    if (!failedPhase) {
      log.error('[retryWorkflow] No failed phase found in workflow', 'multi-agent')
      return
    }

    log.info(`[retryWorkflow] Found failed phase: ${failedPhase.name} (${failedPhase.id}), retrying...`, 'multi-agent')

    await get().retryPhase(failedPhase.id)
  },

  recoverCancelledWorkflow: async () => {
    const state = get()
    const workflow = state.workflow

    if (!workflow) {
      log.error('[recoverCancelledWorkflow] No active workflow', 'multi-agent')
      return
    }

    if (workflow.status !== 'cancelled') {
      log.error(`[recoverCancelledWorkflow] Workflow is not in 'cancelled' status (current: ${workflow.status})`, 'multi-agent')
      return
    }

    log.info('[recoverCancelledWorkflow] Recovering cancelled workflow', 'multi-agent')

    set((s) => {
      if (!s.workflow) return
      s.workflow.status = 'running'
      s.workflow.completedAt = undefined
    })

    const currentPhaseIndex = workflow.currentPhaseIndex
    const currentPhase = workflow.phases[currentPhaseIndex]

    if (!currentPhase) {
      log.error('[recoverCancelledWorkflow] No current phase found', 'multi-agent')
      set((s) => {
        if (s.workflow) {
          s.workflow.status = 'failed'
          s.workflow.completedAt = new Date()
        }
      })
      return
    }

    log.info(`[recoverCancelledWorkflow] Current phase: ${currentPhase.name} (${currentPhase.id}), status: ${currentPhase.status}`, 'multi-agent')

    if (currentPhase.status === 'completed') {
      log.info(`[recoverCancelledWorkflow] Phase ${currentPhase.name} already completed, approving to continue`, 'multi-agent')
      await get().approvePhase(currentPhase.id)
    } else if (currentPhase.status === 'failed') {
      log.info(`[recoverCancelledWorkflow] Phase ${currentPhase.name} failed, retrying`, 'multi-agent')
      await get().retryPhase(currentPhase.id)
    } else {
      log.info(`[recoverCancelledWorkflow] Re-executing phase ${currentPhase.name}`, 'multi-agent')
      
      const phaseAgentIds = currentPhase.agentIds || []
      for (const agentId of phaseAgentIds) {
        const agent = state.agents[agentId]
        if (agent && agent.status === 'cancelled') {
          get().removeAgent(agentId)
        }
      }

      set((s) => {
        if (!s.workflow) return
        const p = s.workflow.phases.find((wp) => wp.id === currentPhase.id)
        if (p) {
          p.status = 'pending'
          p.startedAt = undefined
          p.completedAt = undefined
          p.agentIds = []
        }
      })

      const updatedWorkflow = get().workflow
      if (updatedWorkflow) {
        const updatedPhase = updatedWorkflow.phases[currentPhaseIndex]
        if (updatedPhase) {
          await get()._executePhase(updatedPhase)
        }
      }
    }

    log.info('[recoverCancelledWorkflow] Workflow recovery initiated', 'multi-agent')
  },

  _autoResumeAfterRestart: async () => {
    const state = get()
    if (state.restartRecoveryInFlight) return

    const candidates = Object.values(state.agents).filter(
      (agent) => agent.threadId && agent.error?.code === 'APP_RESTART_LOST_CONNECTION'
    )
    if (candidates.length === 0) return

    set((s) => {
      s.restartRecoveryInFlight = true
    })

    try {
      for (const agent of candidates) {
        try {
          if (!agent.threadId) continue
          await useThreadStore.getState().resumeThread(agent.threadId)
          set((s) => {
            const current = s.agents[agent.id]
            if (current) {
              current.status = 'pending'
              current.error = undefined
              current.completedAt = undefined
              current.progress = { ...current.progress, description: '正在恢复连接' }
            }
          })
          await get().resumeAgent(agent.id)
        } catch (error) {
          log.warn(`[autoResumeAfterRestart] Failed to resume agent ${agent.id}: ${error}`, 'multi-agent')
        }
      }
    } finally {
      set((s) => {
        s.restartRecoveryInFlight = false
      })
    }
  },
})
