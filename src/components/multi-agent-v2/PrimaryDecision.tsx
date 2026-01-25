import { memo, useMemo } from 'react'
import { CheckCircle, XCircle, Clock, Shield, AlertTriangle, ChevronRight, Layers } from 'lucide-react'
import type { WorkflowPhase, Workflow } from '../../stores/multi-agent-v2'
import { useThreadStore } from '../../stores/thread'
import { useDecisionQueue } from '../../hooks/useDecisionQueue'
import { cn } from '../../lib/utils'

interface PrimaryDecisionProps {
  pendingPhase: WorkflowPhase | null
  workflow: Workflow | null
  agents: { id: string; threadId: string; status: string }[]
  onApprovePhase: () => void
  onRejectPhase: () => void
  onOpenReviewInbox: () => void
  onRecoverTimeout?: () => void
}

function PrimaryDecisionComponent({
  pendingPhase,
  workflow,
  agents,
  onApprovePhase,
  onRejectPhase,
  onOpenReviewInbox,
  onRecoverTimeout,
}: PrimaryDecisionProps) {
  const threadStoreState = useThreadStore((state) => state.threads)
  const { counts } = useDecisionQueue()

  const safetyApprovalInfo = useMemo(() => {
    let count = 0
    let firstAgentId: string | null = null
    let affectedAgentCount = 0

    for (const agent of agents) {
      const thread = threadStoreState[agent.threadId]
      if (thread?.pendingApprovals && thread.pendingApprovals.length > 0) {
        count += thread.pendingApprovals.length
        affectedAgentCount++
        if (!firstAgentId) {
          firstAgentId = agent.id
        }
      }
    }

    return { count, firstAgentId, affectedAgentCount }
  }, [agents, threadStoreState])

  const systemHealthInfo = useMemo(() => {
    const runningAgents = agents.filter(a => a.status === 'running').length
    const totalAgents = agents.length
    const remainingPhases = workflow 
      ? workflow.phases.length - workflow.currentPhaseIndex - 1
      : 0
    
    return { runningAgents, totalAgents, remainingPhases }
  }, [agents, workflow])

  const deferredDecisionCount = useMemo(() => {
    return counts.total - (safetyApprovalInfo.count > 0 ? 1 : 0) - (pendingPhase ? 1 : 0)
  }, [counts.total, safetyApprovalInfo.count, pendingPhase])

  const hasSafetyApproval = safetyApprovalInfo.count > 0
  const hasPhaseApproval = pendingPhase !== null
  const isTimeout = pendingPhase?.status === 'approval_timeout'

  if (!hasSafetyApproval && !hasPhaseApproval) {
    return null
  }

  if (hasSafetyApproval) {
    return (
      <div className="mx-4 my-3">
        <div className={cn(
          "rounded-xl border-2 p-4 transition-all",
          "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20",
          "border-amber-300 dark:border-amber-700",
          "shadow-lg shadow-amber-100 dark:shadow-amber-900/30"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg">
                <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                    安全审批需要您的关注
                  </h3>
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 rounded">
                    {safetyApprovalInfo.affectedAgentCount} 个代理阻塞中
                  </span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {safetyApprovalInfo.count} 个待处理的文件变更或命令执行请求
                  {systemHealthInfo.runningAgents > 0 && (
                    <span className="ml-1 opacity-75">
                      · 其余 {systemHealthInfo.runningAgents} 个代理仍在运行
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {deferredDecisionCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <Layers className="w-3.5 h-3.5" />
                  <span>+{deferredDecisionCount} 其他待处理</span>
                </div>
              )}
              <button
                onClick={onOpenReviewInbox}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                  "bg-amber-600 hover:bg-amber-700 text-white",
                  "shadow-md hover:shadow-lg"
                )}
              >
                立即处理
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (hasPhaseApproval && pendingPhase) {
    const nextPhaseName = workflow && workflow.currentPhaseIndex < workflow.phases.length - 1
      ? workflow.phases[workflow.currentPhaseIndex + 1].name
      : null

    return (
      <div className="mx-4 my-3">
        <div className={cn(
          "rounded-xl border-2 p-4 transition-all",
          isTimeout
            ? "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-300 dark:border-orange-700"
            : "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-300 dark:border-blue-700",
          "shadow-lg",
          isTimeout ? "shadow-orange-100 dark:shadow-orange-900/30" : "shadow-blue-100 dark:shadow-blue-900/30"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isTimeout ? "bg-orange-100 dark:bg-orange-800" : "bg-blue-100 dark:bg-blue-800"
              )}>
                {isTimeout ? (
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                ) : (
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={cn(
                    "font-semibold",
                    isTimeout ? "text-orange-900 dark:text-orange-100" : "text-blue-900 dark:text-blue-100"
                  )}>
                    {isTimeout ? '审批已超时' : '阶段审批'}：{pendingPhase.name}
                  </h3>
                  <span className={cn(
                    "px-1.5 py-0.5 text-xs font-medium rounded",
                    isTimeout 
                      ? "bg-orange-200 dark:bg-orange-700 text-orange-800 dark:text-orange-200"
                      : "bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200"
                  )}>
                    {pendingPhase.agentIds.length} 个代理已完成
                  </span>
                </div>
                <p className={cn(
                  "text-sm",
                  isTimeout ? "text-orange-700 dark:text-orange-300" : "text-blue-700 dark:text-blue-300"
                )}>
                  {isTimeout ? (
                    <>工作流已暂停 · 批准后将继续{nextPhaseName ? `进入「${nextPhaseName}」阶段` : '完成工作流'}</>
                  ) : (
                    <>
                      {nextPhaseName 
                        ? `批准 → 进入「${nextPhaseName}」阶段 · 拒绝 → 终止工作流`
                        : '批准 → 完成工作流 · 拒绝 → 终止工作流'}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isTimeout && onRecoverTimeout && (
                <button
                  onClick={onRecoverTimeout}
                  className="px-3 py-2 text-sm font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-800 rounded-lg transition-colors"
                  title="重置审批计时器，继续等待您的决策"
                >
                  重置计时
                </button>
              )}
              <button
                onClick={onRejectPhase}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                title="拒绝此阶段的工作成果，终止工作流"
              >
                <XCircle className="w-4 h-4" />
                拒绝
              </button>
              <button
                onClick={onApprovePhase}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium transition-all",
                  "bg-green-600 hover:bg-green-700 text-white",
                  "shadow-md hover:shadow-lg"
                )}
                title={nextPhaseName ? `批准并进入「${nextPhaseName}」阶段` : '批准并完成工作流'}
              >
                <CheckCircle className="w-4 h-4" />
                批准继续
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export const PrimaryDecision = memo(PrimaryDecisionComponent)
