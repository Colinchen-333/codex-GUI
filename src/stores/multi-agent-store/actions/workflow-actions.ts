import type { WritableDraft } from 'immer'
import { log } from '../../../lib/logger'
import { threadApi } from '../../../lib/api'
import { generatePhaseAgentTasks } from '../../../lib/workflows/plan-mode'
import { createWorkflowFromTemplate } from '../../../lib/workflows/template-engine'
import type { WorkflowTemplate, WorkflowPhase, AgentDescriptor, AgentConfigOverrides, Workflow } from '../../../lib/workflows/types'
import { useThreadStore } from '../../thread'
import type { StoreSlice } from '../types'
import { DEFAULT_APPROVAL_TIMEOUT_MS } from '../constants'
import { buildPhaseOutput } from '../helpers'
import { isPhaseTerminal } from '../state-machine'

export interface WorkflowActionSlice {
  startWorkflow: (workflow: Workflow) => Promise<void>
  startWorkflowFromTemplate: (template: WorkflowTemplate, userTask: string) => Promise<void>
  _executePhase: (phase: WorkflowPhase) => Promise<void>
  approvePhase: (phaseId: string) => Promise<void>
  rejectPhase: (phaseId: string, reason?: string) => Promise<void>
  recoverApprovalTimeout: (phaseId: string) => void
  cancelWorkflow: () => Promise<void>
  clearWorkflow: () => void
  checkPhaseCompletion: (expectedVersion?: number) => Promise<void>
}

export const createWorkflowActions: StoreSlice<WorkflowActionSlice> = (set, get) => ({
  startWorkflow: async (workflow: Workflow) => {
    const state = get()

    get()._clearAllTimers()

    if (state.workflow || Object.keys(state.agents).length > 0) {
      log.info('[startWorkflow] Cleaning up existing workflow/agents before starting new workflow', 'multi-agent')

      const runningAgents = Object.values(state.agents).filter((a) => a.status === 'running')
      for (const agent of runningAgents) {
        try {
          if (agent.threadId) {
            await threadApi.interrupt(agent.threadId)
          }
        } catch (error) {
          log.error(`[startWorkflow] Failed to interrupt agent ${agent.id}: ${error}`, 'multi-agent')
        }
      }

      const threadStore = useThreadStore.getState()
      for (const agent of Object.values(state.agents)) {
        if (agent.threadId) {
          threadStore.unregisterAgentThread(agent.threadId)
        }
      }

      set((s) => {
        s.agents = {}
        s.agentOrder = []
        s.agentMapping = {}
        s.workflow = null
        s.previousPhaseOutput = undefined
        s.phaseCompletionInFlight = null
      })
    }

    set((s) => {
      s.workflow = workflow as WritableDraft<Workflow>
      s.workflow.status = 'running'
      s.workflow.startedAt = new Date()
      s.previousPhaseOutput = undefined
      s.phaseCompletionInFlight = null
    })

    await get()._executePhase(workflow.phases[0])
  },

  startWorkflowFromTemplate: async (template: WorkflowTemplate, userTask: string) => {
    const state = get()
    const context = {
      workingDirectory: state.config.cwd || state.workingDirectory,
      userTask,
    }
    const workflow = createWorkflowFromTemplate(template, userTask, context)
    await get().startWorkflow(workflow)
  },

  _executePhase: async (phase: WorkflowPhase) => {
    const state = get()
    
    log.info(`[_executePhase] Starting phase: ${phase.name}`, 'multi-agent')

    set((s) => {
      if (s.workflow) {
        const p = s.workflow.phases.find((wp) => wp.id === phase.id)
        if (p) {
          p.status = 'running'
          p.startedAt = new Date()
        }
      }
    })

    try {
      const agentTasks = generatePhaseAgentTasks(phase, state.previousPhaseOutput)

      if (agentTasks.length === 0) {
        log.warn(`[_executePhase] No agent tasks generated for phase: ${phase.name}`, 'multi-agent')
        set((s) => {
          if (!s.workflow) return
          const p = s.workflow.phases.find((wp) => wp.id === phase.id)
          if (p) {
            p.status = 'completed'
            p.completedAt = new Date()
            p.output = `阶段 ${phase.name} 未生成代理任务。`
          }
          s.previousPhaseOutput = p?.output
        })

        if (!phase.requiresApproval) {
          await get().approvePhase(phase.id)
        }
        return
      }

      const spawnedAgentIds: string[] = []
      let failedSpawnCount = 0
      for (const { type, task, config } of agentTasks) {
        const mergedConfig: AgentConfigOverrides = {
          model: state.config.model,
          approvalPolicy: state.config.approvalPolicy,
          timeout: state.config.timeout,
          ...config,
        }
        const agentId = await state.spawnAgent(type, task, [], mergedConfig)
        if (agentId) {
          spawnedAgentIds.push(agentId)
        } else {
          failedSpawnCount += 1
        }
      }

      set((s) => {
        if (s.workflow) {
          const p = s.workflow.phases.find((wp) => wp.id === phase.id)
          if (p) {
            p.agentIds = spawnedAgentIds
            if (failedSpawnCount > 0) {
              p.metadata = { ...p.metadata, spawnFailedCount: failedSpawnCount }
            }
          }
        }
      })

      if (failedSpawnCount > 0) {
        log.error(
          `[_executePhase] Failed to spawn ${failedSpawnCount} agents for phase: ${phase.name}`,
          'multi-agent'
        )
      }

      if (spawnedAgentIds.length === 0) {
        log.error(`[_executePhase] No agents spawned for phase: ${phase.name}`, 'multi-agent')
        set((s) => {
          if (!s.workflow) return
          const p = s.workflow.phases.find((wp) => wp.id === phase.id)
          if (p) {
            p.status = 'failed'
            p.completedAt = new Date()
            p.output = 'Failed to spawn any agents for this phase.'
          }
          s.workflow.status = 'failed'
        })
        return
      }

      log.info(`[_executePhase] Spawned ${spawnedAgentIds.length} agents for phase: ${phase.name}`, 'multi-agent')
    } catch (error) {
      log.error(`[_executePhase] Failed to execute phase: ${phase.name}: ${error}`, 'multi-agent')
      set((s) => {
        if (s.workflow) {
          const p = s.workflow.phases.find((wp) => wp.id === phase.id)
          if (p) {
            p.status = 'failed'
            p.completedAt = new Date()
          }
          s.workflow.status = 'failed'
        }
      })
    }
  },

  approvePhase: async (phaseId: string) => {
    const state = get()
    const workflow = state.workflow

    if (!workflow) return

    if (state.approvalInFlight[phaseId]) {
      log.warn(`[approvePhase] Approval already in flight for phase ${phaseId}, ignoring duplicate call`, 'multi-agent')
      return
    }

    const phaseIndex = workflow.phases.findIndex((p) => p.id === phaseId)
    if (phaseIndex === -1) return

    const phase = workflow.phases[phaseIndex]
    if (phase.status !== 'awaiting_approval' && phase.status !== 'approval_timeout') {
      log.warn(`[approvePhase] Phase ${phaseId} is not in approvable state (current: ${phase.status})`, 'multi-agent')
      return
    }

    let claimed = false
    set((s) => {
      if (s.approvalInFlight[phaseId]) return
      s.approvalInFlight[phaseId] = true
      s.phaseOperationVersion++
      claimed = true
    })

    if (!claimed) {
      log.warn(`[approvePhase] Failed to claim approval lock for phase ${phaseId}`, 'multi-agent')
      return
    }

    const nextPhase = workflow.phases[phaseIndex + 1]
    const hasNextPhase = !!nextPhase

    try {
      get()._clearApprovalTimeout(phaseId)

      log.info(`[AUDIT] Phase approved: ${phase.name} (${phaseId}), agents: ${phase.agentIds.length}, next: ${hasNextPhase ? nextPhase?.name : 'workflow complete'}`, 'multi-agent')

      set((s) => {
        if (!s.workflow) return

        const p = s.workflow.phases[phaseIndex]
        if (p) {
          p.status = 'completed'
          p.completedAt = p.completedAt ?? new Date()
          if (p.output) {
            s.previousPhaseOutput = p.output
          }
        }

        if (hasNextPhase) {
          s.workflow.currentPhaseIndex = phaseIndex + 1
        } else {
          s.workflow.status = 'completed'
          s.workflow.completedAt = new Date()
        }
      })

      if (hasNextPhase) {
        await get()._executePhase(nextPhase)
      }
    } finally {
      set((s) => {
        delete s.approvalInFlight[phaseId]
        s.phaseCompletionInFlight = null
      })
    }
  },

  rejectPhase: async (phaseId: string, reason?: string) => {
    const state = get()
    const workflow = state.workflow

    if (!workflow) return

    if (state.approvalInFlight[phaseId]) {
      log.warn(`[rejectPhase] Approval already in flight for phase ${phaseId}, ignoring duplicate call`, 'multi-agent')
      return
    }

    const phaseRef = workflow.phases.find((p) => p.id === phaseId)
    if (!phaseRef || (phaseRef.status !== 'awaiting_approval' && phaseRef.status !== 'approval_timeout')) {
      log.warn(`[rejectPhase] Phase ${phaseId} is not in rejectable state (current: ${phaseRef?.status})`, 'multi-agent')
      return
    }

    get()._clearApprovalTimeout(phaseId)

    set((s) => {
      if (!s.workflow) return
      s.approvalInFlight[phaseId] = true
      s.phaseOperationVersion++
    })

    try {
      const phaseAgentIds = phaseRef.agentIds || []
      for (const agentId of phaseAgentIds) {
        const agent = state.agents[agentId]
        if (agent && agent.status === 'running' && agent.threadId) {
          try {
            await threadApi.interrupt(agent.threadId)
            log.info(`[rejectPhase] Interrupted agent ${agentId} for rejected phase ${phaseId}`, 'multi-agent')
          } catch (error) {
            log.error(`[rejectPhase] Failed to interrupt agent ${agentId}: ${error}`, 'multi-agent')
          }
        }
      }

      set((s) => {
        if (!s.workflow) return

        const phase = s.workflow.phases.find((p) => p.id === phaseId)
        if (phase) {
          phase.status = 'failed'
          phase.completedAt = new Date()
          if (reason) {
            phase.output = `Phase rejected: ${reason}`
          }
        }

        for (const agentId of phaseAgentIds) {
          const agent = s.agents[agentId]
          if (agent && agent.status === 'running') {
            agent.status = 'cancelled'
            agent.completedAt = new Date()
            agent.interruptReason = 'cancel'
            agent.progress.description = '阶段被拒绝'
          }
        }

        s.workflow.status = 'failed'
        s.workflow.completedAt = new Date()
      })

      log.info(`[AUDIT] Phase rejected: ${phaseRef.name} (${phaseId}), reason: ${reason || 'no reason provided'}, interrupted agents: ${phaseAgentIds.length}`, 'multi-agent')
    } finally {
      set((s) => {
        delete s.approvalInFlight[phaseId]
      })
    }
  },

  recoverApprovalTimeout: (phaseId: string) => {
    const state = get()
    const workflow = state.workflow

    if (!workflow) {
      log.warn(`[recoverApprovalTimeout] No workflow found`, 'multi-agent')
      return
    }

    const phase = workflow.phases.find((p) => p.id === phaseId)
    if (!phase) {
      log.warn(`[recoverApprovalTimeout] Phase ${phaseId} not found`, 'multi-agent')
      return
    }

    if (phase.status !== 'approval_timeout') {
      log.warn(`[recoverApprovalTimeout] Phase ${phaseId} is not in approval_timeout state (current: ${phase.status})`, 'multi-agent')
      return
    }

    if (workflow.status !== 'running') {
      log.warn(`[recoverApprovalTimeout] Workflow is not running (current: ${workflow.status})`, 'multi-agent')
      return
    }

    log.info(`[recoverApprovalTimeout] Recovering phase ${phaseId} from approval_timeout`, 'multi-agent')

    set((s) => {
      if (!s.workflow) return

      const p = s.workflow.phases.find((wp) => wp.id === phaseId)
      if (p) {
        p.status = 'awaiting_approval'
      }
    })

    const approvalTimeoutMs = phase.approvalTimeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS
    if (approvalTimeoutMs > 0) {
      get()._startApprovalTimeout(phaseId, approvalTimeoutMs)
    }

    log.info(`[recoverApprovalTimeout] Phase ${phaseId} recovered, approval timeout restarted`, 'multi-agent')
    log.info(`[AUDIT] Approval timeout recovered: ${phase.name} (${phaseId}), timeout reset to ${approvalTimeoutMs}ms`, 'multi-agent')
  },

  cancelWorkflow: async () => {
    const state = get()
    const workflow = state.workflow
    if (!workflow) return

    set((s) => {
      s.phaseOperationVersion++
    })

    get()._clearAllTimers()

    const agents = Object.values(state.agents)
    for (const agent of agents) {
      if (agent.status === 'running') {
        await get().cancelAgent(agent.id)
      }
    }

    set((s) => {
      if (s.workflow) {
        s.workflow.status = 'cancelled'
        s.workflow.completedAt = new Date()
      }
      s.phaseCompletionInFlight = null
      s.approvalInFlight = {}
    })
  },

  clearWorkflow: () => {
    get()._clearAllTimers()

    set((s) => {
      s.workflow = null
      s.previousPhaseOutput = undefined
      s.phaseCompletionInFlight = null
      s.approvalInFlight = {}
    })
  },

  checkPhaseCompletion: async (expectedVersion?: number) => {
    const state = get()

    if (expectedVersion !== undefined && state.phaseOperationVersion !== expectedVersion) {
      log.info(`[checkPhaseCompletion] Phase operation version mismatch (expected ${expectedVersion}, got ${state.phaseOperationVersion}), aborting`, 'multi-agent')
      return
    }

    const workflow = state.workflow
    if (!workflow) return
    if (workflow.status !== 'running') return

    const currentPhase = workflow.phases[workflow.currentPhaseIndex]
    if (!currentPhase || currentPhase.status !== 'running') return
    if (currentPhase.agentIds.length === 0) return

    const phaseId = currentPhase.id
    const phaseIndex = workflow.currentPhaseIndex
    let claimed = false
    set((s) => {
      if (!s.workflow) return
      if (s.workflow.currentPhaseIndex !== phaseIndex) return
      if (s.phaseCompletionInFlight === phaseId) return
      s.phaseCompletionInFlight = phaseId
      claimed = true
    })

    if (!claimed) return

    try {
      const latestState = get()
      const latestWorkflow = latestState.workflow

      if (!latestWorkflow || latestWorkflow.status !== 'running') {
        log.info('[checkPhaseCompletion] Workflow state changed during execution, aborting', 'multi-agent')
        return
      }

      const latestPhase = latestWorkflow.phases[latestWorkflow.currentPhaseIndex]
      if (!latestPhase || latestPhase.id !== phaseId) {
        log.info('[checkPhaseCompletion] Phase changed during execution, aborting', 'multi-agent')
        return
      }

      if (isPhaseTerminal(latestPhase.status)) {
        log.info(`[checkPhaseCompletion] Phase ${latestPhase.name} already terminal (${latestPhase.status}), aborting`, 'multi-agent')
        return
      }

      if (latestPhase.status !== 'running') {
        log.info('[checkPhaseCompletion] Phase state changed during execution, aborting', 'multi-agent')
        return
      }

      const missingAgentIds = latestPhase.agentIds.filter((id) => !latestState.agents[id])
      if (missingAgentIds.length > 0) {
        log.error(
          `[checkPhaseCompletion] Phase ${latestPhase.name} missing agents: ${missingAgentIds.join(', ')}`,
          'multi-agent'
        )
        set((s) => {
          if (!s.workflow) return
          if (s.workflow.currentPhaseIndex !== phaseIndex) return
          const p = s.workflow.phases[s.workflow.currentPhaseIndex]
          if (p && p.id === phaseId) {
            p.status = 'failed'
            p.completedAt = new Date()
            p.output = `Missing agents: ${missingAgentIds.join(', ')}`
          }
          s.workflow.status = 'failed'
        })
        return
      }

      const phaseAgents = latestPhase.agentIds
        .map((id) => latestState.agents[id])
        .filter(Boolean) as AgentDescriptor[]

      if (phaseAgents.length === 0) return

      const allCompleted = phaseAgents.every(
        (a) => a.status === 'completed' || a.status === 'error' || a.status === 'cancelled'
      )

      if (!allCompleted) return

      const hasError = phaseAgents.some((a) => a.status === 'error')
      const phaseOutput = buildPhaseOutput(latestPhase, phaseAgents)

      if (hasError && !latestPhase.requiresApproval) {
        set((s) => {
          if (!s.workflow) return
          if (s.workflow.currentPhaseIndex !== phaseIndex) return
          const p = s.workflow.phases[s.workflow.currentPhaseIndex]
          if (p && p.id === phaseId) {
            p.status = 'failed'
            p.completedAt = new Date()
            p.output = phaseOutput
          }
          s.workflow.status = 'failed'
        })
        return
      }

      log.info(`[checkPhaseCompletion] Phase completed: ${latestPhase.name}${hasError ? ' (with errors)' : ''}`, 'multi-agent')

      if (latestPhase.requiresApproval) {
        log.info(
          `[checkPhaseCompletion] Approval required for phase: ${latestPhase.name}`,
          'multi-agent'
        )
        set((s) => {
          if (!s.workflow) return
          if (s.workflow.currentPhaseIndex !== phaseIndex) return
          const p = s.workflow.phases[s.workflow.currentPhaseIndex]
          if (p && p.id === phaseId) {
            p.status = 'awaiting_approval'
            if (!p.completedAt) {
              p.completedAt = new Date()
            }
            p.output = phaseOutput
          }
        })

        const approvalTimeoutMs = latestPhase.approvalTimeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS
        if (approvalTimeoutMs > 0) {
          get()._startApprovalTimeout(phaseId, approvalTimeoutMs)
        }

        return
      }

      const finalState = get()
      if (!finalState.workflow || finalState.workflow.currentPhaseIndex !== phaseIndex) {
        log.info('[checkPhaseCompletion] Workflow state changed before auto-advance, aborting', 'multi-agent')
        return
      }

      set((s) => {
        if (!s.workflow) return
        if (s.workflow.currentPhaseIndex !== phaseIndex) return
        const p = s.workflow.phases[s.workflow.currentPhaseIndex]
        if (p && p.id === phaseId) {
          p.output = phaseOutput
        }
        s.previousPhaseOutput = phaseOutput
      })
      await finalState.approvePhase(latestPhase.id)
    } finally {
      set((s) => {
        if (s.phaseCompletionInFlight === phaseId) {
          s.phaseCompletionInFlight = null
        }
      })
    }
  },
})
