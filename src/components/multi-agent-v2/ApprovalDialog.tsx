import { useState } from 'react'
import { CheckCircle, XCircle, RotateCcw, ChevronDown, ChevronUp, Terminal, FileCode, AlertCircle } from 'lucide-react'
import type { WorkflowPhase, AgentDescriptor } from '../../stores/multi-agent-v2'
import { useThreadStore } from '../../stores/thread'
import { getAgentTypeDisplayName, getAgentTypeIcon } from '../../lib/agent-utils'
import { useToast } from '../ui/Toast'
import { DiffView, parseDiff } from '../ui/DiffView'

interface ApprovalDialogProps {
  phase: WorkflowPhase
  agents: AgentDescriptor[]
  onApprove: () => void
  onReject: (reason: string) => void
  onRejectAndRetry?: (reason: string) => void
}

export function ApprovalDialog({
  phase,
  agents,
  onApprove,
  onReject,
  onRejectAndRetry,
}: ApprovalDialogProps) {
  const [rejectReason, setRejectReason] = useState('')
  const [isRejectMode, setIsRejectMode] = useState(false)
  const [expandedAgents, setExpandedAgents] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    phase.agentIds.forEach((id) => { initial[id] = true })
    return initial
  })
  const { showToast } = useToast()

  const phaseAgents = agents.filter((a) => phase.agentIds.includes(a.id))
  const hasErrors = phaseAgents.some((a) => a.status === 'error')

  const toggleAgentExpanded = (agentId: string) => {
    setExpandedAgents((prev) => ({
      ...prev,
      [agentId]: !prev[agentId],
    }))
  }

  const handleReject = () => {
    if (!rejectReason.trim()) {
      showToast('请输入拒绝原因', 'warning')
      return
    }
    onReject(rejectReason)
  }

  const handleRejectAndRetry = () => {
    if (!rejectReason.trim()) {
      showToast('请输入拒绝原因', 'warning')
      return
    }
    onRejectAndRetry?.(rejectReason)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-5xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-900 dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-gray-900 dark:text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                阶段审批：{phase.name}
              </h2>
              <p className="text-sm text-gray-300">{phase.description}</p>
            </div>
          </div>
          {phase.status === 'approval_timeout' && (
            <span className="px-3 py-1 text-xs font-medium bg-orange-500/20 text-orange-300 rounded-full">
              审批超时
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Error Banner */}
          {hasErrors && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-300">部分代理执行失败</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  您可以选择"拒绝并重试"让代理重新执行，或"仍然批准"继续下一阶段。
                </p>
              </div>
            </div>
          )}

          {/* Phase Output Summary */}
          {phase.output && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">阶段输出</h3>
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                  {phase.output}
                </pre>
              </div>
            </div>
          )}

          {/* Agent Artifacts */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              代理工作成果 ({phaseAgents.length} 个代理)
            </h3>
            {phaseAgents.map((agent, index) => (
              <AgentArtifactCard
                key={agent.id}
                agent={agent}
                index={index}
                isExpanded={expandedAgents[agent.id] || false}
                onToggle={() => toggleAgentExpanded(agent.id)}
              />
            ))}
          </div>

          {/* Reject Mode */}
          {isRejectMode && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
              <label className="block text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                拒绝原因（将用于指导重试）
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请说明哪些方面需要改进..."
                rows={3}
                className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {isRejectMode ? '拒绝后可选择立即重试此阶段' : '审批后将继续执行下一阶段'}
            </div>
            <div className="flex items-center space-x-3">
              {!isRejectMode ? (
                <>
                  <button
                    onClick={() => setIsRejectMode(true)}
                    className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center space-x-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>拒绝</span>
                  </button>
                  <button
                    onClick={onApprove}
                    className="px-6 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>批准并继续</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsRejectMode(false)
                      setRejectReason('')
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    取消
                  </button>
                  {onRejectAndRetry && (
                    <button
                      onClick={handleRejectAndRetry}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center space-x-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>拒绝并重试</span>
                    </button>
                  )}
                  <button
                    onClick={handleReject}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>确认拒绝</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FileChangeContent {
  changes: Array<{
    path: string
    kind: string
    oldPath?: string
    diff: string
  }>
}

interface CommandContent {
  command: string
  output?: string
  exitCode?: number
}

function AgentArtifactCard({
  agent,
  index,
  isExpanded,
  onToggle,
}: {
  agent: AgentDescriptor
  index: number
  isExpanded: boolean
  onToggle: () => void
}) {
  const threadState = useThreadStore((state) => state.threads[agent.threadId])

  const artifacts = (() => {
    if (!threadState) return { fileChanges: [], commands: [], messages: [], errors: [] }

    const fileChanges: Array<{ id: string; content: FileChangeContent }> = []
    const commands: Array<{ id: string; content: CommandContent }> = []
    const messages: string[] = []
    const errors: string[] = []

    for (const id of threadState.itemOrder) {
      const item = threadState.items[id]
      if (!item) continue

      if (item.type === 'fileChange') {
        fileChanges.push({ id, content: item.content as FileChangeContent })
      } else if (item.type === 'commandExecution') {
        commands.push({ id, content: item.content as CommandContent })
      } else if (item.type === 'agentMessage') {
        const text = (item.content as { text?: string })?.text
        if (text) messages.push(text)
      } else if (item.type === 'error') {
        const err = item.content as { message: string }
        errors.push(err.message)
      }
    }

    return { fileChanges, commands, messages, errors }
  })()

  const totalArtifacts = artifacts.fileChanges.length + artifacts.commands.length
  const hasError = agent.status === 'error' || artifacts.errors.length > 0

  return (
    <div className={`border rounded-lg overflow-hidden ${hasError ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="text-xl">{getAgentTypeIcon(agent.type)}</div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                {index + 1}. {getAgentTypeDisplayName(agent.type)}
              </h4>
              {hasError && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                  失败
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{agent.task}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {artifacts.fileChanges.length > 0 && (
              <span className="flex items-center gap-1">
                <FileCode className="w-3.5 h-3.5" />
                {artifacts.fileChanges.reduce((sum, fc) => sum + fc.content.changes.length, 0)} 文件
              </span>
            )}
            {artifacts.commands.length > 0 && (
              <span className="flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" />
                {artifacts.commands.length} 命令
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
          {/* Errors */}
          {artifacts.errors.length > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-900/10">
              <h5 className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">错误</h5>
              {artifacts.errors.map((err, i) => (
                <p key={i} className="text-sm text-red-600 dark:text-red-300">{err}</p>
              ))}
            </div>
          )}

          {/* File Changes with Diff */}
          {artifacts.fileChanges.map((fc) => (
            <div key={fc.id} className="p-4">
              <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                文件变更
              </h5>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {fc.content.changes.map((change, idx) => {
                  const hunks = parseDiff(change.diff || '')
                  const fileDiff = {
                    path: change.path,
                    kind: change.kind as 'add' | 'modify' | 'delete' | 'rename',
                    oldPath: change.oldPath,
                    hunks,
                  }
                  return (
                    <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <DiffView diff={fileDiff} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Commands */}
          {artifacts.commands.length > 0 && (
            <div className="p-4">
              <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                执行命令
              </h5>
              <div className="space-y-2">
                {artifacts.commands.map((cmd) => (
                  <div key={cmd.id} className="bg-gray-900 dark:bg-black rounded-lg overflow-hidden">
                    <div className="px-3 py-2 flex items-center justify-between border-b border-gray-700">
                      <code className="text-sm text-green-400">$ {cmd.content.command}</code>
                      {cmd.content.exitCode !== undefined && (
                        <span className={`text-xs px-2 py-0.5 rounded ${cmd.content.exitCode === 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                          exit {cmd.content.exitCode}
                        </span>
                      )}
                    </div>
                    {cmd.content.output && (
                      <pre className="px-3 py-2 text-xs text-gray-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                        {cmd.content.output}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages (collapsed by default if there are file changes) */}
          {artifacts.messages.length > 0 && totalArtifacts === 0 && (
            <div className="p-4">
              <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">代理消息</h5>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {artifacts.messages.map((msg, i) => (
                  <p key={i} className="text-sm text-gray-600 dark:text-gray-400">{msg}</p>
                ))}
              </div>
            </div>
          )}

          {/* No artifacts */}
          {totalArtifacts === 0 && artifacts.messages.length === 0 && artifacts.errors.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              无可审查的工作成果
            </div>
          )}
        </div>
      )}
    </div>
  )
}
