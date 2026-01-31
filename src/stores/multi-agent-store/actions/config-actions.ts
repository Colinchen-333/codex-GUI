import { log } from '../../../lib/logger'
import { threadApi } from '../../../lib/api'
import { normalizeApprovalPolicy } from '../../../lib/normalize'
import { useThreadStore } from '../../thread'
import type { StoreSlice, MultiAgentConfig } from '../types'
import { DEFAULT_CONFIG } from '../constants'

export interface ConfigActionSlice {
  setConfig: (config: Partial<MultiAgentConfig>) => void
  setWorkingDirectory: (dir: string) => void
  reset: () => void
}

export const createConfigActions: StoreSlice<ConfigActionSlice> = (set, get) => ({
  setConfig: (config: Partial<MultiAgentConfig>) => {
    set((state) => {
      const nextConfig = { ...state.config, ...config }
      if (config.approvalPolicy) {
        const normalized = normalizeApprovalPolicy(config.approvalPolicy)
        if (normalized) {
          nextConfig.approvalPolicy = normalized
        }
      }
      if (config.timeout !== undefined && config.timeout < 0) {
        nextConfig.timeout = state.config.timeout
      }
      state.config = nextConfig
    })
  },

  setWorkingDirectory: (dir: string) => {
    set((state) => {
      state.workingDirectory = dir
      state.config.cwd = dir
    })
  },

  reset: () => {
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

    const agents = Object.values(state.agents)
    const threadIds: string[] = []

    for (const agent of agents) {
      if (agent.threadId) {
        threadIds.push(agent.threadId)
        if (agent.status === 'running') {
          threadApi.interrupt(agent.threadId).catch((error) => {
            log.error(`[reset] Failed to interrupt thread ${agent.threadId}: ${error}`, 'multi-agent')
          })
        }
      }
    }

    const threadStore = useThreadStore.getState()
    for (const threadId of threadIds) {
      threadStore.closeThread(threadId)
    }

    set((s) => {
      s.config = DEFAULT_CONFIG
      s.workingDirectory = ''
      s.agents = {}
      s.agentOrder = []
      s.agentMapping = {}
      s.workflow = null
      s.previousPhaseOutput = undefined
      s.phaseCompletionInFlight = null
      s.approvalInFlight = {}
      s.approvalTimeouts = {}
      s.pauseInFlight = {}
      s.dependencyWaitTimeouts = {}
      s.pauseTimeouts = {}
      s.phaseOperationVersion = 0
      s.restartRecoveryInFlight = false
    })
  },
})
