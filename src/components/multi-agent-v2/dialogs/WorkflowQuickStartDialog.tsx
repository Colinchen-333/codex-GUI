import { useId, useRef, useEffect } from 'react'
import { X, Play, ChevronDown, ChevronUp, Sparkles, Box, User } from 'lucide-react'
import type { WorkflowTemplate } from '../../../lib/workflows/types'
import { cn } from '../../../lib/utils'

interface WorkflowQuickStartDialogProps {
  isOpen: boolean
  task: string
  onTaskChange: (task: string) => void
  templates: WorkflowTemplate[]
  selectedTemplateId: string
  onTemplateSelect: (id: string) => void
  showAdvancedOptions: boolean
  onToggleAdvancedOptions: () => void
  showStructuredIntent: boolean
  onToggleStructuredIntent: () => void
  intentConstraints: string
  onIntentConstraintsChange: (value: string) => void
  intentScope: string
  onIntentScopeChange: (value: string) => void
  onStart: () => void
  onClose: () => void
}

export function WorkflowQuickStartDialog({
  isOpen,
  task,
  onTaskChange,
  templates,
  selectedTemplateId,
  onTemplateSelect,
  showAdvancedOptions,
  onToggleAdvancedOptions,
  showStructuredIntent,
  onToggleStructuredIntent,
  intentConstraints,
  onIntentConstraintsChange,
  intentScope,
  onIntentScopeChange,
  onStart,
  onClose,
}: WorkflowQuickStartDialogProps) {
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700 bg-gray-900 dark:bg-gray-800 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-5 h-5 text-white" />
            <h3 id={titleId} className="text-lg font-semibold text-white">开始任务</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              描述您的需求
            </label>
            <textarea
              ref={inputRef}
              value={task}
              onChange={(e) => onTaskChange(e.target.value)}
              placeholder="例如：为用户设置页面添加头像上传功能..."
              className="w-full h-28 px-4 py-3 border dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) {
                  onStart()
                }
              }}
            />
            
            <button
              type="button"
              onClick={onToggleStructuredIntent}
              className="mt-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showStructuredIntent ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              结构化意图 (可选)
            </button>

            {showStructuredIntent && (
              <div className="mt-3 space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    约束条件 (不要做什么)
                  </label>
                  <input
                    type="text"
                    value={intentConstraints}
                    onChange={(e) => onIntentConstraintsChange(e.target.value)}
                    placeholder="例如：不修改现有API、保持向后兼容..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    范围限制 (影响哪些模块)
                  </label>
                  <input
                    type="text"
                    value={intentScope}
                    onChange={(e) => onIntentScopeChange(e.target.value)}
                    placeholder="例如：仅 src/components/、排除测试文件..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 结构化意图帮助 AI 更准确理解您的需求边界
                </p>
              </div>
            )}
          </div>

          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-700 dark:text-green-300">
              <span className="font-medium">安全承诺：</span>所有代码变更都需要您的审批，您可以随时查看 Diff 并决定是否应用。
            </p>
          </div>

          <button
            onClick={onToggleAdvancedOptions}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {showAdvancedOptions ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            高级选项
          </button>

          {showAdvancedOptions && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                选择工作流模板
              </label>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => onTemplateSelect(template.id)}
                    className={cn(
                      "flex flex-col text-left p-2.5 rounded-lg border transition-all",
                      selectedTemplateId === template.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-0.5">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {template.name}
                      </span>
                      {template.source === 'builtin' ? (
                        <Box className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                      {template.phases.length} 阶段 · {template.description.split('：')[0]}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
          <p className="text-xs text-gray-400">⌘ + Enter 快速启动</p>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={onStart}
              disabled={!task.trim()}
              className={cn(
                "px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2",
                task.trim()
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
              )}
            >
              <Play className="w-4 h-4" />
              开始执行
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
