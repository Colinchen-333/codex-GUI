import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAgents, useWorkflow } from '@/hooks/useMultiAgent'
import { useThreadStore } from '@/stores/thread'
import { Activity, FileDiff, Layers, PauseCircle } from 'lucide-react'

export function WorkbenchStatusBar() {
  const agents = useAgents()
  const workflow = useWorkflow()

  const agentThreadIds = useMemo(() => agents.map((a) => a.threadId), [agents])
  const threads = useThreadStore(
    useShallow((s) => {
      const result: Record<string, { itemOrder: string[]; items: Record<string, { type: string; content: unknown }> }> = {}
      for (const threadId of agentThreadIds) {
        if (s.threads[threadId]) {
          result[threadId] = {
            itemOrder: s.threads[threadId].itemOrder,
            items: s.threads[threadId].items,
          }
        }
      }
      return result
    })
  )

  const runningCount = useMemo(
    () => agents.filter((a) => a.status === 'running').length,
    [agents]
  )

  const currentPhaseName =
    workflow?.phases[workflow.currentPhaseIndex]?.name ?? 'No workflow'

  const fileChangeCount = useMemo(() => {
    let count = 0
    for (const agent of agents) {
      const thread = threads[agent.threadId]
      if (!thread) continue
      for (const itemId of thread.itemOrder) {
        const item = thread.items[itemId]
        if (item?.type === 'fileChange') {
          const content = item.content as { changes?: unknown[] }
          count += content?.changes?.length ?? 0
        }
      }
    }
    return count
  }, [agents, threads])

  return (
    <div className="flex h-8 w-full items-center justify-between border-t border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-400">
      <div className="flex items-center gap-2">
        {runningCount > 0 ? (
          <>
            <Activity className="h-4 w-4 animate-pulse text-emerald-400" />
            <span className="text-emerald-400">{runningCount} agents running</span>
          </>
        ) : (
          <>
            <PauseCircle className="h-4 w-4 text-zinc-500" />
            <span className="text-zinc-500">Paused</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-zinc-500" />
        <span>Phase: {currentPhaseName}</span>
      </div>

      <div className="flex items-center gap-2">
        <FileDiff
          className={`h-4 w-4 ${
            fileChangeCount > 0 ? 'text-amber-500' : 'text-zinc-500'
          }`}
        />
        <span
          className={fileChangeCount > 0 ? 'text-amber-500' : 'text-zinc-500'}
        >
          {fileChangeCount} files changed
        </span>
      </div>
    </div>
  )
}
