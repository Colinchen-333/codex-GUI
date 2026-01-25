/**
 * AgentCard - Display card for a single agent
 *
 * Shows agent status, task, progress, and output preview
 * Supports dark mode and provides retry functionality
 */

import { useCallback, memo } from 'react'
import { X, Eye, Pause, Play, AlertCircle, RotateCcw, Loader2, Bell } from 'lucide-react'
import type { AgentDescriptor } from '../../stores/multi-agent-v2'
import { useThreadStore } from '../../stores/thread'
import {
  formatAgentStatus,
  getStatusColor,
  getStatusBgColor,
  calculateProgressPercentage,
  canCancelAgent,
  getElapsedTime,
  formatElapsedTime,
  getAgentTypeDisplayName,
  getAgentTypeIcon,
} from '../../lib/agent-utils'
import { cn } from '../../lib/utils'

interface AgentCardProps {
  agent: AgentDescriptor
  onViewDetails?: (agentId: string) => void
  onCancel?: (agentId: string) => void
  onPause?: (agentId: string) => void
  onResume?: (agentId: string) => void
  onRetry?: (agentId: string) => void
  /** Whether an operation is in progress for this agent */
  isOperating?: boolean
}

function AgentCardComponent({ agent, onViewDetails, onCancel, onPause, onResume, onRetry, isOperating }: AgentCardProps) {
  const threadState = useThreadStore((state) => state.threads[agent.threadId])

  const handlePause = useCallback(() => {
    if (isOperating) return
    onPause?.(agent.id)
  }, [agent.id, onPause, isOperating])

  const handleResume = useCallback(() => {
    if (isOperating) return
    onResume?.(agent.id)
  }, [agent.id, onResume, isOperating])

  const handleCancel = useCallback(() => {
    if (isOperating) return
    onCancel?.(agent.id)
  }, [agent.id, onCancel, isOperating])

  const handleRetry = useCallback(() => {
    if (isOperating) return
    onRetry?.(agent.id)
  }, [agent.id, onRetry, isOperating])

  const progressPercentage = calculateProgressPercentage(agent.progress)
  const elapsedTime = getElapsedTime(agent)
  const isRunning = agent.status === 'running'
  const isPaused = agent.status === 'pending' && agent.interruptReason === 'pause'
  const pendingApprovalCount = threadState?.pendingApprovals?.length ?? 0
  const hasWaitingApprovals = pendingApprovalCount > 0
  const STUCK_THRESHOLD_MS = 5 * 60 * 1000
  const maybeStuck = isRunning && elapsedTime > STUCK_THRESHOLD_MS

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden',
        'border-border',
        agent.status === 'error' && 'border-destructive/50',
        agent.status === 'running' && 'border-blue-400 dark:border-blue-500/50 ring-1 ring-blue-100 dark:ring-blue-900/30',
        agent.status === 'completed' && 'border-green-400 dark:border-green-500/50',
        agent.status === 'cancelled' && 'border-muted-foreground/30 opacity-75'
      )}
    >
      {/* Quick Actions Overlay (Visible on Hover) */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1 bg-card/90 backdrop-blur rounded-lg p-1 border border-border shadow-sm">
        {isRunning && onPause && (
          <button onClick={handlePause} disabled={isOperating} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
             {isOperating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
          </button>
        )}
        {isPaused && onResume && (
          <button onClick={handleResume} disabled={isOperating} className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/20 rounded text-green-600 dark:text-green-400">
             {isOperating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          </button>
        )}
        {onViewDetails && (
          <button onClick={() => onViewDetails(agent.id)} className="p-1.5 hover:bg-muted rounded text-blue-600 dark:text-blue-400">
             <Eye className="w-4 h-4" />
          </button>
        )}
        {canCancelAgent(agent) && onCancel && (
          <button onClick={handleCancel} disabled={isOperating} className="p-1.5 hover:bg-destructive/10 rounded text-destructive">
             <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-5">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
             <div className={cn(
               "w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-muted",
               isRunning && "animate-pulse ring-2 ring-blue-500/20"
             )}>
               {getAgentTypeIcon(agent.type)}
             </div>
             <div>
               <h3 className="font-bold text-foreground text-sm">{getAgentTypeDisplayName(agent.type)}</h3>
               <div className="flex items-center gap-2 mt-0.5">
                 <span className={cn(
                   'px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded',
                   getStatusBgColor(agent.status),
                   getStatusColor(agent.status)
                 )}>
                   {formatAgentStatus(agent.status)}
                 </span>
                 {elapsedTime > 0 && <span className="text-[10px] text-muted-foreground font-mono">{formatElapsedTime(elapsedTime)}</span>}
               </div>
             </div>
          </div>
        </div>

        {/* Task Section - Truncated */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[2.5em]" title={agent.task}>
          {agent.task}
        </p>

        {isPaused && onResume && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-lg p-3 mb-3">
             <p className="text-xs font-medium text-amber-800 dark:text-amber-300">代理已暂停</p>
             <button
               onClick={handleResume}
               disabled={isOperating}
               className="mt-2 text-[10px] font-bold text-amber-700 flex items-center gap-1 hover:underline"
             >
               <Play className="w-3 h-3" /> 继续
             </button>
          </div>
        )}

        {/* Dynamic Status Area */}
        {hasWaitingApprovals ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-lg p-3 flex items-center gap-3 animate-pulse">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">需要审批</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">{pendingApprovalCount} 个待处理请求</p>
            </div>
          </div>
        ) : maybeStuck ? (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 rounded-lg p-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <div className="flex-1">
              <p className="text-xs font-bold text-orange-700 dark:text-orange-300">可能卡住</p>
              <p className="text-[10px] text-orange-600 dark:text-orange-400">超过 5 分钟无输出</p>
            </div>
          </div>
        ) : isRunning ? (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase">
              <span>进度</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-1">
              {agent.progress.description || '处理中...'}
            </p>
          </div>
        ) : agent.status === 'error' && agent.error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-lg p-3">
             <p className="text-xs font-medium text-red-800 dark:text-red-300 line-clamp-2">{agent.error.message}</p>
             {agent.error.recoverable && onRetry && (
                <button
                  onClick={handleRetry}
                  disabled={isOperating}
                  className="mt-2 text-[10px] font-bold text-red-700 flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" /> 重试
                </button>
             )}
          </div>
        ) : (
          <div className="h-12 flex items-center justify-center text-muted-foreground/50">
            <span className="text-xs">空闲</span>
          </div>
        )}
      </div>
    </div>
  )
}

export const AgentCard = memo(AgentCardComponent)
