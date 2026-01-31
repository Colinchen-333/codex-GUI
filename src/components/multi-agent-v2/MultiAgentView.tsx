/**
 * MultiAgentView - Main view for multi-agent mode
 *
 * Features:
 * - Workflow progress header (4 phases)
 * - Agent grid view (grouped by status)
 * - Agent detail panel (right side drawer)
 * - Real-time state updates from multi-agent store
 * - Dark mode support
 * - Quick start dialogs for workflow/agent creation
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { AlertTriangle, Sparkles, Bot, Clock } from 'lucide-react'
import { WorkflowStageHeader } from './WorkflowStageHeader'
import { AgentGridView } from './AgentGridView'
import { AgentDetailPanel } from './AgentDetailPanel'
import { ApprovalPanel } from './ApprovalPanel'
import { ReviewInbox } from './ReviewInbox'
import { PrimaryDecision } from './PrimaryDecision'
import {
  CancelAgentDialog,
  RestartWorkflowDialog,
  WorkflowQuickStartDialog,
  AgentQuickCreateDialog,
} from './dialogs'
import { useMultiAgentStore, type AgentType } from '../../stores/multi-agent-v2'
import { useWorkflowTemplatesStore } from '../../stores/workflowTemplates'
import { BUILTIN_TEMPLATES } from '../../lib/workflows/presets'
import { useAgents, useWorkflow } from '../../hooks/useMultiAgent'
import { cn } from '../../lib/utils'

export function MultiAgentView() {
  const agents = useAgents()
  const workflow = useWorkflow()
  
  const approvePhase = useMultiAgentStore((state) => state.approvePhase)
  const rejectPhase = useMultiAgentStore((state) => state.rejectPhase)
  const cancelAgent = useMultiAgentStore((state) => state.cancelAgent)
  const pauseAgent = useMultiAgentStore((state) => state.pauseAgent)
  const resumeAgent = useMultiAgentStore((state) => state.resumeAgent)
  const spawnAgent = useMultiAgentStore((state) => state.spawnAgent)
  const retryAgent = useMultiAgentStore((state) => state.retryAgent)
  const retryWorkflow = useMultiAgentStore((state) => state.retryWorkflow)
  const retryPhase = useMultiAgentStore((state) => state.retryPhase)
  const recoverApprovalTimeout = useMultiAgentStore((state) => state.recoverApprovalTimeout)
  const restartRecoveryInFlight = useMultiAgentStore((state) => state.restartRecoveryInFlight)
  const clearAgents = useMultiAgentStore((state) => state.clearAgents)
  const clearWorkflow = useMultiAgentStore((state) => state.clearWorkflow)
  const startWorkflowFromTemplate = useMultiAgentStore((state) => state.startWorkflowFromTemplate)
  
  const userTemplates = useWorkflowTemplatesStore(useShallow((state) => state.userTemplates))
  const templates = useMemo(
    () => [...BUILTIN_TEMPLATES, ...userTemplates],
    [userTemplates]
  )

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [panelWidth, setPanelWidth] = useState(600)
  const resizingRef = useRef(false)
  const minPanelWidth = 400
  const maxPanelWidth = 900

  const [operatingAgentIds, setOperatingAgentIds] = useState<Set<string>>(new Set())
  const [confirmCancelAgentId, setConfirmCancelAgentId] = useState<string | null>(null)
  const [dismissedApprovalPhaseIds, setDismissedApprovalPhaseIds] = useState<Set<string>>(new Set())
  const [showConfirmRestartDialog, setShowConfirmRestartDialog] = useState(false)
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false)
  const [showAgentDialog, setShowAgentDialog] = useState(false)
  const [showReviewInbox, setShowReviewInbox] = useState(false)
  const [workflowTask, setWorkflowTask] = useState('')
  const [agentTask, setAgentTask] = useState('')
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>('explore')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [showStructuredIntent, setShowStructuredIntent] = useState(false)
  const [intentConstraints, setIntentConstraints] = useState('')
  const [intentScope, setIntentScope] = useState('')

  const selectedAgent = selectedAgentId
    ? agents.find((a) => a.id === selectedAgentId)
    : null

  useEffect(() => {
    if (selectedAgentId && !agents.find((a) => a.id === selectedAgentId)) {
      setSelectedAgentId(null)
    }
  }, [selectedAgentId, agents])

  const hasRunningWorkflow = workflow && workflow.status === 'running'

  const pendingApprovalPhase = useMemo(() => {
    if (!workflow) return null
    const currentPhase = workflow.phases[workflow.currentPhaseIndex]
    if (!currentPhase) return null
    if (
      currentPhase.requiresApproval &&
      (currentPhase.status === 'awaiting_approval' || currentPhase.status === 'approval_timeout') &&
      currentPhase.agentIds.length > 0 &&
      !dismissedApprovalPhaseIds.has(currentPhase.id)
    ) {
      return currentPhase
    }
    return null
  }, [workflow, dismissedApprovalPhaseIds])

  const agentsForPrimaryDecision = useMemo(
    () => agents.map(a => ({ id: a.id, threadId: a.threadId, status: a.status, type: a.type })),
    [agents]
  )

  const confirmCancelAgent = confirmCancelAgentId
    ? agents.find((a) => a.id === confirmCancelAgentId) ?? null
    : null

  const handleViewDetails = (agentId: string) => setSelectedAgentId(agentId)
  const handleCloseDetail = () => setSelectedAgentId(null)
  const handleRequestCancel = (agentId: string) => setConfirmCancelAgentId(agentId)
  const handleCancelCancelDialog = () => setConfirmCancelAgentId(null)

  const handleConfirmCancel = useCallback(async () => {
    if (!confirmCancelAgentId) return
    if (operatingAgentIds.has(confirmCancelAgentId)) return
    setOperatingAgentIds((prev) => new Set([...prev, confirmCancelAgentId]))
    try {
      await cancelAgent(confirmCancelAgentId)
    } finally {
      setOperatingAgentIds((prev) => {
        const next = new Set(prev)
        next.delete(confirmCancelAgentId)
        return next
      })
      setConfirmCancelAgentId(null)
    }
  }, [confirmCancelAgentId, cancelAgent, operatingAgentIds])

  const handlePause = useCallback(async (agentId: string) => {
    if (operatingAgentIds.has(agentId)) return
    setOperatingAgentIds((prev) => new Set([...prev, agentId]))
    try {
      await pauseAgent(agentId)
    } finally {
      setOperatingAgentIds((prev) => {
        const next = new Set(prev)
        next.delete(agentId)
        return next
      })
    }
  }, [pauseAgent, operatingAgentIds])

  const handleResume = useCallback(async (agentId: string) => {
    if (operatingAgentIds.has(agentId)) return
    setOperatingAgentIds((prev) => new Set([...prev, agentId]))
    try {
      await resumeAgent(agentId)
    } finally {
      setOperatingAgentIds((prev) => {
        const next = new Set(prev)
        next.delete(agentId)
        return next
      })
    }
  }, [resumeAgent, operatingAgentIds])

  const handleApproval = () => {
    if (pendingApprovalPhase) {
      void approvePhase(pendingApprovalPhase.id)
      setDismissedApprovalPhaseIds((prev) => new Set([...prev, pendingApprovalPhase.id]))
    }
  }

  const handleRejection = async (reason: string) => {
    if (pendingApprovalPhase) {
      await rejectPhase(pendingApprovalPhase.id, reason)
      setDismissedApprovalPhaseIds((prev) => new Set([...prev, pendingApprovalPhase.id]))
    }
  }

  const handleRejectAndRetry = useCallback(async (reason: string) => {
    if (!pendingApprovalPhase) return
    await rejectPhase(pendingApprovalPhase.id, reason)
    await retryPhase(pendingApprovalPhase.id)
  }, [pendingApprovalPhase, rejectPhase, retryPhase])

  const handleRetry = useCallback(async (agentId: string) => {
    if (operatingAgentIds.has(agentId)) return
    setOperatingAgentIds((prev) => new Set([...prev, agentId]))
    try {
      await retryAgent(agentId)
    } finally {
      setOperatingAgentIds((prev) => {
        const next = new Set(prev)
        next.delete(agentId)
        return next
      })
    }
  }, [retryAgent, operatingAgentIds])

  const handleRetryWorkflow = useCallback(() => void retryWorkflow(), [retryWorkflow])

  const handleRecoverTimeout = useCallback((phaseId: string) => {
    recoverApprovalTimeout(phaseId)
    setDismissedApprovalPhaseIds((prev) => {
      const next = new Set(prev)
      next.delete(phaseId)
      return next
    })
  }, [recoverApprovalTimeout])

  const handleOpenReviewInbox = useCallback(() => setShowReviewInbox(true), [])
  
  const handleRejectPhase = useCallback(() => {
    if (pendingApprovalPhase) {
      setDismissedApprovalPhaseIds((prev) => {
        const next = new Set(prev)
        next.delete(pendingApprovalPhase.id)
        return next
      })
    }
    setShowReviewInbox(true)
  }, [pendingApprovalPhase])

  const handleRecoverTimeoutForPhase = useCallback(() => {
    if (pendingApprovalPhase) {
      recoverApprovalTimeout(pendingApprovalPhase.id)
    }
  }, [pendingApprovalPhase, recoverApprovalTimeout])

  const handleCloseReviewInbox = useCallback(() => setShowReviewInbox(false), [])
  const handleSelectAgentFromInbox = useCallback((agentId: string) => setSelectedAgentId(agentId), [])

  const handleOpenPhaseApprovalFromInbox = useCallback(() => {
    if (pendingApprovalPhase) {
      setDismissedApprovalPhaseIds((prev) => {
        const next = new Set(prev)
        next.delete(pendingApprovalPhase.id)
        return next
      })
    }
  }, [pendingApprovalPhase])

  const openWorkflowDialogDirectly = useCallback(() => {
    setShowWorkflowDialog(true)
    setWorkflowTask('')
    setIntentConstraints('')
    setIntentScope('')
    setShowStructuredIntent(false)
    setShowAdvancedOptions(false)
    if (templates.length > 0) {
      setSelectedTemplateId(templates[0].id)
    }
  }, [templates])

  const handleOpenWorkflowDialog = () => {
    if (hasRunningWorkflow) {
      setShowConfirmRestartDialog(true)
      return
    }
    openWorkflowDialogDirectly()
  }

  const handleConfirmRestart = async () => {
    await clearAgents()
    clearWorkflow()
    setShowConfirmRestartDialog(false)
    openWorkflowDialogDirectly()
  }

  const handleCloseWorkflowDialog = () => {
    setShowWorkflowDialog(false)
    setWorkflowTask('')
    setIntentConstraints('')
    setIntentScope('')
    setShowStructuredIntent(false)
  }

  const handleStartWorkflow = async () => {
    if (!workflowTask.trim()) return
    const templateId = selectedTemplateId || templates[0]?.id
    if (!templateId) return
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    if (agents.length > 0) await clearAgents()
    if (workflow) clearWorkflow()

    let enhancedTask = workflowTask.trim()
    if (intentConstraints.trim()) enhancedTask += `\n\n约束条件: ${intentConstraints.trim()}`
    if (intentScope.trim()) enhancedTask += `\n范围: ${intentScope.trim()}`

    void startWorkflowFromTemplate(template, enhancedTask)
    handleCloseWorkflowDialog()
  }

  const handleOpenAgentDialog = () => {
    setShowAgentDialog(true)
    setAgentTask('')
    setSelectedAgentType('explore')
  }

  const handleCloseAgentDialog = () => {
    setShowAgentDialog(false)
    setAgentTask('')
  }

  const handleCreateAgent = () => {
    if (!agentTask.trim()) return
    void spawnAgent(selectedAgentType, agentTask.trim())
    handleCloseAgentDialog()
  }

  return (
    <>
      <ReviewInbox
        isOpen={showReviewInbox}
        onClose={handleCloseReviewInbox}
        onSelectAgent={handleSelectAgentFromInbox}
        onOpenPhaseApproval={handleOpenPhaseApprovalFromInbox}
      />

      <CancelAgentDialog
        isOpen={!!confirmCancelAgentId}
        agent={confirmCancelAgent}
        isOperating={!!confirmCancelAgentId && operatingAgentIds.has(confirmCancelAgentId)}
        onConfirm={() => void handleConfirmCancel()}
        onClose={handleCancelCancelDialog}
      />

      <RestartWorkflowDialog
        isOpen={showConfirmRestartDialog}
        onConfirm={() => void handleConfirmRestart()}
        onClose={() => setShowConfirmRestartDialog(false)}
      />

      <WorkflowQuickStartDialog
        isOpen={showWorkflowDialog}
        task={workflowTask}
        onTaskChange={setWorkflowTask}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onTemplateSelect={setSelectedTemplateId}
        showAdvancedOptions={showAdvancedOptions}
        onToggleAdvancedOptions={() => setShowAdvancedOptions(!showAdvancedOptions)}
        showStructuredIntent={showStructuredIntent}
        onToggleStructuredIntent={() => setShowStructuredIntent(!showStructuredIntent)}
        intentConstraints={intentConstraints}
        onIntentConstraintsChange={setIntentConstraints}
        intentScope={intentScope}
        onIntentScopeChange={setIntentScope}
        onStart={() => void handleStartWorkflow()}
        onClose={handleCloseWorkflowDialog}
      />

      <AgentQuickCreateDialog
        isOpen={showAgentDialog}
        task={agentTask}
        onTaskChange={setAgentTask}
        selectedType={selectedAgentType}
        onTypeSelect={setSelectedAgentType}
        onCreate={handleCreateAgent}
        onClose={handleCloseAgentDialog}
      />

      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800">
          <Bot className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <span className="text-xs font-medium text-violet-700 dark:text-violet-300">多智能体编排</span>
          <span className="text-xs text-violet-600/70 dark:text-violet-400/70">· 并行Agent探索 · 阶段门控审批 · 指点江山</span>
        </div>

        {workflow && (
          <WorkflowStageHeader
            workflow={workflow}
            onRetryWorkflow={handleRetryWorkflow}
            onRecoverTimeout={handleRecoverTimeout}
          />
        )}

        {workflow?.phases[workflow.currentPhaseIndex]?.status === 'approval_timeout' && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800 px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-500" />
              <div>
                <p className="text-sm font-medium text-orange-800 dark:text-orange-300">审批超时 - 请尽快处理</p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  「{workflow.phases[workflow.currentPhaseIndex].name}」阶段等待审批已超时，您仍可操作
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const phase = workflow.phases[workflow.currentPhaseIndex]
                  if (phase) {
                    recoverApprovalTimeout(phase.id)
                    setDismissedApprovalPhaseIds((prev) => {
                      const next = new Set(prev)
                      next.delete(phase.id)
                      return next
                    })
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-700 transition-colors"
              >
                恢复计时
              </button>
              <button
                onClick={() => setShowReviewInbox(true)}
                className="px-3 py-1.5 text-xs font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                立即审批
              </button>
            </div>
          </div>
        )}

        {(() => {
          const restartErrorAgents = agents.filter(a => a.error?.code === 'APP_RESTART_LOST_CONNECTION')
          if (restartErrorAgents.length === 0 && !restartRecoveryInFlight) return null

          return (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">检测到应用重启，部分代理已断开</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {restartRecoveryInFlight
                      ? '正在自动恢复…如果失败请手动恢复'
                      : `${restartErrorAgents.length} 个代理需要恢复。请在审批收件箱中进行操作。`}
                  </p>
                </div>
              </div>
              {!restartRecoveryInFlight && restartErrorAgents.length > 0 && (
                <button
                  onClick={() => setShowReviewInbox(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-700 transition-colors"
                >
                  去恢复
                </button>
              )}
            </div>
          )
        })()}

        <PrimaryDecision
          pendingPhase={pendingApprovalPhase}
          workflow={workflow}
          agents={agentsForPrimaryDecision}
          onApprovePhase={handleApproval}
          onRejectPhase={handleRejectPhase}
          onOpenReviewInbox={handleOpenReviewInbox}
          onRecoverTimeout={handleRecoverTimeoutForPhase}
          onOpenApprovalPanel={undefined}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className={cn('flex-1 overflow-auto transition-all duration-300', selectedAgent ? 'mr-0' : '')}>
            <div className="p-6">
              {agents.length === 0 && !workflow ? (
                <div className="flex items-center justify-center min-h-[500px]">
                  <div className="text-center max-w-xl">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">您决策，代理执行</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">描述您的需求，多个 AI 代理将自动协作完成。所有变更都需要您的审批。</p>
                    <button
                      className="flex items-center justify-center gap-2 w-full max-w-sm mx-auto px-6 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl mb-6"
                      onClick={handleOpenWorkflowDialog}
                    >
                      <Sparkles className="w-5 h-5" />
                      <span className="font-medium">开始新任务</span>
                    </button>
                    <div className="mb-6">
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">或点击示例快速开始</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {['修复失败的测试用例', '为这个模块添加单元测试', '重构这段代码提高可读性'].map((example) => (
                          <button
                            key={example}
                            onClick={() => {
                              setWorkflowTask(example)
                              openWorkflowDialogDirectly()
                            }}
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-6 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" />变更需审批</span>
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" />可查看 Diff</span>
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500" />随时可取消</span>
                    </div>
                    <button
                      className="mt-6 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      onClick={handleOpenAgentDialog}
                    >
                      或手动创建单个代理 →
                    </button>
                  </div>
                </div>
              ) : (
                <AgentGridView
                  agents={agents}
                  onViewDetails={handleViewDetails}
                  onCancel={handleRequestCancel}
                  onPause={handlePause}
                  onResume={handleResume}
                  onRetry={handleRetry}
                  operatingAgentIds={operatingAgentIds}
                />
              )}
            </div>
          </div>

          {(pendingApprovalPhase || selectedAgent) && (
            <div
              className="flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl relative"
              style={{ width: panelWidth }}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500/70 z-10"
                onMouseDown={(e) => {
                  e.preventDefault()
                  resizingRef.current = true
                  const startX = e.clientX
                  const startWidth = panelWidth
                  const onMouseMove = (moveEvent: MouseEvent) => {
                    if (!resizingRef.current) return
                    const delta = startX - moveEvent.clientX
                    const newWidth = Math.min(maxPanelWidth, Math.max(minPanelWidth, startWidth + delta))
                    setPanelWidth(newWidth)
                  }
                  const onMouseUp = () => {
                    resizingRef.current = false
                    document.removeEventListener('mousemove', onMouseMove)
                    document.removeEventListener('mouseup', onMouseUp)
                  }
                  document.addEventListener('mousemove', onMouseMove)
                  document.addEventListener('mouseup', onMouseUp)
                }}
              />
              
              {pendingApprovalPhase ? (
                <ApprovalPanel
                  phase={pendingApprovalPhase}
                  agents={agents.filter((a) => pendingApprovalPhase.agentIds.includes(a.id))}
                  onApprove={handleApproval}
                  onReject={handleRejection}
                  onRejectAndRetry={(reason) => void handleRejectAndRetry(reason)}
                  onClose={() => {
                    setDismissedApprovalPhaseIds((prev) => new Set([...prev, pendingApprovalPhase.id]))
                  }}
                />
              ) : selectedAgent ? (
                <AgentDetailPanel agent={selectedAgent} onClose={handleCloseDetail} />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
