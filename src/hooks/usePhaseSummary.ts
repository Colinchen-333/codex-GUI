import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useThreadStore } from '../stores/thread'
import type { WorkflowPhase } from '../stores/multi-agent-v2'

export interface PhaseSummary {
  fileChanges: number
  commands: number
  errors: number
  completedAgents: number
  failedAgents: number
  totalAgents: number
}

interface AgentInfo {
  id: string
  threadId: string
  status: string
}

function computeThreadSummary(
  threadId: string,
  threads: Record<string, { items: Record<string, { type: string; content?: unknown }>; itemOrder: string[] }>
): { fileChanges: number; commands: number; errors: number } {
  const thread = threads[threadId]
  if (!thread) return { fileChanges: 0, commands: 0, errors: 0 }

  let fileChanges = 0
  let commands = 0
  let errors = 0

  for (const itemId of thread.itemOrder) {
    const item = thread.items[itemId]
    if (!item) continue

    if (item.type === 'fileChange') {
      const content = item.content as { changes?: unknown[] } | undefined
      fileChanges += content?.changes?.length || 1
    } else if (item.type === 'commandExecution') {
      commands++
    } else if (item.type === 'error') {
      errors++
    }
  }

  return { fileChanges, commands, errors }
}

export function usePhaseSummary(
  pendingPhase: WorkflowPhase | null,
  agents: AgentInfo[]
): PhaseSummary | null {
  const threads = useThreadStore(useShallow((state) => state.threads))

  const phaseId = pendingPhase?.id ?? null
  const phaseAgentIds = useMemo(
    () => pendingPhase?.agentIds ?? [],
    [pendingPhase?.agentIds]
  )

  return useMemo(() => {
    if (!phaseId || !phaseAgentIds.length) {
      return null
    }

    const phaseAgents = phaseAgentIds
      .map((id) => agents.find((a) => a.id === id))
      .filter((a): a is AgentInfo => !!a)

    let fileChanges = 0
    let commands = 0
    let errors = 0

    for (const agent of phaseAgents) {
      if (!agent.threadId) continue
      const summary = computeThreadSummary(agent.threadId, threads)
      fileChanges += summary.fileChanges
      commands += summary.commands
      errors += summary.errors
    }

    const completedAgents = phaseAgents.filter((a) => a.status === 'completed').length
    const failedAgents = phaseAgents.filter((a) => a.status === 'error').length

    return {
      fileChanges,
      commands,
      errors,
      completedAgents,
      failedAgents,
      totalAgents: phaseAgentIds.length,
    }
  }, [phaseId, phaseAgentIds, agents, threads])
}
