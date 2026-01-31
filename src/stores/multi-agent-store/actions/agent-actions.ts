import type { WritableDraft } from 'immer'
import { getAgentSandboxPolicy } from '../../../lib/agent-types'
import { threadApi } from '../../../lib/api'
import { log } from '../../../lib/logger'
import { parseError } from '../../../lib/errorUtils'
import type { AgentDescriptor, AgentType, AgentConfigOverrides, AgentStatus, AgentError, AgentProgress } from '../../../lib/workflows/types'
import { useThreadStore } from '../../thread'
import type { StoreSlice, MultiAgentState } from '../types'
import {
  DEFAULT_DEPENDENCY_WAIT_TIMEOUT_MS,
  START_SLOT_POLL_MS,
} from '../constants'
import {
  sleep,
  resolveApprovalPolicy,
  resolveSandboxPolicy,
  buildAgentDeveloperInstructions,
  buildAgentTaskMessage,
} from '../helpers'
import { canAgentTransition } from '../state-machine'

export interface AgentActionSlice {
  spawnAgent: (
    type: AgentType,
    task: string,
    dependencies?: string[],
    config?: AgentConfigOverrides
  ) => Promise<string | null>
  updateAgentStatus: (id: string, status: AgentStatus, error?: AgentError) => void
  updateAgentProgress: (id: string, progress: Partial<AgentProgress>) => void
  cancelAgent: (id: string) => Promise<void>
  pauseAgent: (id: string) => Promise<void>
  resumeAgent: (id: string) => Promise<void>
  retryAgent: (id: string) => Promise<void>
  skipAgent: (id: string) => Promise<void>
  removeAgent: (id: string) => void
  clearAgents: () => Promise<void>
}

export const createAgentActions: StoreSlice<AgentActionSlice> = (set, get) => ({
  spawnAgent: async (
    type: AgentType,
    task: string,
    dependencies: string[] = [],
    config: AgentConfigOverrides = {}
  ): Promise<string | null> => {
    try {
      const state = get()
      const agentId = crypto.randomUUID()

      let resolveThreadReady: (success: boolean) => void
      const threadReadyPromise = new Promise<boolean>((resolve) => {
        resolveThreadReady = resolve
      })

      const agent: AgentDescriptor = {
        id: agentId,
        type,
        threadId: '',
        task,
        dependencies,
        status: 'pending',
        progress: {
          current: 0,
          total: 1,
          description: '等待启动',
        },
        threadStoreRef: '',
        createdAt: new Date(),
        config,
      }

      set((state) => {
        state.agents[agentId] = agent as WritableDraft<AgentDescriptor>
        state.agentOrder.push(agentId)
      })

      const shouldAbortStart = () => {
        const current = get().agents[agentId]
        return !current || current.status === 'cancelled' || current.interruptReason === 'cancel'
      }

      const isPaused = () => {
        const current = get().agents[agentId]
        return current?.interruptReason === 'pause'
      }

      const dependencyTimeoutMs = (() => {
        const timeoutSeconds = config.timeout ?? state.config.timeout
        if (timeoutSeconds && timeoutSeconds > 0) {
          return timeoutSeconds * 1000
        }
        return DEFAULT_DEPENDENCY_WAIT_TIMEOUT_MS
      })()

      const waitForDependencies = async () => {
        if (dependencies.length === 0) return true

        set((state) => {
          const agent = state.agents[agentId]
          if (agent) {
            agent.progress.description = '等待依赖完成'
          }
        })

        const evaluateDependencies = (currentState: MultiAgentState) => {
          let hasFailed = false
          const failedDeps: string[] = []
          const allCompleted = dependencies.every((depId) => {
            const dep = currentState.agents[depId]
            if (!dep) {
              hasFailed = true
              failedDeps.push(depId)
              return false
            }
            if (dep.status === 'error' || dep.status === 'cancelled') {
              hasFailed = true
              failedDeps.push(depId)
              return false
            }
            return dep.status === 'completed'
          })
          return { allCompleted, hasFailed, failedDeps }
        }

        const initialStatus = evaluateDependencies(get())
        if (initialStatus.hasFailed) {
          set((state) => {
            const agent = state.agents[agentId]
            if (agent) {
              agent.status = 'error'
              agent.completedAt = new Date()
              agent.error = {
                message: `依赖代理执行失败或被取消: ${initialStatus.failedDeps.join(', ')}`,
                code: 'DEPENDENCY_FAILED',
                recoverable: true,
                details: { failedDependencies: initialStatus.failedDeps },
              }
            }
          })
          return false
        }

        if (initialStatus.allCompleted) return true

        log.info(`[spawnAgent] Agent ${agentId} waiting for dependencies (timeout: ${dependencyTimeoutMs}ms)`, 'multi-agent')

        return new Promise<boolean>((resolve) => {
          let activeTimeMs = 0
          let lastCheckTime = Date.now()
          let wasPaused = false
          let resolved = false

          const cleanup = () => {
            get()._clearDependencyWaitTimeout(agentId)
          }

          const safeResolve = (value: boolean) => {
            if (resolved) return
            resolved = true
            cleanup()
            resolve(value)
          }

          const checkInterval = setInterval(() => {
            const now = Date.now()
            const currentlyPaused = isPaused()

            const pauseInProgress = get().pauseInFlight[agentId]
            if (pauseInProgress) {
              return
            }

            if (shouldAbortStart()) {
              safeResolve(false)
              return
            }

            if (!wasPaused && !currentlyPaused) {
              activeTimeMs += now - lastCheckTime
            }
            lastCheckTime = now
            wasPaused = currentlyPaused

            if (currentlyPaused) {
              return
            }

            if (dependencyTimeoutMs > 0 && activeTimeMs >= dependencyTimeoutMs) {
              log.warn(`[spawnAgent] Agent ${agentId} dependency wait timed out after ${activeTimeMs}ms`, 'multi-agent')
              set((state) => {
                const agent = state.agents[agentId]
                if (agent) {
                  const pendingDeps = dependencies.filter((depId) => {
                    const dep = state.agents[depId]
                    return dep && dep.status !== 'completed'
                  })
                  agent.status = 'error'
                  agent.completedAt = new Date()
                  agent.error = {
                    message: `依赖等待超时 (${Math.round(activeTimeMs / 1000)}秒)，请检查依赖代理状态后重试`,
                    code: 'DEPENDENCY_TIMEOUT',
                    recoverable: true,
                    details: {
                      waitedMs: activeTimeMs,
                      timeoutMs: dependencyTimeoutMs,
                      pendingDependencies: pendingDeps,
                    },
                  }
                }
              })
              safeResolve(false)
              return
            }

            const currentState = get()
            const { allCompleted, hasFailed, failedDeps } = evaluateDependencies(currentState)

            if (hasFailed) {
              set((state) => {
                const agent = state.agents[agentId]
                if (agent) {
                  agent.status = 'error'
                  agent.completedAt = new Date()
                  agent.error = {
                    message: `依赖代理执行失败或被取消: ${failedDeps.join(', ')}`,
                    code: 'DEPENDENCY_FAILED',
                    recoverable: true,
                    details: { failedDependencies: failedDeps },
                  }
                }
              })
              safeResolve(false)
              return
            }

            if (allCompleted) {
              safeResolve(true)
            }
          }, 2000)

          set((s) => {
            s.dependencyWaitTimeouts[agentId] = checkInterval as unknown as ReturnType<typeof setTimeout>
          })
        })
      }

      const waitForSlot = async () => {
        if (state.config.maxConcurrentAgents <= 0) {
          set((state) => {
            const agent = state.agents[agentId]
            if (agent) {
              agent.status = 'running'
              agent.startedAt = new Date()
              agent.progress.description = '正在启动'
            }
          })
          return true
        }

        let logged = false
        while (true) {
          if (shouldAbortStart()) return false

          if (isPaused()) {
            await sleep(START_SLOT_POLL_MS)
            continue
          }

          let slotReserved = false
          set((state) => {
            const agent = state.agents[agentId]
            if (!agent || agent.status === 'running' || agent.status === 'completed' || agent.status === 'cancelled') {
              return
            }

            const runningAgents = Object.values(state.agents).filter(
              (a) => a.status === 'running'
            ).length

            if (runningAgents < state.config.maxConcurrentAgents) {
              agent.status = 'running'
              agent.startedAt = new Date()
              agent.progress.description = '正在启动'
              slotReserved = true
            }
          })

          if (slotReserved) {
            return true
          }

          const currentAgent = get().agents[agentId]
          if (!currentAgent || currentAgent.status === 'cancelled') {
            return false
          }

          if (!logged) {
            logged = true
            const currentState = get()
            log.warn(
              `[spawnAgent] Max concurrent agents (${currentState.config.maxConcurrentAgents}) reached`,
              'multi-agent'
            )
            set((state) => {
              const agent = state.agents[agentId]
              if (agent && agent.status === 'pending') {
                agent.progress.description = '等待空闲代理位'
              }
            })
          }

          await sleep(START_SLOT_POLL_MS)
        }
      }

      void (async () => {
        try {
          const depsReady = await waitForDependencies()
          if (!depsReady) {
            resolveThreadReady!(false)
            return
          }

          const slotReady = await waitForSlot()
          if (!slotReady) {
            resolveThreadReady!(false)
            return
          }

          const sandboxPolicyRaw = getAgentSandboxPolicy(type)
          const sandboxPolicy = resolveSandboxPolicy(sandboxPolicyRaw)

          const approvalPolicy = resolveApprovalPolicy(
            sandboxPolicyRaw,
            config.approvalPolicy,
            state.config.approvalPolicy
          )

          const model = config.model || state.config.model || undefined

          const developerInstructions = buildAgentDeveloperInstructions(type)

          const response = await threadApi.start(
            state.config.projectId || '',
            state.config.cwd,
            model,
            sandboxPolicy,
            approvalPolicy,
            developerInstructions
              ? { developerInstructions }
              : undefined
          )

          const threadId = response.thread.id

          try {
            useThreadStore.getState().registerAgentThread(response.thread, agentId, { focus: false })
          } catch (registrationError) {
            log.error(`[spawnAgent] Failed to register thread ${threadId} for agent ${agentId}: ${registrationError}`, 'multi-agent')
            set((state) => {
              const agent = state.agents[agentId]
              if (agent) {
                agent.status = 'error'
                agent.completedAt = new Date()
                agent.error = {
                  message: `Thread registration failed: ${parseError(registrationError)}`,
                  code: 'THREAD_REGISTRATION_FAILED',
                  recoverable: true,
                }
              }
            })
            resolveThreadReady!(false)
            return
          }

          set((state) => {
            const agent = state.agents[agentId]
            if (agent) {
              agent.threadId = threadId
              agent.threadStoreRef = threadId
              agent.status = 'running'
              agent.progress.description = '正在执行任务'
              agent.interruptReason = undefined
            }
            state.agentMapping[threadId] = agentId
          })

          const agentTaskMessage = buildAgentTaskMessage(task)
          try {
            await threadApi.sendMessage(threadId, agentTaskMessage, [], [], {
              model,
              approvalPolicy,
              sandboxPolicy,
            })
          } catch (sendError) {
            log.error(`[spawnAgent] Failed to send initial message for agent ${agentId}: ${sendError}`, 'multi-agent')
            useThreadStore.getState().unregisterAgentThread(threadId)
            set((state) => {
              const agent = state.agents[agentId]
              if (agent) {
                agent.status = 'error'
                agent.completedAt = new Date()
                agent.threadId = ''
                agent.threadStoreRef = ''
                agent.error = {
                  message: `Failed to send initial message: ${parseError(sendError)}`,
                  code: 'INITIAL_MESSAGE_FAILED',
                  recoverable: true,
                }
              }
              delete state.agentMapping[threadId]
            })
            resolveThreadReady!(false)
            return
          }

          log.info(`[spawnAgent] Agent ${agentId} started with thread ${threadId}`, 'multi-agent')
          resolveThreadReady!(true)
        } catch (error) {
          log.error(`[spawnAgent] Failed to start thread for agent ${agentId}: ${error}`, 'multi-agent')
          set((state) => {
            const agent = state.agents[agentId]
            if (agent) {
              agent.status = 'error'
              agent.completedAt = new Date()
              agent.error = {
                message: parseError(error),
                code: 'THREAD_START_FAILED',
                recoverable: true,
              }
            }
          })
          resolveThreadReady!(false)
        }
      })()

      const success = await threadReadyPromise
      return success ? agentId : null
    } catch (error) {
      log.error(`[spawnAgent] Failed to create agent: ${error}`, 'multi-agent')
      return null
    }
  },

  updateAgentStatus: (id: string, status: AgentStatus, error?: AgentError) => {
    set((state) => {
      const agent = state.agents[id]
      if (!agent) return

      if (!canAgentTransition(agent.status, status)) {
        log.warn(`[updateAgentStatus] Invalid transition for agent ${id}: ${agent.status} → ${status}`, 'multi-agent')
        return
      }

      agent.status = status

      if (status === 'running' && !agent.startedAt) {
        agent.startedAt = new Date()
      }

      if (status === 'completed' || status === 'error' || status === 'cancelled') {
        agent.completedAt = new Date()
      }

      if (error) {
        agent.error = error as WritableDraft<AgentError>
      }

      if (status === 'running' || status === 'completed' || status === 'error') {
        agent.interruptReason = undefined
      }

      if (status === 'cancelled') {
        agent.interruptReason = agent.interruptReason || 'cancel'
      }
    })

    if (status === 'completed' || status === 'error' || status === 'cancelled') {
      const capturedVersion = get().phaseOperationVersion
      setTimeout(() => {
        get().checkPhaseCompletion(capturedVersion).catch((err) => {
          log.error(`[updateAgentStatus] Failed to check phase completion: ${err}`, 'multi-agent')
        })
      }, 0)
    }
  },

  updateAgentProgress: (id: string, progress: Partial<AgentProgress>) => {
    set((state) => {
      const agent = state.agents[id]
      if (!agent) return

      agent.progress = { ...agent.progress, ...progress }
    })
  },

  cancelAgent: async (id: string) => {
    const agent = get().agents[id]
    if (!agent) return

    try {
      get()._clearPauseTimeout(id)

      set((state) => {
        const current = state.agents[id]
        if (current) {
          current.status = 'cancelled'
          current.completedAt = new Date()
          current.interruptReason = 'cancel'
          current.progress.description = '已取消'
        }
      })

      if (agent.threadId) {
        await threadApi.interrupt(agent.threadId)
      }

      log.info(`[cancelAgent] Agent ${id} cancelled`, 'multi-agent')
    } catch (error) {
      log.error(`[cancelAgent] Failed to cancel agent ${id}: ${error}`, 'multi-agent')
    }
  },

  pauseAgent: async (id: string) => {
    const agent = get().agents[id]
    if (!agent) return

    if (get().pauseInFlight[id]) {
      log.warn(`[pauseAgent] Pause already in flight for agent ${id}, ignoring duplicate call`, 'multi-agent')
      return
    }

    let claimed = false
    const originalStatus = agent.status
    const originalInterruptReason = agent.interruptReason
    const originalProgressDescription = agent.progress.description

    set((state) => {
      if (state.pauseInFlight[id]) return
      state.pauseInFlight[id] = true
      claimed = true
      const current = state.agents[id]
      if (current) {
        current.progress.description = '正在暂停...'
      }
    })

    if (!claimed) {
      log.warn(`[pauseAgent] Failed to claim pause lock for agent ${id}`, 'multi-agent')
      return
    }

    try {
      if (agent.threadId && agent.status === 'running') {
        await threadApi.interrupt(agent.threadId)
      }

      set((state) => {
        const current = state.agents[id]
        if (current) {
          current.status = 'pending'
          current.interruptReason = 'pause'
          current.progress.description = '已暂停'
        }
      })

      get()._startPauseTimeout(id)

      log.info(`[pauseAgent] Agent ${id} paused`, 'multi-agent')
    } catch (error) {
      log.error(`[pauseAgent] Failed to pause agent ${id}: ${error}`, 'multi-agent')
      set((state) => {
        const current = state.agents[id]
        if (current) {
          current.status = originalStatus
          current.interruptReason = originalInterruptReason
          current.progress.description = originalProgressDescription
        }
      })
    } finally {
      set((state) => {
        delete state.pauseInFlight[id]
      })
    }
  },

  resumeAgent: async (id: string) => {
    const agent = get().agents[id]
    if (!agent) return

    try {
      get()._clearPauseTimeout(id)

      set((state) => {
        const current = state.agents[id]
        if (current) {
          current.interruptReason = undefined
          if (current.status === 'pending') {
            if (current.threadId) {
              current.status = 'running'
              current.startedAt = current.startedAt ?? new Date()
              current.progress.description = '正在执行任务'
            } else {
              current.progress.description = '等待启动'
            }
          }
        }
      })

      if (agent.threadId) {
        await threadApi.sendMessage(agent.threadId, '请继续执行任务', [], [])
      }

      log.info(`[resumeAgent] Agent ${id} resumed`, 'multi-agent')
    } catch (error) {
      log.error(`[resumeAgent] Failed to resume agent ${id}: ${error}`, 'multi-agent')
    }
  },

  retryAgent: async (id: string) => {
    const agent = get().agents[id]
    if (!agent || agent.status !== 'error') return

    try {
      set((state) => {
        const current = state.agents[id]
        if (current) {
          current.status = 'pending'
          current.error = undefined
          current.progress = {
            current: 0,
            total: 100,
            description: '正在重试...',
          }
        }
      })

      if (agent.threadId) {
        await threadApi.sendMessage(agent.threadId, '请重新执行任务', [], [])
        set((state) => {
          const current = state.agents[id]
          if (current && current.status === 'pending') {
            current.status = 'running'
            current.startedAt = new Date()
          }
        })
      } else {
        const newAgentId = await get().spawnAgent(agent.type, agent.task, agent.dependencies, agent.config)
        if (newAgentId) {
          get().removeAgent(id)
        }
      }

      log.info(`[retryAgent] Agent ${id} retried`, 'multi-agent')
    } catch (error) {
      log.error(`[retryAgent] Failed to retry agent ${id}: ${error}`, 'multi-agent')
      set((state) => {
        const current = state.agents[id]
        if (current && current.status !== 'completed') {
          current.status = 'error'
          current.error = {
            message: `重试失败: ${error}`,
            code: 'RETRY_FAILED',
            recoverable: true,
          }
        }
      })
    }
  },

  skipAgent: async (id: string) => {
    const agent = get().agents[id]
    if (!agent) return
    if (agent.status !== 'error' && agent.status !== 'pending') {
      log.warn(`[skipAgent] Agent ${id} cannot be skipped in status: ${agent.status}`, 'multi-agent')
      return
    }

    try {
      get()._clearPauseTimeout(id)

      set((state) => {
        const current = state.agents[id]
        if (current) {
          current.status = 'completed'
          current.completedAt = new Date()
          current.error = undefined
          current.progress = {
            current: 100,
            total: 100,
            description: '已跳过',
          }
        }
      })

      log.info(`[skipAgent] Agent ${id} skipped`, 'multi-agent')

      const capturedVersion = get().phaseOperationVersion
      setTimeout(() => {
        get().checkPhaseCompletion(capturedVersion).catch((err) => {
          log.error(`[skipAgent] Failed to check phase completion: ${err}`, 'multi-agent')
        })
      }, 0)
    } catch (error) {
      log.error(`[skipAgent] Failed to skip agent ${id}: ${error}`, 'multi-agent')
    }
  },

  removeAgent: (id: string) => {
    const agent = get().agents[id]
    if (!agent) return

    get()._clearPauseTimeout(id)

    const threadId = agent.threadId

    if (threadId) {
      useThreadStore.getState().unregisterAgentThread(threadId)
    }

    set((state) => {
      if (threadId) {
        delete state.agentMapping[threadId]
      }
      delete state.agents[id]
      state.agentOrder = state.agentOrder.filter((aid) => aid !== id)
    })
  },

  clearAgents: async () => {
    const state = get()
    const agents = Object.values(state.agents)

    const agentThreadIds = agents
      .map((agent) => agent.threadId)
      .filter((id): id is string => !!id)

    const mappedThreadIds = Object.keys(state.agentMapping)
    const allThreadIds = [...new Set([...agentThreadIds, ...mappedThreadIds])]

    for (const threadId of allThreadIds) {
      try {
        await threadApi.interrupt(threadId)
      } catch (error) {
        log.error(`[clearAgents] Failed to interrupt thread ${threadId}: ${error}`, 'multi-agent')
      }
    }

    const threadStore = useThreadStore.getState()
    for (const threadId of allThreadIds) {
      threadStore.unregisterAgentThread(threadId)
    }

    set((s) => {
      s.agents = {}
      s.agentOrder = []
      s.agentMapping = {}
    })

    log.info(`[clearAgents] Cleared ${agents.length} agents and ${allThreadIds.length} threads`, 'multi-agent')
  },
})
