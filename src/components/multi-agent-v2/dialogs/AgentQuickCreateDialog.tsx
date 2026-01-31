import { useId, useRef, useEffect } from 'react'
import { X, Plus, Search, FileCode, Terminal, FileText, TestTube } from 'lucide-react'
import type { AgentType } from '../../../stores/multi-agent-v2'
import { cn } from '../../../lib/utils'

interface AgentTypeOption {
  type: AgentType
  icon: React.ReactNode
  name: string
  description: string
}

const AGENT_TYPE_OPTIONS: AgentTypeOption[] = [
  { type: 'explore', icon: <Search className="w-5 h-5" />, name: '探索代理', description: '快速探索和分析代码库' },
  { type: 'plan', icon: <FileText className="w-5 h-5" />, name: '计划代理', description: '设计架构和实施方案' },
  { type: 'code-writer', icon: <FileCode className="w-5 h-5" />, name: '编码代理', description: '编写和修改代码' },
  { type: 'bash', icon: <Terminal className="w-5 h-5" />, name: '命令代理', description: '执行 Shell 命令' },
  { type: 'tester', icon: <TestTube className="w-5 h-5" />, name: '测试代理', description: '编写和运行测试' },
]

interface AgentQuickCreateDialogProps {
  isOpen: boolean
  task: string
  onTaskChange: (task: string) => void
  selectedType: AgentType
  onTypeSelect: (type: AgentType) => void
  onCreate: () => void
  onClose: () => void
}

export function AgentQuickCreateDialog({
  isOpen,
  task,
  onTaskChange,
  selectedType,
  onTypeSelect,
  onClose,
  onCreate,
}: AgentQuickCreateDialogProps) {
  const titleId = useId()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="presentation"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700 bg-gray-900 dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <Plus className="w-5 h-5 text-white" />
            <h3 id={titleId} className="text-lg font-semibold text-white">创建代理</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              选择代理类型
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AGENT_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  onClick={() => onTypeSelect(option.type)}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-xl border-2 transition-all text-left",
                    selectedType === option.type
                      ? "border-gray-900 dark:border-gray-100 bg-gray-100 dark:bg-gray-800"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    selectedType === option.type
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  )}>
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{option.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              任务描述
            </label>
            <textarea
              ref={inputRef}
              value={task}
              onChange={(e) => onTaskChange(e.target.value)}
              placeholder="描述代理需要执行的任务..."
              className="w-full h-24 px-4 py-3 border dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) {
                  onCreate()
                }
              }}
            />
            <p className="text-xs text-gray-400 mt-2">按 ⌘ + Enter 快速创建</p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={onCreate}
            disabled={!task.trim()}
            className={cn(
              "px-6 py-2 rounded-lg font-medium transition-all",
              task.trim()
                ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 shadow-md hover:shadow-lg"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
            )}
          >
            创建代理
          </button>
        </div>
      </div>
    </div>
  )
}
