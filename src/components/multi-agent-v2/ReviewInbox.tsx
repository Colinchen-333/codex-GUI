import { useMemo } from 'react'
import { X, CheckSquare, FileCode, ChevronRight, Clock } from 'lucide-react'
import { useMultiAgentStore } from '../../stores/multi-agent-v2'
import { useThreadStore } from '../../stores/thread'
import { cn } from '../../lib/utils'

interface ReviewInboxProps {
  isOpen: boolean
  onClose: () => void
  onSelectAgent: (agentId: string) => void
  onOpenPhaseApproval: () => void
}

interface SafetyApprovalItem {
  agentId: string
  agentName: string
  agentType: string
  threadId: string
  count: number
}

export function ReviewInbox({ isOpen, onClose, onSelectAgent, onOpenPhaseApproval }: ReviewInboxProps) {
  const agents = useMultiAgentStore((state) => Object.values(state.agents))
  const workflow = useMultiAgentStore((state) => state.workflow)
  const threadStoreState = useThreadStore((state) => state.threads)

  const pendingApprovalPhase = useMemo(() => {
    if (!workflow) return null
    const currentPhase = workflow.phases[workflow.currentPhaseIndex]
    if (!currentPhase) return null
    if (
      currentPhase.requiresApproval &&
      (currentPhase.status === 'awaiting_approval' || currentPhase.status === 'approval_timeout')
    ) {
      return currentPhase
    }
    return null
  }, [workflow])

  const safetyApprovals = useMemo((): SafetyApprovalItem[] => {
    const items: SafetyApprovalItem[] = []
    for (const agent of agents) {
      if (!agent.threadId) continue
      const thread = threadStoreState[agent.threadId]
      if (thread?.pendingApprovals && thread.pendingApprovals.length > 0) {
        items.push({
          agentId: agent.id,
          agentName: getAgentTypeName(agent.type),
          agentType: agent.type,
          threadId: agent.threadId,
          count: thread.pendingApprovals.length,
        })
      }
    }
    return items
  }, [agents, threadStoreState])

  const totalCount = (pendingApprovalPhase ? 1 : 0) + safetyApprovals.reduce((sum, item) => sum + item.count, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-foreground">审批收件箱</h3>
            {totalCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">
                {totalCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {totalCount === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>没有待处理的审批</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingApprovalPhase && (
                <button
                  onClick={() => {
                    onOpenPhaseApproval()
                    onClose()
                  }}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    pendingApprovalPhase.status === 'approval_timeout'
                      ? "bg-red-500/10"
                      : "bg-amber-500/10"
                  )}>
                    {pendingApprovalPhase.status === 'approval_timeout' ? (
                      <Clock className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckSquare className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {pendingApprovalPhase.status === 'approval_timeout' ? '阶段审批超时' : '阶段审批'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {pendingApprovalPhase.name} - {pendingApprovalPhase.agentIds.length} 个代理已完成
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              )}

              {safetyApprovals.map((item) => (
                <button
                  key={item.agentId}
                  onClick={() => {
                    onSelectAgent(item.agentId)
                    onClose()
                  }}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <FileCode className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">安全审批</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.agentName} - {item.count} 个待处理
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full">
                    {item.count}
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            点击项目直接跳转到审批详情
          </p>
        </div>
      </div>
    </div>
  )
}

function getAgentTypeName(type: string): string {
  const names: Record<string, string> = {
    explore: '探索代理',
    plan: '计划代理',
    'code-writer': '编码代理',
    bash: '命令代理',
    tester: '测试代理',
  }
  return names[type] ?? type
}
