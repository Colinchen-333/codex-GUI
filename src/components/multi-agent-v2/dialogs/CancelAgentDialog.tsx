import { useId } from 'react'
import { X, AlertTriangle, Loader2 } from 'lucide-react'
import type { AgentDescriptor, AgentType } from '../../../stores/multi-agent-v2'

const AGENT_TYPE_NAMES: Partial<Record<AgentType, string>> = {
  explore: '探索代理',
  plan: '计划代理',
  'code-writer': '编码代理',
  bash: '命令代理',
  tester: '测试代理',
  reviewer: '审查代理',
  documenter: '文档代理',
}

interface CancelAgentDialogProps {
  isOpen: boolean
  agent: AgentDescriptor | null
  isOperating: boolean
  onConfirm: () => void
  onClose: () => void
}

export function CancelAgentDialog({
  isOpen,
  agent,
  isOperating,
  onConfirm,
  onClose,
}: CancelAgentDialogProps) {
  const titleId = useId()

  if (!isOpen || !agent) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="presentation"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700 bg-gray-900 dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-white" />
            <h3 id={titleId} className="text-lg font-semibold text-white">确认取消代理</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            确定要取消此代理吗？取消后：
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 mb-4">
            <li>当前正在执行的任务将被中断</li>
            <li>已完成的工作将被保留</li>
            <li>此操作无法撤销</li>
          </ul>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              代理：{AGENT_TYPE_NAMES[agent.type] ?? agent.type}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {agent.task}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            disabled={isOperating}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            返回
          </button>
          <button
            onClick={onConfirm}
            disabled={isOperating}
            className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center space-x-2"
          >
            {isOperating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>取消中...</span>
              </>
            ) : (
              <span>确认取消</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
