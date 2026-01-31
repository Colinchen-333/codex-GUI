import { useId } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface RestartWorkflowDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onClose: () => void
}

export function RestartWorkflowDialog({
  isOpen,
  onConfirm,
  onClose,
}: RestartWorkflowDialogProps) {
  const titleId = useId()

  if (!isOpen) return null

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
            <h3 id={titleId} className="text-lg font-semibold text-white">工作流正在运行</h3>
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
            当前已有一个工作流正在运行。启动新工作流将会：
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 mb-4">
            <li>停止当前所有运行中的代理</li>
            <li>清除当前工作流的状态</li>
            <li>开始一个全新的工作流</li>
          </ul>
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            确定要继续吗？
          </p>
        </div>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 shadow-md hover:shadow-lg transition-all"
          >
            确认重启
          </button>
        </div>
      </div>
    </div>
  )
}
