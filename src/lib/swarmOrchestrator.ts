/**
 * Swarm Orchestrator
 *
 * Main orchestration module for Self-Driving (Swarm) mode.
 * Ties together the swarm store, harness functions, prompt templates,
 * and thread API to implement the full self-driving workflow.
 *
 * Flow:
 * 1. EXPLORE: Start Team Lead thread, analyze codebase, decompose into tasks
 * 2. PLAN: Parse task list from Team Lead response, populate store
 * 3. CASCADE CHECK: If 1 task -> Team Lead handles it alone (no workers)
 * 4. SPAWN: Create worktrees + worker threads
 * 5. WORK: Assign tasks, wait for completion, merge each worker's branch
 * 6. TEST: Run test commands (before review)
 * 7. REVIEW: Generate combined diff of staging vs original branch
 * 8. COMPLETE: Wait for user approval
 * 9. CLEANUP: Remove worktrees on cancel/error
 */

import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useSwarmStore } from '../stores/swarm'
import type { SwarmTask } from '../stores/swarm'
import { setupSwarm, mergeToStaging, cleanupSwarm, withTimeout } from './swarmHarness'
import type { SwarmSetupContext } from './swarmHarness'
import {
  buildTeamLeadExplorationPrompt,
  buildTeamLeadReviewPrompt,
  buildWorkerPrompt,
  buildCascadePrompt,
} from './swarmPrompts'
import { threadApi, projectApi, terminalApi } from './api'
import type { TurnCompletedEvent, ItemCompletedEvent } from './events'
import { log } from './logger'

// ==================== Constants ====================

/** Maximum time to wait for a single worker turn to complete */
const WORKER_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

/** Maximum time to wait for the Team Lead exploration turn */
const EXPLORATION_TIMEOUT_MS = 8 * 60 * 1000 // 8 minutes (exploration can be lengthy)

/** Maximum number of parallel workers */
const MAX_WORKERS = 3

// ==================== Helpers ====================

/**
 * Parse the Team Lead's exploration response to extract the task list.
 * Expects a JSON code block containing an array of task objects.
 *
 * @throws Error if the response does not contain a valid JSON task list
 */
function parseTaskList(response: string): Array<{
  title: string
  description: string
  testCommand: string
  dependsOn: string[]
}> {
  // Look for ```json ... ``` block in the response (case-insensitive, allow jsonc)
  const jsonMatch = response.match(/```json[c]?\s*\n([\s\S]*?)\n?\s*```/i)

  let parsed: unknown

  if (jsonMatch) {
    parsed = JSON.parse(jsonMatch[1])
  } else {
    // Fallback: try to find a raw JSON array in the response
    const arrayMatch = response.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      try {
        parsed = JSON.parse(arrayMatch[0])
      } catch {
        // Fall through to the error below
      }
    }
  }

  if (!parsed) {
    throw new Error('Team Lead response did not contain a JSON task list')
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Task list is empty or not an array')
  }

  return parsed.map((t: Record<string, unknown>) => ({
    title: String(t.title || ''),
    description: String(t.description || ''),
    testCommand: String(t.testCommand || 'echo "no test"'),
    dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn.map(String) : [],
  }))
}

/**
 * Wait for a thread's current turn to complete by listening to Tauri events.
 *
 * IMPORTANT: This function awaits both listen() calls synchronously before
 * returning the promise. Callers should call this BEFORE triggering the work
 * (e.g. sendMessage) to avoid missing events due to race conditions.
 *
 * Resolves with the concatenated agent response when the turn finishes.
 * Does NOT have an internal timeout -- callers should use withTimeout() for that.
 */
async function waitForTurnComplete(threadId: string): Promise<string> {
  const collectedText: string[] = []
  const unlisteners: UnlistenFn[] = []

  // Create a deferred promise whose resolve/reject are captured by the listeners
  let resolvePromise: (value: string) => void
  let rejectPromise: (reason: Error) => void
  const resultPromise = new Promise<string>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  const cleanup = () => {
    for (const unlisten of unlisteners) {
      unlisten()
    }
  }

  // Await both listen() calls synchronously BEFORE returning the promise.
  // This guarantees listeners are registered before any events can fire.

  // Listen for item completions to collect agent message text
  const unlistenItem = await listen<ItemCompletedEvent>('item-completed', (event) => {
    const payload = event.payload
    if (payload.threadId !== threadId) return
    if (payload.item.type !== 'agentMessage') return

    const content = payload.item.content as
      | { text?: string; isStreaming?: boolean }
      | undefined
    if (content?.text) {
      collectedText.push(content.text)
    }
  })
  unlisteners.push(unlistenItem)

  // Listen for turn completion
  const unlistenTurn = await listen<TurnCompletedEvent>('turn-completed', (event) => {
    const payload = event.payload
    if (payload.threadId !== threadId) return

    cleanup()

    const status = payload.turn.status
    if (status === 'failed') {
      const errorMsg = payload.turn.error?.message || 'Turn failed'
      rejectPromise(new Error(errorMsg))
      return
    }

    resolvePromise(collectedText.join('\n'))
  })
  unlisteners.push(unlistenTurn)

  // Both listeners are now registered. Return the promise that will be
  // resolved/rejected by the turn-completed listener callback.
  return resultPromise
}

/**
 * Check if a value is a timeout sentinel from withTimeout().
 */
function isTimeoutResult(value: unknown): value is { timeout: true } {
  return value !== null && typeof value === 'object' && 'timeout' in value
}

/**
 * Interrupt all active worker threads. Best-effort; errors are logged but ignored.
 */
async function interruptAllWorkers(): Promise<void> {
  const workers = useSwarmStore.getState().workers
  for (const w of workers) {
    try {
      await threadApi.interrupt(w.threadId)
    } catch {
      // Interrupting a thread that is already idle/done is harmless
    }
  }
}

/**
 * Wait for the user to approve or reject the plan.
 * Subscribes to the swarm store and resolves when approvalState changes
 * from 'pending' to 'approved' or 'rejected'.
 */
function waitForPlanApproval(): Promise<'approved' | 'rejected'> {
  return new Promise((resolve) => {
    const current = useSwarmStore.getState().approvalState
    if (current === 'approved' || current === 'rejected') {
      resolve(current)
      return
    }
    const unsub = useSwarmStore.subscribe((state) => {
      if (state.approvalState === 'approved' || state.approvalState === 'rejected') {
        unsub()
        resolve(state.approvalState)
      }
    })
  })
}

// ==================== Main Orchestrator ====================

/**
 * Run the full swarm orchestration flow.
 *
 * This is the main entry point. It progresses through phases sequentially,
 * updating the swarm store at each step so the UI can render progress.
 *
 * Workers execute tasks in parallel using a shared work queue.
 * Each worker pulls tasks concurrently, with dependency-aware re-queuing.
 */
export async function runSwarm(
  userRequest: string,
  projectPath: string,
  projectId: string
): Promise<void> {
  const store = useSwarmStore.getState()

  // Track setup context for cleanup on error
  let swarmContext: SwarmSetupContext | null = null

  try {
    // ---- Phase 1: EXPLORE ----
    store.setPhase('exploring')
    store.setUserRequest(userRequest)
    store.addMessage({ from: 'System', content: 'Starting exploration...', type: 'status' })
    log.info('[Swarm] Starting exploration phase', 'SwarmOrchestrator')

    // Start Team Lead thread in suggest mode (requires approval for actions)
    const teamLeadResponse = await threadApi.start(
      projectId,
      projectPath,
      undefined, // default model
      undefined, // default sandbox
      'suggest'  // approval policy
    )
    const teamLeadThreadId = teamLeadResponse.thread.id
    store.setTeamLeadThread(teamLeadThreadId)

    // Set up listener BEFORE sending the message to avoid race condition
    const explorationPrompt = buildTeamLeadExplorationPrompt(userRequest, projectPath)
    const explorationTurnPromise = waitForTurnComplete(teamLeadThreadId)

    // Now trigger the work
    await threadApi.sendMessage(teamLeadThreadId, explorationPrompt)

    store.addMessage({
      from: 'Team Lead',
      content: 'Exploring codebase and planning tasks...',
      type: 'discovery',
    })

    // Wait for Team Lead to finish exploration (with timeout)
    const explorationResult = await withTimeout(explorationTurnPromise, EXPLORATION_TIMEOUT_MS)
    if (isTimeoutResult(explorationResult)) {
      throw new Error('Team Lead exploration timed out')
    }

    // ---- Phase 2: PLAN ----
    store.setPhase('planning')
    log.info('[Swarm] Parsing task list from Team Lead', 'SwarmOrchestrator')

    let parsedTasks: ReturnType<typeof parseTaskList>
    try {
      parsedTasks = parseTaskList(explorationResult)
    } catch (err) {
      throw new Error(
        `Failed to parse Team Lead task list: ${err instanceof Error ? err.message : String(err)}`
      )
    }

    // Populate store with parsed tasks
    // QW-2: Map dependsOn title strings to task IDs for reliable matching
    const titleToId = new Map<string, string>()
    parsedTasks.forEach((t, i) => {
      titleToId.set(t.title.toLowerCase(), `task-${i + 1}`)
    })

    const swarmTasks: SwarmTask[] = parsedTasks.map((t, i) => ({
      id: `task-${i + 1}`,
      title: t.title,
      description: t.description,
      testCommand: t.testCommand,
      status: 'pending' as const,
      assignedWorker: null,
      dependsOn: t.dependsOn
        .map((dep) => titleToId.get(dep.toLowerCase()) || dep)
        .filter((dep) => dep !== `task-${i + 1}`), // remove self-references
    }))

    store.setTasks(swarmTasks)
    store.addMessage({
      from: 'Team Lead',
      content: `Planned ${swarmTasks.length} task(s):\n${swarmTasks.map((t, i) => `  ${i + 1}. ${t.title}`).join('\n')}`,
      type: 'broadcast',
    })

    // ---- Phase 2b: AWAIT APPROVAL ----
    store.setPhase('awaiting_approval')
    // Reset approval state to pending so the UI can show the gate
    useSwarmStore.setState({ approvalState: 'pending' })

    log.info('[Swarm] Waiting for user to approve plan', 'SwarmOrchestrator')
    store.addMessage({
      from: 'System',
      content: 'Plan ready for review. Approve to proceed or reject to cancel.',
      type: 'status',
    })

    const verdict = await waitForPlanApproval()

    if (verdict === 'rejected') {
      store.addMessage({ from: 'System', content: 'Plan rejected by user.', type: 'error' })
      store.setError('Plan rejected by user')
      store.setPhase('failed')
      return
    }

    store.addMessage({ from: 'System', content: 'Plan approved. Continuing...', type: 'status' })

    // ---- Phase 3: CASCADE CHECK ----
    // If there is only one task, the Team Lead handles it directly
    // without spawning workers or creating worktrees.
    if (swarmTasks.length <= 1) {
      log.info('[Swarm] Cascade path: single task, Team Lead handles it', 'SwarmOrchestrator')
      store.setPhase('working')
      store.addMessage({
        from: 'System',
        content: 'Single task detected -- Team Lead working directly.',
        type: 'status',
      })

      const task = swarmTasks[0]
      store.updateTaskStatus(task.id, 'in_progress')

      const cascadePrompt = buildCascadePrompt(userRequest, task)

      // Set up listener BEFORE sending message
      const cascadeTurnPromise = waitForTurnComplete(teamLeadThreadId)
      await threadApi.sendMessage(teamLeadThreadId, cascadePrompt)
      const cascadeResult = await withTimeout(cascadeTurnPromise, WORKER_TIMEOUT_MS)

      if (isTimeoutResult(cascadeResult)) {
        store.updateTaskStatus(task.id, 'failed')
        throw new Error('Team Lead cascade task timed out')
      }

      store.updateTaskStatus(task.id, 'merged')
      store.addMessage({ from: 'Team Lead', content: `Completed: ${task.title}`, type: 'status' })

      // Run test command in cascade path if one is configured
      if (task.testCommand && task.testCommand !== 'echo "no test"') {
        store.setPhase('testing')
        store.addMessage({ from: 'System', content: 'Running tests...', type: 'status' })
        try {
          const testResult = await terminalApi.execute(projectPath, task.testCommand)
          const passed = testResult.exitCode === 0
          store.setTestResults(task.testCommand, passed)
          store.addMessage({
            from: 'System',
            content: passed ? 'Tests passed!' : `Tests failed (exit code: ${testResult.exitCode})`,
            type: passed ? 'status' : 'error',
          })
        } catch (err) {
          store.setTestResults(`Error: ${err instanceof Error ? err.message : String(err)}`, false)
          store.addMessage({
            from: 'System',
            content: `Test execution failed: ${err instanceof Error ? err.message : String(err)}`,
            type: 'error',
          })
        }
      }

      // ---- Cascade Review Phase ----
      store.setPhase('reviewing')
      store.addMessage({
        from: 'System',
        content: 'Generating review diff...',
        type: 'status',
      })

      try {
        const diff = await projectApi.gitDiffBranch(projectPath, 'HEAD~1')
        store.setStagingDiff(diff)

        if (diff) {
          const testSummary = store.testOutput || 'No tests run'
          const reviewPrompt = buildTeamLeadReviewPrompt(diff, testSummary)

          const reviewTurnPromise = waitForTurnComplete(teamLeadThreadId)
          await threadApi.sendMessage(teamLeadThreadId, reviewPrompt)
          const reviewResult = await withTimeout(reviewTurnPromise, WORKER_TIMEOUT_MS)

          if (!isTimeoutResult(reviewResult)) {
            store.addMessage({ from: 'Team Lead', content: reviewResult, type: 'discovery' })
          }
        }
      } catch (err) {
        log.warn(`[Swarm] Cascade review failed (non-fatal): ${err}`, 'SwarmOrchestrator')
      }

      store.setPhase('completed')
      store.addMessage({
        from: 'System',
        content: 'Task completed. Review the changes above.',
        type: 'status',
      })
      return
    }

    // ---- Phase 4: SPAWN ----
    store.setPhase('spawning')
    const workerCount = Math.min(swarmTasks.length, MAX_WORKERS)
    log.info(`[Swarm] Spawning ${workerCount} workers`, 'SwarmOrchestrator')
    store.addMessage({ from: 'System', content: `Spawning ${workerCount} workers...`, type: 'status' })

    // Set up swarm infrastructure (staging branch + worktrees)
    swarmContext = await setupSwarm(projectPath, userRequest.slice(0, 50), workerCount)
    store.setContext({
      stagingBranch: swarmContext.stagingBranch,
      originalBranch: swarmContext.originalBranch,
      projectPath: swarmContext.projectPath,
      projectId,
      workerPaths: swarmContext.workerPaths,
    })

    // Start worker threads
    for (let i = 0; i < workerCount; i++) {
      const workerPath = swarmContext.workerPaths[i]
      const workerBranch = swarmContext.workerBranches[i]

      const workerResponse = await threadApi.start(
        projectId,
        workerPath,
        undefined, // default model
        undefined, // default sandbox
        'auto-edit' // workers get auto-edit approval for speed
      )

      const worker = {
        id: `worker-${i + 1}`,
        name: `Worker ${i + 1}`,
        threadId: workerResponse.thread.id,
        worktreePath: workerPath,
        worktreeBranch: workerBranch,
        status: 'idle' as const,
        currentTaskId: null,
        lastMessage: null,
      }

      store.addWorker(worker)
      log.info(
        `[Swarm] Started worker ${i + 1}: thread=${workerResponse.thread.id}`,
        'SwarmOrchestrator'
      )
    }

    store.addMessage({ from: 'System', content: `${workerCount} workers ready.`, type: 'status' })

    // ---- Phase 5: WORK (Parallel Worker Pool) ----
    store.setPhase('working')

    // Build a work queue of pending task IDs for parallel dispatch
    const taskQueue: string[] = swarmTasks.map((t) => t.id)

    /**
     * Process a single task on a given worker. Returns when the task is
     * completed (merged/failed) and the worker is ready for the next task.
     */
    async function processTask(
      task: SwarmTask,
      worker: { id: string; name: string; threadId: string; worktreePath: string; worktreeBranch: string }
    ): Promise<void> {
      // Assign task to worker
      store.updateWorker(worker.id, { status: 'working', currentTaskId: task.id })
      store.updateTaskStatus(task.id, 'in_progress', worker.id)
      store.addMessage({
        from: worker.name,
        content: `Working on: ${task.title}`,
        type: 'status',
      })

      // Build and send worker prompt
      const workerPrompt = buildWorkerPrompt(
        task,
        swarmTasks.map((t) => ({ title: t.title, description: t.description })),
        worker.worktreePath,
        swarmContext!.stagingBranch,
        parseInt(worker.id.split('-')[1], 10)
      )

      // Set up listener BEFORE sending message to avoid race condition
      const workerTurnPromise = waitForTurnComplete(worker.threadId)

      try {
        await threadApi.sendMessage(worker.threadId, workerPrompt)
      } catch (err) {
        log.error(`[Swarm] Failed to send prompt to ${worker.name}: ${err}`, 'SwarmOrchestrator')
        store.updateWorker(worker.id, { status: 'idle', currentTaskId: null })
        store.updateTaskStatus(task.id, 'failed')
        store.addMessage({
          from: worker.name,
          content: `Failed to start: ${err instanceof Error ? err.message : String(err)}`,
          type: 'error',
        })
        return
      }

      // Wait for worker to complete (with timeout)
      const result = await withTimeout(workerTurnPromise, WORKER_TIMEOUT_MS)

      if (isTimeoutResult(result)) {
        // FIX-4: Immediately interrupt the worker on timeout
        try {
          await threadApi.interrupt(worker.threadId)
        } catch {
          // Interrupting a thread that is already idle/done is harmless
        }
        store.updateWorker(worker.id, { status: 'idle', currentTaskId: null })
        store.updateTaskStatus(task.id, 'failed')
        store.addMessage({
          from: worker.name,
          content: `Timed out on: ${task.title}`,
          type: 'error',
        })
        return
      }

      // Merge worker's changes to staging
      store.updateWorker(worker.id, { status: 'merging' })
      store.updateTaskStatus(task.id, 'merging')

      const mergeResult = await mergeToStaging(
        projectPath,
        worker.worktreeBranch,
        swarmContext!.stagingBranch,
        `[swarm] Merge ${task.title} from ${worker.name}`
      )

      if (mergeResult.success) {
        store.updateWorker(worker.id, { status: 'idle', currentTaskId: null })
        store.updateTaskStatus(task.id, 'merged')
        store.addMessage({
          from: worker.name,
          content: `Merged: ${task.title}`,
          type: 'status',
        })
      } else {
        // FIX-5: Mark task as failed but reset worker to idle so it can take other tasks
        store.updateWorker(worker.id, { status: 'idle', currentTaskId: null })
        store.updateTaskStatus(task.id, 'failed')
        store.addMessage({
          from: worker.name,
          content: `Merge conflict on ${task.title}: ${mergeResult.conflictFiles.join(', ')}`,
          type: 'error',
        })
      }
    }

    /**
     * Worker loop: each worker pulls tasks from the shared queue until
     * there are no more tasks to process.
     */
    async function workerLoop(
      worker: { id: string; name: string; threadId: string; worktreePath: string; worktreeBranch: string }
    ): Promise<void> {
      while (taskQueue.length > 0) {
        // Check if swarm was cancelled during work
        if (useSwarmStore.getState().phase === 'cleaning_up') {
          log.info(`[Swarm] ${worker.name}: swarm cancelled, stopping`, 'SwarmOrchestrator')
          return
        }

        const taskId = taskQueue.shift()
        if (!taskId) break

        const currentTasks = useSwarmStore.getState().tasks
        const task = currentTasks.find((t) => t.id === taskId)
        if (!task || task.status !== 'pending') continue

        // QW-2: Check dependencies by task ID instead of title string
        if (task.dependsOn.length > 0) {
          const allTasks = useSwarmStore.getState().tasks
          const anyFailed = task.dependsOn.some((depId) => {
            const dep = allTasks.find((t) => t.id === depId)
            return dep?.status === 'failed'
          })
          if (anyFailed) {
            store.updateTaskStatus(task.id, 'failed')
            store.addMessage({
              from: 'System',
              content: `Skipped "${task.title}": dependency failed`,
              type: 'error',
            })
            continue
          }

          const depsMet = task.dependsOn.every((depId) => {
            const dep = allTasks.find((t) => t.id === depId)
            return dep?.status === 'merged'
          })
          if (!depsMet) {
            // Re-queue at the back so other workers can process independent tasks
            taskQueue.push(taskId)
            // Brief pause to avoid busy-spinning while waiting for dependencies
            await new Promise((resolve) => setTimeout(resolve, 2000))
            continue
          }
        }

        await processTask(task, worker)

        // QW-6: Circuit breaker -- abort if >50% of tasks have failed
        const latestTasks = useSwarmStore.getState().tasks
        const failedCount = latestTasks.filter((t) => t.status === 'failed').length
        if (failedCount > latestTasks.length / 2) {
          log.error(
            `[Swarm] Circuit breaker triggered: ${failedCount}/${latestTasks.length} tasks failed`,
            'SwarmOrchestrator'
          )
          const failedNames = latestTasks
            .filter((t) => t.status === 'failed')
            .map((t) => t.title)
            .join(', ')
          store.addMessage({
            from: 'System',
            content: `Circuit breaker: ${failedCount}/${latestTasks.length} tasks failed (${failedNames}). Aborting swarm.`,
            type: 'error',
          })
          // Drain the queue so all worker loops exit
          taskQueue.length = 0
          break
        }
      }
    }

    // Launch all workers in parallel
    const workers = useSwarmStore.getState().workers
    await Promise.all(workers.map((w) => workerLoop(w)))

    // QW-6: Check if circuit breaker was triggered
    {
      const finalTasks = useSwarmStore.getState().tasks
      const failedCount = finalTasks.filter((t) => t.status === 'failed').length
      if (failedCount > finalTasks.length / 2) {
        await interruptAllWorkers()
        store.setError(`Circuit breaker: ${failedCount}/${finalTasks.length} tasks failed`)
        store.setPhase('failed')
        return
      }
    }

    // ---- Phase 6: TEST (before review) ----
    store.setPhase('testing')
    store.addMessage({ from: 'System', content: 'Running tests...', type: 'status' })

    // Collect all unique test commands from tasks
    const testCommands = [...new Set(
      useSwarmStore.getState().tasks
        .map((t) => t.testCommand)
        .filter((cmd): cmd is string => !!cmd && cmd !== 'echo "no test"')
    )]

    let allTestsPassed = true
    const testOutputs: string[] = []

    if (testCommands.length === 0) {
      testOutputs.push('No test commands configured')
    } else {
      for (const cmd of testCommands) {
        try {
          const testResult = await terminalApi.execute(projectPath, cmd)
          testOutputs.push(`$ ${cmd}\nExit code: ${testResult.exitCode}`)
          if (testResult.exitCode !== 0) allTestsPassed = false
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          testOutputs.push(`$ ${cmd}\nError: ${errMsg}`)
          allTestsPassed = false
        }
      }
    }

    const testSummary = testOutputs.join('\n\n')
    store.setTestResults(testSummary, allTestsPassed)
    store.addMessage({
      from: 'System',
      content: allTestsPassed ? 'All tests passed!' : `Some tests failed:\n${testSummary}`,
      type: allTestsPassed ? 'status' : 'error',
    })

    // ---- Phase 7: REVIEW ----
    store.setPhase('reviewing')
    store.addMessage({
      from: 'System',
      content: 'All tasks processed. Generating diff...',
      type: 'status',
    })

    // Get diff of staging branch vs original branch
    try {
      const diff = await projectApi.gitDiffBranch(projectPath, swarmContext.originalBranch)
      store.setStagingDiff(diff)
    } catch (err) {
      log.error(`[Swarm] Failed to get staging diff: ${err}`, 'SwarmOrchestrator')
      store.addMessage({
        from: 'System',
        content: 'Failed to generate staging diff.',
        type: 'error',
      })
    }

    // Ask Team Lead to review the combined diff, including test results
    const currentDiff = useSwarmStore.getState().stagingDiff
    if (currentDiff) {
      try {
        const reviewPrompt = buildTeamLeadReviewPrompt(currentDiff, testSummary)

        // Set up listener BEFORE sending message
        const reviewTurnPromise = waitForTurnComplete(teamLeadThreadId)
        await threadApi.sendMessage(teamLeadThreadId, reviewPrompt)
        const reviewResult = await withTimeout(reviewTurnPromise, WORKER_TIMEOUT_MS)

        if (!isTimeoutResult(reviewResult)) {
          store.addMessage({ from: 'Team Lead', content: reviewResult, type: 'discovery' })

          // QW-3: Parse review verdict from Team Lead response
          const upperReview = reviewResult.toUpperCase()
          if (upperReview.includes('REQUEST_CHANGES') || upperReview.includes('REQUEST CHANGES')) {
            log.info('[Swarm] Team Lead requested changes', 'SwarmOrchestrator')
            store.addMessage({
              from: 'System',
              content: 'Team Lead requested changes. Review the feedback above before merging.',
              type: 'error',
            })
            // Stay in reviewing phase -- don't auto-transition to completed
            // User can still force-merge from the UI
          }
        }
      } catch (err) {
        log.warn(`[Swarm] Team Lead review failed (non-fatal): ${err}`, 'SwarmOrchestrator')
      }
    }

    // QW-4: Gate on test results -- block auto-completion if tests failed
    if (!allTestsPassed) {
      log.info('[Swarm] Tests failed -- blocking auto-completion', 'SwarmOrchestrator')
      store.addMessage({
        from: 'System',
        content: 'Tests failed. Review failures above. You can still force-merge from the UI.',
        type: 'error',
      })
      // Stay in reviewing phase so user must explicitly approve
      // Don't transition to completed
    } else {
      // ---- Phase 8: COMPLETE ----
      store.setPhase('completed')
      store.addMessage({
        from: 'System',
        content: 'Swarm completed. Review results and decide to merge or discard.',
        type: 'broadcast',
      })
    }

    // Mark all workers as done and interrupt their threads
    useSwarmStore.getState().workers.forEach((w) => {
      store.updateWorker(w.id, { status: 'done' })
    })
    await interruptAllWorkers()

    log.info('[Swarm] Orchestration completed successfully', 'SwarmOrchestrator')
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    log.error(`[Swarm] Orchestration failed: ${errorMsg}`, 'SwarmOrchestrator')

    store.setError(errorMsg)
    store.setPhase('failed')
    store.addMessage({ from: 'System', content: `Error: ${errorMsg}`, type: 'error' })

    // Interrupt workers before cleanup
    await interruptAllWorkers()

    // Attempt cleanup of swarm infrastructure
    if (swarmContext) {
      store.setPhase('cleaning_up')
      try {
        await cleanupSwarm(
          buildCleanupContext(swarmContext),
          true // delete branches
        )
      } catch (cleanupErr) {
        log.error(`[Swarm] Cleanup failed: ${cleanupErr}`, 'SwarmOrchestrator')
      }
      store.setPhase('failed')
    }
  }
}

/**
 * Cancel and clean up an active swarm.
 * Removes worktrees, deletes branches, and resets the store.
 */
export async function cancelSwarm(): Promise<void> {
  const store = useSwarmStore.getState()
  const context = store.context

  if (!context) {
    store.deactivate()
    return
  }

  store.setPhase('cleaning_up')
  store.addMessage({ from: 'System', content: 'Cancelling and cleaning up...', type: 'status' })

  // Interrupt all worker threads before removing worktrees
  await interruptAllWorkers()

  try {
    const workers = store.workers
    await cleanupSwarm(
      {
        stagingBranch: context.stagingBranch,
        originalBranch: context.originalBranch,
        projectPath: context.projectPath,
        workerPaths: context.workerPaths,
        workerBranches: workers.map((w) => w.worktreeBranch),
      },
      true // delete branches
    )
  } catch (err) {
    log.error(`[Swarm] Cancel cleanup failed: ${err}`, 'SwarmOrchestrator')
  }

  store.deactivate()
}

// ==================== Internal Helpers ====================

/**
 * Build a SwarmSetupContext suitable for cleanupSwarm() from the
 * orchestrator's swarmContext + current worker state.
 */
function buildCleanupContext(swarmContext: SwarmSetupContext): SwarmSetupContext {
  const workers = useSwarmStore.getState().workers
  return {
    stagingBranch: swarmContext.stagingBranch,
    originalBranch: swarmContext.originalBranch,
    projectPath: swarmContext.projectPath,
    workerPaths: swarmContext.workerPaths,
    workerBranches: workers.length > 0
      ? workers.map((w) => w.worktreeBranch)
      : swarmContext.workerBranches,
  }
}
