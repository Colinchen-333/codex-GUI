import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { projectApi, type TerminalOutput } from './api'
import { log } from './logger'

// ==================== Types ====================

export interface SwarmSetupContext {
  stagingBranch: string
  originalBranch: string
  projectPath: string
  workerPaths: string[]
  workerBranches: string[]
}

export interface MergeResult {
  success: boolean
  conflictFiles: string[]
  message: string
}

// ==================== Helpers ====================

/**
 * Slugify a task name for use in branch names.
 * Converts "Add token expiry" to "add-token-expiry" (lowercase, hyphens, max 30 chars).
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}

/**
 * Execute a shell command and capture stdout/stderr by listening to terminal events.
 * The Tauri execute_terminal_command streams output via events and returns only the exit code,
 * so we collect event payloads during execution.
 */
async function execCapture(
  cwd: string,
  command: string
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  const stdoutLines: string[] = []
  const stderrLines: string[] = []

  // Set up listeners before executing so we don't miss early output
  const unlisteners: UnlistenFn[] = []

  const unStdout = await listen<string>('terminal:stdout', (event) => {
    stdoutLines.push(event.payload)
  })
  unlisteners.push(unStdout)

  const unStderr = await listen<string>('terminal:stderr', (event) => {
    stderrLines.push(event.payload)
  })
  unlisteners.push(unStderr)

  try {
    const result = await invoke<TerminalOutput>('execute_terminal_command', { cwd, command })
    return {
      exitCode: result.exitCode,
      stdout: stdoutLines.join('\n'),
      stderr: stderrLines.join('\n'),
    }
  } finally {
    // Always clean up listeners
    for (const unlisten of unlisteners) {
      unlisten()
    }
  }
}

// ==================== Harness Functions ====================

/**
 * Set up the swarm infrastructure: create a staging branch and worker worktrees.
 *
 * Steps:
 * 1. Get the current branch
 * 2. Create a staging branch from HEAD
 * 3. Switch back to the original branch
 * 4. Create worktrees for each worker
 * 5. On failure, rollback any created worktrees
 */
export async function setupSwarm(
  projectPath: string,
  taskName: string,
  workerCount: number
): Promise<SwarmSetupContext> {
  const slug = slugify(taskName)
  const timestamp = Date.now()
  const stagingBranch = `swarm/${slug}-${timestamp}`

  // Get current branch
  const originalBranch = await projectApi.getCurrentBranch(projectPath)
  log.info(`[Swarm] Original branch: ${originalBranch}`, 'SwarmHarness')

  // Create staging branch from HEAD
  const createResult = await execCapture(
    projectPath,
    `git checkout -b ${stagingBranch} HEAD`
  )
  if (createResult.exitCode !== 0) {
    throw new Error(`Failed to create staging branch: ${createResult.stderr}`)
  }
  log.info(`[Swarm] Created staging branch: ${stagingBranch}`, 'SwarmHarness')

  // Switch back to original branch
  const checkoutResult = await execCapture(projectPath, `git checkout ${originalBranch}`)
  if (checkoutResult.exitCode !== 0) {
    // Try to clean up the staging branch before throwing
    await execCapture(projectPath, `git branch -D ${stagingBranch}`).catch(() => {})
    throw new Error(`Failed to switch back to original branch: ${checkoutResult.stderr}`)
  }

  // Create worktrees for each worker
  const workerPaths: string[] = []
  const workerBranches: string[] = []

  for (let i = 1; i <= workerCount; i++) {
    const workerBranch = `swarm/${slug}-w${i}`
    const worktreeRelPath = `.swarm/w${i}`

    try {
      const info = await projectApi.createWorktree(projectPath, workerBranch, worktreeRelPath)
      workerPaths.push(info.path)
      workerBranches.push(workerBranch)
      log.info(`[Swarm] Created worktree w${i}: ${info.path}`, 'SwarmHarness')
    } catch (err) {
      // Rollback: remove already-created worktrees
      log.error(`[Swarm] Failed to create worktree w${i}, rolling back`, 'SwarmHarness')
      for (const createdPath of workerPaths) {
        try {
          await projectApi.removeWorktree(projectPath, createdPath)
        } catch {
          // Continue cleanup despite individual failures
        }
      }
      // Also clean up the staging branch
      await execCapture(projectPath, `git branch -D ${stagingBranch}`).catch(() => {})
      throw new Error(
        `Failed to create worktree for worker ${i}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  return {
    stagingBranch,
    originalBranch,
    projectPath,
    workerPaths,
    workerBranches,
  }
}

/**
 * Merge a worker branch into the staging branch using --no-ff.
 *
 * Uses execute_terminal_command with git merge since there is no dedicated
 * Rust command for merge yet. Parses output to detect conflicts.
 */
export async function mergeToStaging(
  projectPath: string,
  workerBranch: string,
  stagingBranch: string,
  message: string
): Promise<MergeResult> {
  // Checkout staging branch
  const checkoutResult = await execCapture(projectPath, `git checkout ${stagingBranch}`)
  if (checkoutResult.exitCode !== 0) {
    return {
      success: false,
      conflictFiles: [],
      message: `Failed to checkout staging branch: ${checkoutResult.stderr}`,
    }
  }

  // Escape double quotes in commit message for shell safety
  const escapedMessage = message.replace(/"/g, '\\"')

  // Merge with --no-ff
  const mergeResult = await execCapture(
    projectPath,
    `git merge --no-ff ${workerBranch} -m "${escapedMessage}"`
  )

  if (mergeResult.exitCode === 0) {
    return {
      success: true,
      conflictFiles: [],
      message: mergeResult.stdout || 'Merge successful',
    }
  }

  // Parse conflict files from merge output
  const conflictFiles: string[] = []
  const combined = `${mergeResult.stdout}\n${mergeResult.stderr}`
  const conflictPattern = /CONFLICT.*?:\s+.*?in\s+(.+)/g
  let match
  while ((match = conflictPattern.exec(combined)) !== null) {
    conflictFiles.push(match[1].trim())
  }

  // Abort the failed merge to leave the repo in a clean state
  await execCapture(projectPath, 'git merge --abort').catch(() => {})

  return {
    success: false,
    conflictFiles,
    message: combined,
  }
}

/**
 * Clean up swarm infrastructure: remove worktrees and optionally delete branches.
 *
 * Continues on individual failures so that partial cleanup is still performed.
 */
export async function cleanupSwarm(
  context: SwarmSetupContext,
  deleteBranch = false
): Promise<void> {
  const { projectPath, workerPaths, workerBranches, stagingBranch, originalBranch } = context

  // First, switch back to the original branch to avoid being on a branch we're about to delete
  await execCapture(projectPath, `git checkout ${originalBranch}`).catch((err) => {
    log.error(`[Swarm] Failed to checkout original branch: ${err}`, 'SwarmHarness')
  })

  // Remove each worktree
  for (const wPath of workerPaths) {
    try {
      await projectApi.removeWorktree(projectPath, wPath)
      log.info(`[Swarm] Removed worktree: ${wPath}`, 'SwarmHarness')
    } catch (err) {
      log.error(
        `[Swarm] Failed to remove worktree ${wPath}: ${err instanceof Error ? err.message : String(err)}`,
        'SwarmHarness'
      )
      // Continue with remaining worktrees
    }
  }

  // Optionally delete branches
  if (deleteBranch) {
    // Delete worker branches
    for (const branch of workerBranches) {
      await execCapture(projectPath, `git branch -D ${branch}`).catch((err) => {
        log.error(`[Swarm] Failed to delete branch ${branch}: ${err}`, 'SwarmHarness')
      })
    }

    // Delete staging branch
    await execCapture(projectPath, `git branch -D ${stagingBranch}`).catch((err) => {
      log.error(`[Swarm] Failed to delete staging branch: ${err}`, 'SwarmHarness')
    })
  }

  log.info('[Swarm] Cleanup completed', 'SwarmHarness')
}

/**
 * Wrap a promise with a timeout. Returns the result or `{ timeout: true }` if
 * the promise does not resolve within the given duration.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T | { timeout: true }> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
    timeoutId = setTimeout(() => resolve({ timeout: true }), ms)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
  }
}
