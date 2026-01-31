import { log } from '../../../lib/logger'
import { threadApi } from '../../../lib/api'
import type { StoreSlice } from '../types'
import { DEFAULT_APPROVAL_TIMEOUT_MS, DEFAULT_PAUSE_TIMEOUT_MS } from '../constants'

export interface TimerActionSlice {
  _startApprovalTimeout: (phaseId: string, timeoutMs?: number) => void
  _clearApprovalTimeout: (phaseId: string) => void
  _isPauseInFlight: (agentId: string) => boolean
  _clearDependencyWaitTimeout: (agentId: string) => void
  _startPauseTimeout: (agentId: string, timeoutMs?: number) => void
  _clearPauseTimeout: (agentId: string) => void
  _clearAllTimers: () => void
}

export const createTimerActions: StoreSlice<TimerActionSlice> = (set, get) => ({
  _startApprovalTimeout: (phaseId: string, timeoutMs: number = DEFAULT_APPROVAL_TIMEOUT_MS) => {
    get()._clearApprovalTimeout(phaseId)

    log.info(`[_startApprovalTimeout] Starting ${timeoutMs}ms timeout for phase ${phaseId}`, 'multi-agent')

    const timeoutId = setTimeout(() => {
      const state = get()
      const workflow = state.workflow

      if (!workflow || workflow.status !== 'running') {
        log.info(`[_startApprovalTimeout] Timeout fired but workflow not running, ignoring`, 'multi-agent')
        return
      }

      const phase = workflow.phases.find((p) => p.id === phaseId)
      if (!phase) {
        log.info(`[_startApprovalTimeout] Timeout fired but phase ${phaseId} not found, ignoring`, 'multi-agent')
        return
      }

      const currentPhase = workflow.phases[workflow.currentPhaseIndex]
      if (!currentPhase || currentPhase.id !== phaseId) {
        log.info(`[_startApprovalTimeout] Timeout fired but phase ${phaseId} is no longer current, ignoring`, 'multi-agent')
        return
      }

      if (state.approvalInFlight[phaseId]) {
        log.info(`[_startApprovalTimeout] Timeout fired but approval in flight for ${phaseId}, ignoring`, 'multi-agent')
        return
      }

      log.warn(`[_startApprovalTimeout] Approval timeout for phase ${phaseId}, marking as approval_timeout (recoverable)`, 'multi-agent')

      set((s) => {
        if (!s.workflow) return

        const p = s.workflow.phases.find((wp) => wp.id === phaseId)
        if (p) {
          p.status = 'approval_timeout'
          p.output = `审批超时：用户在 ${timeoutMs / 1000} 秒内未响应。可通过 recoverApprovalTimeout 恢复。`
        }

        delete s.approvalTimeouts[phaseId]
      })
    }, timeoutMs)

    set((s) => {
      s.approvalTimeouts[phaseId] = timeoutId
    })
  },

  _clearApprovalTimeout: (phaseId: string) => {
    const state = get()
    const timeoutId = state.approvalTimeouts[phaseId]

    if (timeoutId) {
      clearTimeout(timeoutId)
      log.info(`[_clearApprovalTimeout] Cleared timeout for phase ${phaseId}`, 'multi-agent')

      set((s) => {
        delete s.approvalTimeouts[phaseId]
      })
    }
  },

  _isPauseInFlight: (agentId: string) => {
    return get().pauseInFlight[agentId] === true
  },

  _clearDependencyWaitTimeout: (agentId: string) => {
    const state = get()
    const intervalId = state.dependencyWaitTimeouts[agentId]

    if (intervalId) {
      clearInterval(intervalId as unknown as ReturnType<typeof setInterval>)
      log.info(`[_clearDependencyWaitTimeout] Cleared interval for agent ${agentId}`, 'multi-agent')

      set((s) => {
        delete s.dependencyWaitTimeouts[agentId]
      })
    }
  },

  _startPauseTimeout: (agentId: string, timeoutMs: number = DEFAULT_PAUSE_TIMEOUT_MS) => {
    get()._clearPauseTimeout(agentId)

    log.info(`[_startPauseTimeout] Starting ${timeoutMs}ms timeout for agent ${agentId}`, 'multi-agent')

    const timeoutId = setTimeout(async () => {
      const state = get()
      const agent = state.agents[agentId]

      if (!agent) {
        log.info(`[_startPauseTimeout] Timeout fired but agent ${agentId} not found, ignoring`, 'multi-agent')
        return
      }

      if (agent.status !== 'pending' || agent.interruptReason !== 'pause') {
        log.info(`[_startPauseTimeout] Timeout fired but agent ${agentId} is no longer paused, ignoring`, 'multi-agent')
        return
      }

      log.warn(`[_startPauseTimeout] Pause timeout for agent ${agentId}, marking as error`, 'multi-agent')

      if (agent.threadId) {
        try {
          await threadApi.interrupt(agent.threadId)
        } catch (error) {
          log.error(`[_startPauseTimeout] Failed to interrupt thread ${agent.threadId}: ${error}`, 'multi-agent')
        }
      }

      set((s) => {
        const a = s.agents[agentId]
        if (a) {
          a.status = 'error'
          a.completedAt = new Date()
          a.interruptReason = undefined
          a.error = {
            message: `暂停超时：Agent 在 ${timeoutMs / 1000 / 60} 分钟内未恢复`,
            code: 'PAUSE_TIMEOUT',
            recoverable: true,
          }
          a.progress.description = '暂停超时'
        }

        delete s.pauseTimeouts[agentId]
      })

      const currentVersion = get().phaseOperationVersion
      get().checkPhaseCompletion(currentVersion).catch((err) => {
        log.error(`[_startPauseTimeout] Failed to check phase completion: ${err}`, 'multi-agent')
      })
    }, timeoutMs)

    set((s) => {
      s.pauseTimeouts[agentId] = timeoutId
    })
  },

  _clearPauseTimeout: (agentId: string) => {
    const state = get()
    const timeoutId = state.pauseTimeouts[agentId]

    if (timeoutId) {
      clearTimeout(timeoutId)
      log.info(`[_clearPauseTimeout] Cleared timeout for agent ${agentId}`, 'multi-agent')

      set((s) => {
        delete s.pauseTimeouts[agentId]
      })
    }
  },

  _clearAllTimers: () => {
    const state = get()

    for (const phaseId of Object.keys(state.approvalTimeouts)) {
      get()._clearApprovalTimeout(phaseId)
    }

    for (const agentId of Object.keys(state.dependencyWaitTimeouts)) {
      get()._clearDependencyWaitTimeout(agentId)
    }

    for (const agentId of Object.keys(state.pauseTimeouts)) {
      get()._clearPauseTimeout(agentId)
    }

    set((s) => {
      s.approvalTimeouts = {}
      s.dependencyWaitTimeouts = {}
      s.pauseTimeouts = {}
    })

    log.info('[_clearAllTimers] All timers cleared', 'multi-agent')
  },
})
