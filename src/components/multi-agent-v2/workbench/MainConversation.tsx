import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useAgents, useWorkflow } from '@/hooks/useMultiAgent'
import { useMultiAgentStore } from '@/stores/multi-agent-v2'
import { useThreadStore } from '@/stores/thread'
import { getAgentTypeIcon, getAgentTypeDisplayName } from '@/lib/agent-utils'
import { cn } from '@/lib/utils'
import { Send, Check, X, Loader2 } from 'lucide-react'
import type { AgentDescriptor } from '@/stores/multi-agent-v2'
import type { WorkflowPhase } from '@/lib/workflows/types'

interface MainConversationProps {
  activeAgentId: string | null
  onSendTask: (task: string) => Promise<void>
}

type TimelineItem =
  | { type: 'user-task'; task: string; timestamp: number }
  | { type: 'agent-spawn'; agent: AgentDescriptor; timestamp: number }
  | { type: 'phase-approval'; phase: WorkflowPhase; timestamp: number }
  | { type: 'phase-summary'; phase: WorkflowPhase; timestamp: number }

export function MainConversation({ activeAgentId, onSendTask }: MainConversationProps) {
  const agents = useAgents()
  const workflow = useWorkflow()
  const threads = useThreadStore((s) => s.threads)
  const approvePhase = useMultiAgentStore((s) => s.approvePhase)
  const rejectPhase = useMultiAgentStore((s) => s.rejectPhase)

  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [thinkingSeconds, setThinkingSeconds] = useState(0)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const activeAgent = useMemo(
    () => agents.find((a) => a.id === activeAgentId),
    [agents, activeAgentId]
  )

  const turnTiming = activeAgent?.threadId
    ? threads[activeAgent.threadId]?.turnTiming
    : null

  useEffect(() => {
    if (turnTiming?.startedAt && !turnTiming.completedAt) {
      const interval = setInterval(() => {
        setThinkingSeconds(Math.floor((Date.now() - turnTiming.startedAt!) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setThinkingSeconds(0)
    }
  }, [turnTiming?.startedAt, turnTiming?.completedAt])

  const timeline = useMemo((): TimelineItem[] => {
    const items: TimelineItem[] = []

    if (workflow) {
      items.push({
        type: 'user-task',
        task: workflow.description,
        timestamp: workflow.createdAt.getTime(),
      })
    }

    for (const agent of agents) {
      items.push({
        type: 'agent-spawn',
        agent,
        timestamp: agent.createdAt.getTime(),
      })
    }

    if (workflow) {
      for (let i = 0; i < workflow.currentPhaseIndex; i++) {
        const phase = workflow.phases[i]
        if (phase.completedAt && phase.output) {
          items.push({
            type: 'phase-summary',
            phase,
            timestamp: phase.completedAt.getTime(),
          })
        }
      }
    }

    const pendingPhase = workflow?.phases[workflow.currentPhaseIndex]
    if (pendingPhase?.status === 'awaiting_approval') {
      items.push({
        type: 'phase-approval',
        phase: pendingPhase,
        timestamp: Date.now(),
      })
    }

    return items.sort((a, b) => a.timestamp - b.timestamp)
  }, [workflow, agents])

  const pendingApprovalPhase = useMemo(() => {
    const phase = workflow?.phases[workflow.currentPhaseIndex]
    return phase?.status === 'awaiting_approval' ? phase : null
  }, [workflow])

  const handleApprove = useCallback(async () => {
    if (pendingApprovalPhase) {
      await approvePhase(pendingApprovalPhase.id)
    }
  }, [pendingApprovalPhase, approvePhase])

  const handleReject = useCallback(async () => {
    if (pendingApprovalPhase) {
      await rejectPhase(pendingApprovalPhase.id, rejectReason || undefined)
      setRejectMode(false)
      setRejectReason('')
    }
  }, [pendingApprovalPhase, rejectPhase, rejectReason])

  useEffect(() => {
    if (!pendingApprovalPhase) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (rejectMode) {
        if (e.key === 'Escape') {
          setRejectMode(false)
          setRejectReason('')
        }
        return
      }

      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        if (document.activeElement === inputRef.current) return
        e.preventDefault()
        void handleApprove()
      } else if (e.key === 'r' || e.key === 'R') {
        if (document.activeElement === inputRef.current) return
        setRejectMode(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pendingApprovalPhase, rejectMode, handleApprove])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [timeline.length])

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return
    setIsSending(true)
    try {
      await onSendTask(inputValue.trim())
      setInputValue('')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void handleSend()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#1a1a1a]">
      {thinkingSeconds > 0 && workflow?.status === 'running' && (
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Thought for {thinkingSeconds}s</span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {timeline.map((item, idx) => {
          if (item.type === 'user-task') {
            return (
              <div key={`task-${idx}`} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-zinc-300">
                  👤
                </div>
                <div className="flex-1 rounded-lg bg-zinc-800 p-3">
                  <p className="text-sm text-zinc-300">{item.task}</p>
                </div>
              </div>
            )
          }

          if (item.type === 'agent-spawn') {
            return (
              <div
                key={`spawn-${item.agent.id}`}
                className="flex items-center gap-2 rounded-lg bg-[#2a2a2a] border border-zinc-700/50 px-3 py-2 text-sm"
              >
                <span>{getAgentTypeIcon(item.agent.type)}</span>
                <span className="text-zinc-400">Spawning</span>
                <span className="text-zinc-200 font-medium">
                  {getAgentTypeDisplayName(item.agent.type)}
                </span>
                {item.agent.status === 'running' && (
                  <span className="ml-auto flex h-2 w-2">
                    <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                )}
                {item.agent.status === 'completed' && (
                  <Check className="ml-auto h-4 w-4 text-emerald-500" />
                )}
                {item.agent.status === 'error' && (
                  <X className="ml-auto h-4 w-4 text-red-500" />
                )}
              </div>
            )
          }

          if (item.type === 'phase-summary') {
            return (
              <div
                key={`summary-${item.phase.id}`}
                className="rounded-lg bg-emerald-900/20 border border-emerald-700/30 p-3"
              >
                <div className="flex items-center gap-2 text-sm text-emerald-400 mb-2">
                  <Check className="h-4 w-4" />
                  <span className="font-medium">{item.phase.name} completed</span>
                </div>
                {item.phase.output && (
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                    {item.phase.output}
                  </p>
                )}
              </div>
            )
          }

          if (item.type === 'phase-approval') {
            return (
              <div
                key={`approval-${item.phase.id}`}
                className="rounded-lg bg-amber-900/20 border border-amber-700/30 p-4"
              >
                <div className="text-sm text-amber-400 mb-3 font-medium">
                  {item.phase.name} requires approval
                </div>
                {item.phase.output && (
                  <p className="text-sm text-zinc-300 mb-4 whitespace-pre-wrap">
                    {item.phase.output}
                  </p>
                )}

                {rejectMode ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection (optional)"
                      className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          void handleReject()
                        } else if (e.key === 'Escape') {
                          setRejectMode(false)
                          setRejectReason('')
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleReject()}
                        className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setRejectMode(false)
                          setRejectReason('')
                        }}
                        className="rounded bg-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleApprove()}
                      className="flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                      <span className="ml-1 text-xs opacity-70">(Enter)</span>
                    </button>
                    <button
                      onClick={() => setRejectMode(true)}
                      className="flex items-center gap-1.5 rounded bg-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-600"
                    >
                      <X className="h-4 w-4" />
                      Reject
                      <span className="ml-1 text-xs opacity-70">(R)</span>
                    </button>
                  </div>
                )}
              </div>
            )
          }

          return null
        })}

        {timeline.length === 0 && (
          <div className="flex h-full items-center justify-center text-zinc-500">
            Enter a task to get started
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800 p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your task..."
            rows={2}
            className="flex-1 resize-none rounded-lg bg-[#333333] border border-zinc-700 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!inputValue.trim() || isSending}
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors",
              inputValue.trim() && !isSending
                ? "bg-blue-600 text-white hover:bg-blue-500"
                : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
            )}
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Shift+Enter for new line, Enter or ⌘+Enter to send
        </p>
      </div>
    </div>
  )
}
