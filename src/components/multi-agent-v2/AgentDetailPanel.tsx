/**
 * AgentDetailPanel - Right-side panel showing full agent output
 *
 * Features:
 * - Full message history from agent thread
 * - Multiple message types (agent, user, command, error, tool)
 * - Auto-scroll to bottom on new messages
 * - Dark mode support
 * - Closeable/minimizable
 */

import { useRef, useEffect, useState, useMemo, memo, useCallback } from 'react'
import { X, Minimize2, Terminal, AlertCircle, Wrench, User, Bot, ChevronDown, FileCode, Check, XCircle, ArrowDown, Play, RotateCcw } from 'lucide-react'
import { useMultiAgentStore, type AgentDescriptor } from '../../stores/multi-agent-v2'
import { useThreadStore } from '../../stores/thread'
import { DiffView, parseDiff } from '../ui/DiffView'
import type { FileChangeContentType } from '../chat/types'
import {
  getAgentTypeDisplayName,
  getAgentTypeIcon,
  formatAgentStatus,
  getStatusColor,
  getStatusBgColor,
} from '../../lib/agent-utils'
import { cn } from '../../lib/utils'

interface AgentDetailPanelProps {
  agent: AgentDescriptor
  onClose: () => void
  onMinimize?: () => void
}

export const AgentDetailPanel = memo(function AgentDetailPanel({ agent, onClose, onMinimize }: AgentDetailPanelProps) {
  // Get thread state for this agent
  const threadState = useThreadStore((state) => state.threads[agent.threadId])
  const retryAgent = useMultiAgentStore((state) => state.retryAgent)
  const resumeAgent = useMultiAgentStore((state) => state.resumeAgent)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollBottomRef = useRef<HTMLDivElement>(null)

  const [isScrollLocked, setIsScrollLocked] = useState(false)
  const [hasNewMessages, setHasNewMessages] = useState(false)

  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollHeight, scrollTop, clientHeight } = container
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50

    if (isAtBottom) {
      setIsScrollLocked(false)
      setHasNewMessages(false)
    } else {
      setIsScrollLocked(true)
    }
  }

  useEffect(() => {
    if (threadState?.itemOrder.length) {
      if (isScrollLocked) {
        queueMicrotask(() => setHasNewMessages(true))
      } else if (scrollBottomRef.current) {
        scrollBottomRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [threadState?.itemOrder.length, isScrollLocked])

  const stats = useMemo(() => {
    if (!threadState?.itemOrder.length) return null
    let files = 0, commands = 0, errors = 0, pendingApprovals = 0
    let firstFileId: string | null = null
    let firstCommandId: string | null = null
    let firstErrorId: string | null = null
    let firstPendingApprovalId: string | null = null

    for (const id of threadState.itemOrder) {
      const item = threadState.items[id]
      if (!item) continue
      if (item.type === 'fileChange') {
        files++
        if (!firstFileId) firstFileId = id
        const content = item.content as { needsApproval?: boolean; approved?: boolean }
        if (content.needsApproval && !content.approved) {
          pendingApprovals++
          if (!firstPendingApprovalId) firstPendingApprovalId = id
        }
      } else if (item.type === 'commandExecution') {
        commands++
        if (!firstCommandId) firstCommandId = id
        const content = item.content as { needsApproval?: boolean; approved?: boolean }
        if (content.needsApproval && !content.approved) {
          pendingApprovals++
          if (!firstPendingApprovalId) firstPendingApprovalId = id
        }
      } else if (item.type === 'error') {
        errors++
        if (!firstErrorId) firstErrorId = id
      }
    }
    return { files, commands, errors, pendingApprovals, firstFileId, firstCommandId, firstErrorId, firstPendingApprovalId }
  }, [threadState])

  const scrollToId = useCallback((id: string | null) => {
    if (!id) return
    const element = document.getElementById(`msg-${id}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  useEffect(() => {
    if (stats?.firstPendingApprovalId) {
      setTimeout(() => scrollToId(stats.firstPendingApprovalId), 100)
    }
  }, [agent.id, stats?.firstPendingApprovalId, scrollToId])

  // Render message based on type
  const renderMessage = (itemId: string) => {
    const item = threadState?.items[itemId]
    if (!item) return null

    switch (item.type) {
      case 'agentMessage': {
        const content = item.content as { text: string }
        return (
          <div key={itemId} id={`msg-${itemId}`} className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono overflow-x-auto">
                  {content.text}
                </pre>
              </div>
            </div>
          </div>
        )
      }

      case 'userMessage': {
        const content = item.content as { text: string }
        return (
          <div key={itemId} id={`msg-${itemId}`} className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="bg-muted rounded-lg p-3 border border-border">
                <p className="text-sm text-foreground">{content.text}</p>
              </div>
            </div>
          </div>
        )
      }

      case 'commandExecution': {
        const content = item.content as { command: string; output?: string; exitCode?: number }
        const hasError = content.exitCode !== undefined && content.exitCode !== 0
        return (
          <div key={itemId} id={`msg-${itemId}`} className="flex items-start space-x-3">
            <div className={cn(
              "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
              hasError ? "bg-red-100 dark:bg-red-900/40" : "bg-gray-800 dark:bg-gray-900"
            )}>
              <Terminal className={cn(
                "w-4 h-4",
                hasError ? "text-red-600 dark:text-red-400" : "text-gray-300"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-3 overflow-hidden">
                <div className="flex items-center space-x-2 text-xs text-gray-400 mb-2">
                  <span className="text-green-400">$</span>
                  <span className="font-mono">{content.command}</span>
                  {content.exitCode !== undefined && (
                    <span className={cn(
                      "ml-auto px-1.5 py-0.5 rounded text-xs",
                      hasError ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"
                    )}>
                      exit {content.exitCode}
                    </span>
                  )}
                </div>
                {content.output && (
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto max-h-64 overflow-y-auto">
                    {content.output}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )
      }

      case 'fileChange': {
        const content = item.content as FileChangeContentType
        const addCount = content.changes.filter(c => c.kind === 'add').length
        const modifyCount = content.changes.filter(c => c.kind === 'modify').length
        const deleteCount = content.changes.filter(c => c.kind === 'delete').length
        const needsApproval = content.needsApproval && !content.approved
        const isApplied = content.applied

        return (
          <div key={itemId} id={`msg-${itemId}`} className="flex items-start space-x-3">
            <div className={cn(
              "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
              isApplied ? "bg-green-100 dark:bg-green-900/40" : needsApproval ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"
            )}>
              <FileCode className={cn(
                "w-4 h-4",
                isApplied ? "text-green-600 dark:text-green-400" : needsApproval ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn(
                "rounded-lg border overflow-hidden",
                isApplied ? "border-green-200 dark:border-green-700" : needsApproval ? "border-amber-200 dark:border-amber-700" : "border-gray-200 dark:border-gray-700"
              )}>
                <div className={cn(
                  "px-3 py-2 flex items-center justify-between",
                  isApplied ? "bg-green-50 dark:bg-green-900/20" : needsApproval ? "bg-amber-50 dark:bg-amber-900/20" : "bg-muted/50"
                )}>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    {addCount > 0 && <span className="text-green-600">+{addCount}</span>}
                    {modifyCount > 0 && <span className="text-yellow-600">~{modifyCount}</span>}
                    {deleteCount > 0 && <span className="text-red-600">-{deleteCount}</span>}
                    <span className="text-muted-foreground">{content.changes.length} file(s)</span>
                  </div>
                  {isApplied && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Check className="w-3 h-3" /> 已应用
                    </span>
                  )}
                  {needsApproval && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 animate-pulse">待审批</span>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {content.changes.map((change, idx) => {
                    const hunks = parseDiff(change.diff)
                    const fileDiff = {
                      path: change.path,
                      kind: change.kind as 'add' | 'modify' | 'delete' | 'rename',
                      oldPath: change.oldPath,
                      hunks,
                    }
                    return (
                      <div key={idx} className="border-t border-border/50 first:border-t-0">
                        <DiffView diff={fileDiff} />
                      </div>
                    )
                  })}
                </div>

                {needsApproval && (
                  <div className="px-3 py-2 border-t border-border bg-muted/50 flex items-center gap-2">
                    <button
                      onClick={() => {
                        void useThreadStore.getState().respondToApprovalInThread(agent.threadId, itemId, 'accept')
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                    >
                      <Check className="w-3 h-3" /> 应用
                    </button>
                    <button
                      onClick={() => {
                        void useThreadStore.getState().respondToApprovalInThread(agent.threadId, itemId, 'decline')
                      }}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-destructive border border-destructive/30 rounded hover:bg-destructive/10 transition-colors"
                    >
                      <XCircle className="w-3 h-3" /> 拒绝
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      case 'mcpTool': {
        const content = item.content as {
          callId: string
          server: string
          tool: string
          arguments: unknown
          result?: unknown
          error?: string
          isRunning: boolean
          progress?: string[]
        }
        const hasError = !!content.error
        const isRunning = content.isRunning

        return (
          <div key={itemId} id={`msg-${itemId}`} className="flex items-start space-x-3">
            <div className={cn(
              "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
              hasError
                ? "bg-destructive/10"
                : isRunning
                  ? "bg-purple-100 dark:bg-purple-900/40"
                  : "bg-green-100 dark:bg-green-900/40"
            )}>
              <Wrench className={cn(
                "w-4 h-4",
                hasError
                  ? "text-destructive"
                  : isRunning
                    ? "text-purple-600 dark:text-purple-400 animate-spin"
                    : "text-green-600 dark:text-green-400"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn(
                "rounded-lg p-3 border",
                hasError
                  ? "bg-destructive/5 border-destructive/30"
                  : isRunning
                    ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700"
                    : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
              )}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className={cn(
                    "text-xs font-semibold",
                    hasError
                      ? "text-destructive"
                      : isRunning
                        ? "text-purple-700 dark:text-purple-300"
                        : "text-green-700 dark:text-green-300"
                  )}>
                    {hasError ? '工具错误' : isRunning ? '工具执行中' : '工具完成'}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{content.tool}</span>
                </div>
                {content.arguments != null && typeof content.arguments === 'object' && Object.keys(content.arguments as object).length > 0 ? (
                  <pre className="text-xs text-muted-foreground font-mono overflow-x-auto mb-2">
                    {JSON.stringify(content.arguments, null, 2)}
                  </pre>
                ) : null}
                {hasError && (
                  <pre className="text-xs text-destructive font-mono overflow-x-auto whitespace-pre-wrap">
                    {content.error}
                  </pre>
                )}
                {!hasError && content.result !== undefined && (
                  <pre className="text-xs text-muted-foreground font-mono overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {typeof content.result === 'string' ? content.result : JSON.stringify(content.result, null, 2)}
                  </pre>
                )}
                {isRunning && content.progress && content.progress.length > 0 && (
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    {content.progress[content.progress.length - 1]}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      case 'error': {
        const content = item.content as { message: string; code?: string }
        return (
          <div key={itemId} id={`msg-${itemId}`} className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-700">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300">错误</span>
                  {content.code && (
                    <span className="text-xs text-red-500 font-mono">[{content.code}]</span>
                  )}
                </div>
                <p className="text-sm text-red-600 dark:text-red-400">{content.message}</p>
              </div>
            </div>
          </div>
        )
      }

      default:
        // Fallback for unknown message types
        return (
          <div key={itemId} id={`msg-${itemId}`} className="flex items-start space-x-3 opacity-60">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <span className="text-xs text-muted-foreground">{item.type}</span>
                <pre className="text-xs text-muted-foreground font-mono mt-1 overflow-x-auto">
                  {JSON.stringify(item.content, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="text-xl">{getAgentTypeIcon(agent.type)}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {getAgentTypeDisplayName(agent.type)} 代理
            </h3>
            <div className="flex items-center space-x-2 mt-0.5">
              <span
                className={cn(
                  'px-1.5 py-0.5 text-xs font-medium rounded',
                  getStatusBgColor(agent.status),
                  getStatusColor(agent.status)
                )}
              >
                {formatAgentStatus(agent.status)}
              </span>
              <span className="text-xs text-muted-foreground/50">•</span>
              <span className="text-xs text-muted-foreground truncate font-mono">
                {agent.id.slice(0, 12)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1 ml-2">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              title="最小化"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

        {/* Task Description */}
        <div className="px-4 py-3 border-b border-border bg-card">
          {(agent.status === 'pending' && agent.interruptReason === 'pause') && (
            <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Play className="w-3.5 h-3.5" /> 代理已暂停
              </span>
              <button
                onClick={() => resumeAgent(agent.id)}
                className="px-2 py-1 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded transition-colors"
              >
                继续
              </button>
            </div>
          )}
          {(agent.status === 'error' && agent.error?.recoverable) && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
              <span className="text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" /> 代理执行出错
              </span>
              <button
                onClick={() => retryAgent(agent.id)}
                className="px-2 py-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> 重试
              </button>
            </div>
          )}
          
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            任务
          </h4>
          <p className="text-sm text-foreground/80">{agent.task}</p>
        </div>

        {/* Summary Strip - What changed / What needs attention */}
        {stats && (stats.files > 0 || stats.commands > 0 || stats.pendingApprovals > 0 || stats.errors > 0) && (
          <div className="px-4 py-2 border-b border-border bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                {stats.files > 0 && (
                  <button
                    onClick={() => scrollToId(stats.firstFileId)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span className="font-medium">{stats.files} 文件变更</span>
                  </button>
                )}
                {stats.commands > 0 && (
                  <button
                    onClick={() => scrollToId(stats.firstCommandId)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span className="font-medium">{stats.commands} 命令</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {stats.pendingApprovals > 0 && (
                  <button
                    onClick={() => scrollToId(stats.firstPendingApprovalId)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-md hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors animate-pulse"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span className="font-bold">{stats.pendingApprovals} 待审批</span>
                  </button>
                )}
                {stats.errors > 0 && (
                  <button
                    onClick={() => scrollToId(stats.firstErrorId)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="font-medium">{stats.errors} 错误</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Message History */}
      <div className="relative flex-1 min-h-0 bg-gray-50/50 dark:bg-gray-900/50">
        {stats && (stats.files > 0 || stats.commands > 0 || stats.errors > 0) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="flex items-center space-x-1 p-1 bg-card/90 backdrop-blur shadow-sm border border-border rounded-full pointer-events-auto">
              {stats.files > 0 && (
                <button
                  onClick={() => scrollToId(stats.firstFileId)}
                  className="flex items-center space-x-1 px-2 py-1 hover:bg-muted rounded-full transition-colors text-xs font-medium text-muted-foreground"
                  title="跳转到第一个文件变更"
                >
                  <FileCode className="w-3 h-3" />
                  <span>{stats.files}</span>
                </button>
              )}
              {stats.commands > 0 && (
                <button
                  onClick={() => scrollToId(stats.firstCommandId)}
                  className="flex items-center space-x-1 px-2 py-1 hover:bg-muted rounded-full transition-colors text-xs font-medium text-muted-foreground"
                  title="跳转到第一个命令"
                >
                  <Terminal className="w-3 h-3" />
                  <span>{stats.commands}</span>
                </button>
              )}
              {stats.errors > 0 && (
                <button
                  onClick={() => scrollToId(stats.firstErrorId)}
                  className="flex items-center space-x-1 px-2 py-1 hover:bg-destructive/10 rounded-full transition-colors text-xs font-medium text-destructive"
                  title="跳转到第一个错误"
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>{stats.errors}</span>
                </button>
              )}
            </div>
          </div>
        )}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-auto p-4 space-y-4"
        >
          {threadState ? (
            <>
              {threadState.itemOrder.length > 0 ? (
                <>
                  {threadState.itemOrder.map(renderMessage)}
                  <div ref={scrollBottomRef} />
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">等待代理输出...</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">线程未加载</p>
                <p className="text-xs mt-1 font-mono">ID: {agent.threadId.slice(0, 16)}</p>
              </div>
            </div>
          )}
        </div>

        {hasNewMessages && isScrollLocked && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={() => {
                setIsScrollLocked(false)
                setHasNewMessages(false)
                scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full shadow-lg transition-all animate-bounce"
            >
              <span>新消息</span>
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Footer - Agent Metadata */}
      <div className="px-4 py-2 border-t border-border bg-muted/50 text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>创建时间:</span>
          <span className="font-mono">{agent.createdAt.toLocaleString('zh-CN')}</span>
        </div>
        {agent.startedAt && (
          <div className="flex justify-between">
            <span>开始时间:</span>
            <span className="font-mono">{agent.startedAt.toLocaleString('zh-CN')}</span>
          </div>
        )}
        {agent.completedAt && (
          <div className="flex justify-between">
            <span>完成时间:</span>
            <span className="font-mono">{agent.completedAt.toLocaleString('zh-CN')}</span>
          </div>
        )}
        {agent.dependencies.length > 0 && (
          <div className="flex justify-between">
            <span>依赖代理:</span>
            <span className="font-mono">{agent.dependencies.map((id) => id.slice(0, 8)).join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  )
})
