import { useEffect, useRef, useState } from 'react'
import { useAgents, useAgent } from '@/hooks/useMultiAgent'
import { useThreadStore } from '@/stores/thread'
import { getAgentTypeIcon, getAgentTypeDisplayName } from '@/lib/agent-utils'
import { cn } from '@/lib/utils'
import { Check, XCircle, Eye } from 'lucide-react'
import { FileChangeDiffModal } from './FileChangeDiffModal'

interface FileChange {
  path: string
  kind: string
  diff?: string
  oldPath?: string
}

interface AgentOutputPanelProps {
  activeAgentId: string | null
  onAgentSelect: (agentId: string) => void
}

export function AgentOutputPanel({ activeAgentId, onAgentSelect }: AgentOutputPanelProps) {
  const agents = useAgents()
  const activeAgent = useAgent(activeAgentId || '')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [diffModalOpen, setDiffModalOpen] = useState(false)
  const [diffModalChanges, setDiffModalChanges] = useState<FileChange[]>([])
  
  const threadState = useThreadStore((state) => 
    activeAgent?.threadId ? state.threads[activeAgent.threadId] : undefined
  )

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [threadState?.itemOrder.length, activeAgentId])

  useEffect(() => {
    if (!activeAgentId && agents.length > 0) {
      onAgentSelect(agents[0].id)
    }
  }, [activeAgentId, agents, onAgentSelect])

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-t border-zinc-800">
      <div className="flex overflow-x-auto flex-nowrap border-b border-zinc-800 bg-zinc-900 scrollbar-hide">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onAgentSelect(agent.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-r border-zinc-800/50",
              activeAgentId === agent.id 
                ? "bg-zinc-800 text-white border-b-2 border-b-blue-500" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            )}
          >
            <span>{getAgentTypeIcon(agent.type)}</span>
            <span>{getAgentTypeDisplayName(agent.type)}</span>
            
            <div className="ml-1.5 flex items-center justify-center w-3 h-3">
              {agent.status === 'running' && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
              )}
              {agent.status === 'completed' && (
                <span className="text-green-500 text-xs">✓</span>
              )}
              {agent.status === 'error' && (
                <span className="text-red-500 text-xs">✕</span>
              )}
              {agent.status === 'pending' && (
                <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeAgent ? (
          <div 
            ref={scrollRef}
            className="h-full overflow-y-auto p-4 space-y-4 scroll-smooth"
          >
            {threadState ? (
              threadState.itemOrder.map((itemId) => {
                const item = threadState.items[itemId]
                if (!item) return null

                if (item.type === 'agentMessage') {
                  const content = item.content as { text?: string } | undefined
                  const text = content?.text
                  if (!text) return null
                  return (
                    <div key={itemId} className="text-zinc-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                      {text}
                    </div>
                  )
                }
                
                if (item.type === 'commandExecution') {
                  const content = item.content as { command?: string; output?: string } | undefined
                  const command = content?.command
                  if (!command) return null
                  return (
                    <div key={itemId} className="bg-[#2a2a2a] rounded-md p-3 border border-zinc-700/50 overflow-hidden">
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2 font-mono border-b border-zinc-700/50 pb-2">
                        <span className="text-emerald-400">$</span>
                        <span>{command}</span>
                      </div>
                      {content?.output && (
                        <pre className="text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-60">
                          {content.output}
                        </pre>
                      )}
                    </div>
                  )
                }

                if (item.type === 'fileChange') {
                  const content = item.content as { 
                    changes?: Array<{ path?: string; kind?: string }>
                    needsApproval?: boolean
                    approved?: boolean
                  } | undefined
                  const changes = content?.changes
                  const needsApproval = content?.needsApproval && !content?.approved
                  if (!changes || !Array.isArray(changes)) return null
                  return (
                    <div key={itemId} className="bg-[#2a2a2a] rounded-md border border-zinc-700/50 overflow-hidden">
                      <div className="p-3 space-y-2">
                        {changes.map((change, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-zinc-400">
                            <span className="text-yellow-500">📝</span>
                            <span className="font-mono">{change?.path ?? 'unknown'}</span>
                            <span className="ml-auto opacity-50 uppercase text-[10px]">{change?.kind ?? ''}</span>
                          </div>
                        ))}
                      </div>
                      {needsApproval && (
                        <div className="px-3 py-2 border-t border-zinc-700/50 bg-zinc-800/50 flex items-center gap-2">
                          <button
                            onClick={() => {
                              void useThreadStore.getState().respondToApprovalInThread(activeAgent.threadId, itemId, 'accept')
                            }}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                          >
                            <Check className="w-3 h-3" /> 应用
                          </button>
                          <button
                            onClick={() => {
                              void useThreadStore.getState().respondToApprovalInThread(activeAgent.threadId, itemId, 'decline')
                            }}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
                          >
                            <XCircle className="w-3 h-3" /> 拒绝
                          </button>
                          <button
                            onClick={() => {
                              const fileChanges = (changes as Array<{ path?: string; kind?: string; diff?: string; oldPath?: string }>).map(c => ({
                                path: c.path ?? 'unknown',
                                kind: c.kind ?? 'modify',
                                diff: c.diff,
                                oldPath: c.oldPath,
                              }))
                              setDiffModalChanges(fileChanges)
                              setDiffModalOpen(true)
                            }}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-400 border border-zinc-600/50 rounded hover:bg-zinc-700/50 transition-colors"
                          >
                            <Eye className="w-3 h-3" /> 查看详情
                          </button>
                        </div>
                      )}
                    </div>
                  )
                }

                if (item.type === 'error') {
                  const content = item.content as { message?: string } | undefined
                  const message = content?.message ?? 'Unknown error'
                  return (
                    <div key={itemId} className="bg-red-900/20 border border-red-900/50 rounded-md p-3 text-red-400 text-sm">
                      {message}
                    </div>
                  )
                }

                return null
              })
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                Waiting for agent to start...
              </div>
            )}
            
            <div className="h-4" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500">
            Select an agent to view output
          </div>
        )}
      </div>

      {activeAgent && (
        <div className="h-1 bg-zinc-800 w-full">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ 
              width: `${(activeAgent.progress?.total ?? 0) > 0 
                ? Math.min(100, ((activeAgent.progress?.current ?? 0) / (activeAgent.progress?.total ?? 1)) * 100) 
                : 0}%` 
            }}
          />
        </div>
      )}

      <FileChangeDiffModal
        isOpen={diffModalOpen}
        onClose={() => setDiffModalOpen(false)}
        changes={diffModalChanges}
      />
    </div>
  )
}