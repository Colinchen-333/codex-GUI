import { useState, useRef, useCallback, useMemo } from 'react'
import { useSwarmStore } from '../../stores/swarm'
import { useProjectsStore } from '../../stores/projects'
import { runSwarm, cancelSwarm } from '../../lib/swarmOrchestrator'
import { selectiveMergeToMain } from '../../lib/swarmHarness'
import { projectApi } from '../../lib/api'
import { Button } from '../ui/Button'
import { Send, CheckCircle2, XCircle, AlertTriangle, Info, Square, CheckSquare } from 'lucide-react'

export function SwarmInput() {
  const phase = useSwarmStore((s) => s.phase)
  const userRequest = useSwarmStore((s) => s.userRequest)
  const setUserRequest = useSwarmStore((s) => s.setUserRequest)
  const setPhase = useSwarmStore((s) => s.setPhase)
  const stagingDiff = useSwarmStore((s) => s.stagingDiff)
  const testsPass = useSwarmStore((s) => s.testsPass)
  const tasks = useSwarmStore((s) => s.tasks)
  const taskDecisions = useSwarmStore((s) => s.taskDecisions)
  const setTaskDecision = useSwarmStore((s) => s.setTaskDecision)
  const approvePlan = useSwarmStore((s) => s.approvePlan)
  const rejectPlan = useSwarmStore((s) => s.rejectPlan)
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

  // Toggle a task's accept/reject decision
  const toggleTaskDecision = useCallback(
    (taskId: string) => {
      const current = taskDecisions[taskId]
      setTaskDecision(taskId, current === 'reject' ? 'accept' : 'reject')
    },
    [taskDecisions, setTaskDecision]
  )

  // Compute accepted task IDs from the decisions map
  const acceptedTaskIds = useMemo(() => {
    return tasks
      .filter((t) => t.status === 'merged')
      .filter((t) => taskDecisions[t.id] !== 'reject')
      .map((t) => t.id)
  }, [tasks, taskDecisions])

  const allMergedAccepted = useMemo(() => {
    const mergedTasks = tasks.filter((t) => t.status === 'merged')
    return mergedTasks.length > 0 && acceptedTaskIds.length === mergedTasks.length
  }, [tasks, acceptedTaskIds])

  const handleMerge = async () => {
    const ctx = useSwarmStore.getState().context
    if (!ctx) return
    setMerging(true)
    try {
      if (allMergedAccepted) {
        // All merged tasks accepted: normal merge
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
      } else {
        // Selective merge: cherry-pick only accepted task commits
        const currentTasks = useSwarmStore.getState().tasks
        const result = await selectiveMergeToMain(
          ctx.projectPath,
          ctx.stagingBranch,
          ctx.originalBranch,
          acceptedTaskIds,
          currentTasks
        )
        if (result.success) {
          await cancelSwarm()
        } else {
          useSwarmStore.getState().setError(result.message)
        }
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

  // Awaiting approval state: show plan summary with approve/reject
  if (phase === 'awaiting_approval') {
    const taskCount = tasks.length
    return (
      <div className="border-t border-stroke/10 p-4">
        <div className="mb-3 space-y-2">
          <p className="text-[13px] font-medium text-text-1">
            Plan Review ({taskCount} task{taskCount !== 1 ? 's' : ''})
          </p>

          {/* QW-8: Task count warnings */}
          {taskCount > 5 && (
            <div className="flex items-start gap-2 rounded-md bg-status-warning-muted px-3 py-2 text-[12px] text-status-warning">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                High task count ({taskCount}). Consider breaking this into smaller goals for better results.
              </span>
            </div>
          )}
          {taskCount === 1 && (
            <div className="flex items-start gap-2 rounded-md bg-primary/10 px-3 py-2 text-[12px] text-primary">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>Single task detected. Team Lead will handle it directly (cascade mode).</span>
            </div>
          )}

          {/* Task list */}
          <ul className="space-y-1 text-[12px] text-text-2">
            {tasks.map((t, i) => (
              <li key={t.id} className="flex items-start gap-2">
                <span className="shrink-0 text-text-3">{i + 1}.</span>
                <span>{t.title}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={rejectPlan}>
            Reject
          </Button>
          <Button variant="primary" size="sm" onClick={approvePlan}>
            <CheckCircle2 size={14} />
            <span className="ml-1.5">Approve Plan</span>
          </Button>
        </div>
      </div>
    )
  }

  // Completed state: show task list with checkboxes + merge/discard
  if (phase === 'completed') {
    const mergedTasks = tasks.filter((t) => t.status === 'merged')
    const failedTasks = tasks.filter((t) => t.status === 'failed')

    return (
      <div className="border-t border-stroke/10 p-4">
        {/* Test status */}
        <div className="mb-3 flex items-center gap-2 text-[13px]">
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

        {/* Task list with checkboxes */}
        {(mergedTasks.length > 0 || failedTasks.length > 0) && (
          <div className="mb-3 space-y-1">
            <p className="text-[12px] font-medium text-text-2">Select tasks to merge:</p>
            <ul className="space-y-0.5">
              {tasks.map((task) => {
                const isMerged = task.status === 'merged'
                const isFailed = task.status === 'failed'
                const isAccepted = isMerged && taskDecisions[task.id] !== 'reject'
                const isDisabled = isFailed

                return (
                  <li key={task.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isAccepted}
                      aria-label={`${isAccepted ? 'Deselect' : 'Select'} task: ${task.title}`}
                      disabled={isDisabled}
                      onClick={() => isMerged && toggleTaskDecision(task.id)}
                      className={`shrink-0 ${isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:text-primary'}`}
                    >
                      {isAccepted ? (
                        <CheckSquare size={14} className="text-primary" />
                      ) : (
                        <Square size={14} className="text-text-3" />
                      )}
                    </button>
                    <span className={`text-[12px] ${isDisabled ? 'text-text-3 line-through' : 'text-text-2'}`}>
                      {task.title}
                    </span>
                    {isMerged && (
                      <span className="rounded bg-status-success/10 px-1.5 py-0.5 text-[10px] text-status-success">
                        merged
                      </span>
                    )}
                    {isFailed && (
                      <span className="rounded bg-status-error/10 px-1.5 py-0.5 text-[10px] text-status-error">
                        failed
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => cancelSwarm()}
          >
            Discard All
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleMerge}
            disabled={merging || acceptedTaskIds.length === 0}
          >
            {merging
              ? 'Merging...'
              : allMergedAccepted
                ? 'Merge to Main'
                : `Merge Selected (${acceptedTaskIds.length})`}
          </Button>
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
