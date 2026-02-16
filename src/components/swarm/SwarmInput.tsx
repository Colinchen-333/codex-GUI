import { useState, useRef } from 'react'
import { useSwarmStore } from '../../stores/swarm'
import { useProjectsStore } from '../../stores/projects'
import { runSwarm, cancelSwarm } from '../../lib/swarmOrchestrator'
import { projectApi } from '../../lib/api'
import { Button } from '../ui/Button'
import { Send, CheckCircle2, XCircle } from 'lucide-react'

export function SwarmInput() {
  const phase = useSwarmStore((s) => s.phase)
  const userRequest = useSwarmStore((s) => s.userRequest)
  const setUserRequest = useSwarmStore((s) => s.setUserRequest)
  const setPhase = useSwarmStore((s) => s.setPhase)
  const stagingDiff = useSwarmStore((s) => s.stagingDiff)
  const testsPass = useSwarmStore((s) => s.testsPass)
  const deactivate = useSwarmStore((s) => s.deactivate)
  const [draft, setDraft] = useState('')
  const [merging, setMerging] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    setDraft('')
    setUserRequest(trimmed)
    setPhase('exploring')

    const { selectedProjectId, projects } = useProjectsStore.getState()
    const selectedProject = selectedProjectId
      ? projects.find((p) => p.id === selectedProjectId)
      : null
    if (selectedProjectId && selectedProject?.path) {
      runSwarm(trimmed, selectedProject.path, selectedProjectId).catch((err) => {
        useSwarmStore.getState().setError(err instanceof Error ? err.message : String(err))
        useSwarmStore.getState().setPhase('failed')
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleMerge = async () => {
    const ctx = useSwarmStore.getState().context
    if (!ctx) return
    setMerging(true)
    try {
      await projectApi.gitCheckoutBranch(ctx.projectPath, ctx.originalBranch)
      const result = await projectApi.gitMergeNoFf(
        ctx.projectPath,
        ctx.stagingBranch,
        'Merge Self-Driving changes'
      )
      if (result.success) {
        await cancelSwarm()
      } else {
        useSwarmStore.getState().setError(
          `Merge conflict: ${result.conflictFiles.join(', ')}`
        )
      }
    } catch (err) {
      useSwarmStore.getState().setError(
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setMerging(false)
    }
  }

  // Idle state: show input
  if (phase === 'idle') {
    return (
      <div className="border-t border-stroke/10 p-4">
        <div className="mb-3 rounded-lg bg-surface-solid/50 px-3 py-2.5">
          <p className="text-[13px] font-medium text-text-1">Self-Driving Mode</p>
          <p className="mt-1 text-[12px] leading-relaxed text-text-3">
            Describe your goal and the system will analyze your codebase, decompose it into tasks,
            and coordinate parallel workers to implement them — all with git isolation.
          </p>
        </div>
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            aria-label="Self-Driving request"
            className="flex-1 resize-none rounded-lg border border-stroke/20 bg-surface px-3 py-2 text-[14px] text-text-1 placeholder:text-text-3 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={2}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!draft.trim()}
            className="self-end"
          >
            <Send size={14} />
            <span className="ml-1.5">Start</span>
          </Button>
        </div>
        <div className="mt-1.5 text-[11px] text-text-3">
          <kbd className="rounded border border-stroke/20 px-1 py-0.5 text-[10px]">⏎</kbd>
          <span className="ml-1">to start</span>
          <span className="mx-2 text-stroke">·</span>
          <kbd className="rounded border border-stroke/20 px-1 py-0.5 text-[10px]">⇧⏎</kbd>
          <span className="ml-1">new line</span>
        </div>
      </div>
    )
  }

  // Completed state: show approval buttons
  if (phase === 'completed') {
    return (
      <div className="border-t border-stroke/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px]">
            {testsPass === true && (
              <span className="flex items-center gap-1 text-status-success">
                <CheckCircle2 size={14} /> Tests passed
              </span>
            )}
            {testsPass === false && (
              <span className="flex items-center gap-1 text-status-error">
                <XCircle size={14} /> Tests failed
              </span>
            )}
            {stagingDiff && <span className="text-text-3">· Changes ready to merge</span>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cancelSwarm()}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleMerge}
              disabled={merging}
            >
              {merging ? 'Merging...' : 'Merge to Main'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Working state: show progress indicator
  return (
    <div className="border-t border-stroke/10 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] text-text-2">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          <span>Self-Driving in progress...</span>
        </div>
        {userRequest && (
          <span className="max-w-[50%] truncate text-[12px] text-text-3" title={userRequest}>
            {userRequest}
          </span>
        )}
      </div>
    </div>
  )
}
