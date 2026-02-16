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
 * 6. REVIEW: Generate combined diff of staging vs original branch
 * 7. TEST: Run test command
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
  // Look for ```json ... ``` block in the response
  const jsonMatch = response.match(/```json\s*\n([\s\S]*?)\n\s*```/)
  if (!jsonMatch) {
    throw new Error('Team Lead response did not contain a JSON task list')
  }

  const parsed = JSON.parse(jsonMatch[1])
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
 * Subscribes to `turn-completed` and `item-completed` events, collecting
 * agent message text as it arrives. Resolves with the concatenated agent
 * response when the turn finishes, or rejects on timeout.
 */
async function waitForTurnComplete(
  threadId: string,
  timeoutMs = WORKER_TIMEOUT_MS
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const collectedText: string[] = []
    const unlisteners: UnlistenFn[] = []
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      for (const unlisten of unlisteners) {
        unlisten()
      }
    }

    // Set up timeout
    timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error(`Thread ${threadId} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    // Listen for item completions to collect agent message text
    listen<ItemCompletedEvent>('item-completed', (event) => {
      const payload = event.payload
      if (payload.threadId !== threadId) return
      if (payload.item.type !== 'agentMessage') return

      // Extract text from the agent message content
      const content = payload.item.content as
        | { text?: string; isStreaming?: boolean }
        | undefined
      if (content?.text) {
        collectedText.push(content.text)
      }
    })
      .then((unlisten) => unlisteners.push(unlisten))
      .catch((err) => log.error(`[Swarm] Failed to listen for item-completed: ${err}`, 'SwarmOrchestrator'))

    // Listen for turn completion
    listen<TurnCompletedEvent>('turn-completed', (event) => {
      const payload = event.payload
      if (payload.threadId !== threadId) return

      cleanup()

      const status = payload.turn.status
      if (status === 'failed') {
        const errorMsg = payload.turn.error?.message || 'Turn failed'
        reject(new Error(errorMsg))
        return
      }

      resolve(collectedText.join('\n'))
    })
      .then((unlisten) => unlisteners.push(unlisten))
      .catch((err) => {
        cleanup()
        reject(new Error(`Failed to listen for turn-completed: ${err}`))
      })
  })
}

/**
 * Check if a value is a timeout sentinel from withTimeout().
 */
function isTimeoutResult(value: unknown): value is { timeout: true } {
  return value !== null && typeof value === 'object' && 'timeout' in value
}

// ==================== Main Orchestrator ====================

/**
 * Run the full swarm orchestration flow.
 *
 * This is the main entry point. It progresses through phases sequentially,
 * updating the swarm store at each step so the UI can render progress.
 *
 * The MVP uses sequential task assignment (one worker at a time).
 * True parallel execution across workers is a future enhancement.
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

    // Send exploration prompt to Team Lead
    const explorationPrompt = buildTeamLeadExplorationPrompt(userRequest, projectPath)
    await threadApi.sendMessage(teamLeadThreadId, explorationPrompt)

    store.addMessage({
      from: 'Team Lead',
      content: 'Exploring codebase and planning tasks...',
      type: 'discovery',
    })

    // Wait for Team Lead to finish exploration
    const explorationResult = await waitForTurnComplete(teamLeadThreadId, EXPLORATION_TIMEOUT_MS)

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
    const swarmTasks: SwarmTask[] = parsedTasks.map((t, i) => ({
      id: `task-${i + 1}`,
      title: t.title,
      description: t.description,
      testCommand: t.testCommand,
      status: 'pending' as const,
      assignedWorker: null,
      dependsOn: t.dependsOn,
    }))

    store.setTasks(swarmTasks)
    store.addMessage({
      from: 'Team Lead',
      content: `Planned ${swarmTasks.length} task(s):\n${swarmTasks.map((t, i) => `  ${i + 1}. ${t.title}`).join('\n')}`,
      type: 'broadcast',
    })

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
      await threadApi.sendMessage(teamLeadThreadId, cascadePrompt)
      await waitForTurnComplete(teamLeadThreadId)

      store.updateTaskStatus(task.id, 'merged')
      store.addMessage({ from: 'Team Lead', content: `Completed: ${task.title}`, type: 'status' })

      // Skip to completed -- no staging diff or tests in cascade mode
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

    // ---- Phase 5: WORK ----
    store.setPhase('working')

    // Sequential task assignment for MVP.
    // Each task is assigned to the first idle worker, one at a time.
    for (const task of swarmTasks) {
      // Check if swarm was cancelled during work
      if (useSwarmStore.getState().phase === 'cleaning_up') {
        log.info('[Swarm] Swarm cancelled during work phase', 'SwarmOrchestrator')
        return
      }

      // Find an idle worker
      let assignedWorker = useSwarmStore.getState().workers.find((w) => w.status === 'idle')

      // If no idle worker, wait briefly and try again
      if (!assignedWorker) {
        log.warn('[Swarm] No idle workers available, waiting...', 'SwarmOrchestrator')
        await new Promise((resolve) => setTimeout(resolve, 5000))
        assignedWorker = useSwarmStore.getState().workers.find((w) => w.status === 'idle')
      }

      if (!assignedWorker) {
        store.addMessage({
          from: 'System',
          content: `No worker available for task: ${task.title}`,
          type: 'error',
        })
        store.updateTaskStatus(task.id, 'failed')
        continue
      }

      // Assign task to worker
      store.updateWorker(assignedWorker.id, { status: 'working', currentTaskId: task.id })
      store.updateTaskStatus(task.id, 'in_progress', assignedWorker.id)
      store.addMessage({
        from: assignedWorker.name,
        content: `Working on: ${task.title}`,
        type: 'status',
      })

      // Build and send worker prompt
      const workerPrompt = buildWorkerPrompt(
        task,
        swarmTasks.map((t) => ({ title: t.title, description: t.description })),
        assignedWorker.worktreePath,
        swarmContext.stagingBranch,
        parseInt(assignedWorker.id.split('-')[1], 10)
      )

      try {
        await threadApi.sendMessage(assignedWorker.threadId, workerPrompt)
      } catch (err) {
        log.error(`[Swarm] Failed to send prompt to ${assignedWorker.name}: ${err}`, 'SwarmOrchestrator')
        store.updateWorker(assignedWorker.id, { status: 'failed' })
        store.updateTaskStatus(task.id, 'failed')
        store.addMessage({
          from: assignedWorker.name,
          content: `Failed to start: ${err instanceof Error ? err.message : String(err)}`,
          type: 'error',
        })
        continue
      }

      // Wait for worker to complete (with timeout)
      const result = await withTimeout(
        waitForTurnComplete(assignedWorker.threadId),
        WORKER_TIMEOUT_MS
      )

      if (isTimeoutResult(result)) {
        store.updateWorker(assignedWorker.id, { status: 'failed' })
        store.updateTaskStatus(task.id, 'failed')
        store.addMessage({
          from: assignedWorker.name,
          content: `Timed out on: ${task.title}`,
          type: 'error',
        })
        continue
      }

      // Merge worker's changes to staging
      store.updateWorker(assignedWorker.id, { status: 'merging' })
      store.updateTaskStatus(task.id, 'merging')

      const mergeResult = await mergeToStaging(
        projectPath,
        assignedWorker.worktreeBranch,
        swarmContext.stagingBranch,
        `[swarm] Merge ${task.title} from ${assignedWorker.name}`
      )

      if (mergeResult.success) {
        store.updateWorker(assignedWorker.id, { status: 'idle', currentTaskId: null })
        store.updateTaskStatus(task.id, 'merged')
        store.addMessage({
          from: assignedWorker.name,
          content: `Merged: ${task.title}`,
          type: 'status',
        })
      } else {
        store.updateWorker(assignedWorker.id, { status: 'failed' })
        store.updateTaskStatus(task.id, 'failed')
        store.addMessage({
          from: assignedWorker.name,
          content: `Merge conflict on ${task.title}: ${mergeResult.conflictFiles.join(', ')}`,
          type: 'error',
        })
      }
    }

    // ---- Phase 6: REVIEW ----
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

    // Optionally ask Team Lead to review the combined diff
    const currentDiff = useSwarmStore.getState().stagingDiff
    if (currentDiff) {
      try {
        const reviewPrompt = buildTeamLeadReviewPrompt(currentDiff, '')
        await threadApi.sendMessage(teamLeadThreadId, reviewPrompt)
        const reviewResult = await waitForTurnComplete(teamLeadThreadId)
        store.addMessage({ from: 'Team Lead', content: reviewResult, type: 'discovery' })
      } catch (err) {
        log.warn(`[Swarm] Team Lead review failed (non-fatal): ${err}`, 'SwarmOrchestrator')
      }
    }

    // ---- Phase 7: TEST ----
    store.setPhase('testing')
    store.addMessage({ from: 'System', content: 'Running tests...', type: 'status' })

    // Use the first task's test command, or a default
    const testCommand =
      useSwarmStore.getState().tasks.find((t) => t.testCommand && t.testCommand !== 'echo "no test"')
        ?.testCommand || 'echo "No test command configured"'

    try {
      const testResult = await terminalApi.execute(projectPath, testCommand)
      const passed = testResult.exitCode === 0
      store.setTestResults(testCommand, passed)
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

    // ---- Phase 8: COMPLETE ----
    store.setPhase('completed')
    store.addMessage({
      from: 'System',
      content: 'Swarm completed. Review results and decide to merge or discard.',
      type: 'broadcast',
    })

    // Mark all workers as done
    useSwarmStore.getState().workers.forEach((w) => {
      store.updateWorker(w.id, { status: 'done' })
    })

    log.info('[Swarm] Orchestration completed successfully', 'SwarmOrchestrator')
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    log.error(`[Swarm] Orchestration failed: ${errorMsg}`, 'SwarmOrchestrator')

    store.setError(errorMsg)
    store.setPhase('failed')
    store.addMessage({ from: 'System', content: `Error: ${errorMsg}`, type: 'error' })

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
