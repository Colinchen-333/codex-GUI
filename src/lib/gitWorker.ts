/**
 * Git Worker Client
 *
 * Mirrors the official Codex Desktop's dedicated git worker channel
 * (`codex_desktop:worker:git:from-view/for-view`). All 16 read methods are
 * cached on the frontend with TTL-based invalidation groups so the UI avoids
 * redundant subprocess calls during rapid re-renders.
 *
 * Invalidation groups (from official architecture):
 *   head         — branch / status / diff / index data
 *   remote-refs  — ahead-count, default/base branch, branch-changes
 *   synced-branch — synced branch name + sync state
 */

import { invoke } from '@tauri-apps/api/core'
import { isTauriAvailable } from './tauri'
import { log } from './logger'

// ---------------------------------------------------------------------------
// Cache invalidation group definitions (mirrors official worker)
// ---------------------------------------------------------------------------

const INVALIDATION_GROUPS = {
  head: [
    'current-branch',
    'upstream-branch',
    'branch-ahead-count',
    'recent-branches',
    'branch-changes',
    'status-summary',
    'staged-and-unstaged-changes',
    'untracked-changes',
    'tracked-uncommitted-changes',
    'index-info',
    'submodule-paths',
    'synced-branch',
  ],
  'remote-refs': ['branch-ahead-count', 'default-branch', 'base-branch', 'branch-changes'],
  'synced-branch': ['synced-branch', 'synced-branch-state'],
} as const

type InvalidationGroup = keyof typeof INVALIDATION_GROUPS

// ---------------------------------------------------------------------------
// Internal cache
// ---------------------------------------------------------------------------

interface GitWorkerCacheEntry {
  data: unknown
  timestamp: number
}

const cache = new Map<string, GitWorkerCacheEntry>()

/** Default TTL for cached git queries: 30 seconds. */
const CACHE_TTL = 30_000

/** Stable metadata (repo root, commonDir, HEAD hash) survives longer: 60 s. */
const STABLE_TTL = 60_000

function cacheKey(cwd: string, method: string, params?: unknown): string {
  return `${cwd}:${method}:${params !== undefined ? JSON.stringify(params) : ''}`
}

// ---------------------------------------------------------------------------
// Cache management helpers
// ---------------------------------------------------------------------------

/**
 * Invalidate all cached entries belonging to the given groups for `cwd`.
 * Call this after any write operation (commit, stage, push, checkout, etc.).
 */
export function invalidateGitCache(cwd: string, groups: InvalidationGroup[]): void {
  for (const group of groups) {
    const methods = INVALIDATION_GROUPS[group]
    for (const method of methods) {
      const prefix = `${cwd}:${method}:`
      for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
          cache.delete(key)
        }
      }
    }
  }
  log.debug(`Git cache invalidated for cwd="${cwd}" groups=[${groups.join(', ')}]`, 'gitWorker')
}

/** Invalidate ALL cached entries for a given working directory. */
export function invalidateAllGitCache(cwd: string): void {
  const prefix = `${cwd}:`
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
  log.debug(`Full git cache cleared for cwd="${cwd}"`, 'gitWorker')
}

/** Wipe the entire in-process git worker cache (e.g., on app-server reconnect). */
export function clearGitWorkerCache(): void {
  cache.clear()
  log.info('Git worker cache fully cleared', 'gitWorker')
}

// ---------------------------------------------------------------------------
// Core request dispatcher
// ---------------------------------------------------------------------------

async function gitWorkerRequest<T>(
  method: string,
  cwd: string,
  params?: Record<string, unknown>,
  ttl = CACHE_TTL,
): Promise<T> {
  if (!isTauriAvailable()) {
    throw new Error('Git worker unavailable: Tauri is not present (web mode)')
  }

  const key = cacheKey(cwd, method, params)
  const cached = cache.get(key)
  if (cached !== undefined && Date.now() - cached.timestamp < ttl) {
    return cached.data as T
  }

  try {
    const result = await invoke<T>('git_worker_request', {
      method,
      cwd,
      params: params ?? {},
    })

    cache.set(key, { data: result, timestamp: Date.now() })
    return result
  } catch (err) {
    log.warn(`git_worker_request("${method}", cwd="${cwd}") failed: ${String(err)}`, 'gitWorker')
    throw err
  }
}

// ---------------------------------------------------------------------------
// Public type definitions
// ---------------------------------------------------------------------------

export interface GitStableMetadata {
  /** Absolute path to the repository root (top-level working tree). */
  root: string
  /** commonDir — may differ from root in worktrees. */
  commonDir: string
  /** Current HEAD commit hash, or null for an empty repository. */
  commitHash: string | null
}

export interface GitBranchChange {
  /** Relative path within the repository. */
  path: string
  /** Short git status code, e.g. "M", "A", "D", "?". */
  status: string
}

export interface GitStatusSummary {
  /** True when the working tree and index are clean. */
  isClean: boolean
  /** True when there are unresolved merge/rebase conflicts. */
  hasConflicts: boolean
  /** Number of staged file changes. */
  staged: number
  /** Number of unstaged (tracked) file changes. */
  unstaged: number
  /** Number of untracked files. */
  untracked: number
}

export interface GitStagedUnstagedChanges {
  /** Unified diff of staged changes (empty string when none). */
  staged: string
  /** Unified diff of unstaged changes (empty string when none). */
  unstaged: string
}

export interface GitSyncedBranchState {
  /** Commits ahead of the synced remote branch. */
  ahead: number
  /** Commits behind the synced remote branch. */
  behind: number
  /** Overall sync state derived from ahead/behind counts. */
  state: 'synced' | 'ahead' | 'behind' | 'diverged'
}

// ---------------------------------------------------------------------------
// Public git worker API
// ---------------------------------------------------------------------------

export const gitWorker = {
  /**
   * Stable repository metadata: root path, commonDir, and HEAD hash.
   * Cached for 60 s because this rarely changes within a session.
   */
  stableMetadata: (cwd: string): Promise<GitStableMetadata> =>
    gitWorkerRequest<GitStableMetadata>('stable-metadata', cwd, undefined, STABLE_TTL),

  /** Current branch name, or null on a detached HEAD. */
  currentBranch: (cwd: string): Promise<string | null> =>
    gitWorkerRequest<string | null>('current-branch', cwd),

  /** Upstream tracking branch (e.g. "origin/main"), or null if unset. */
  upstreamBranch: (cwd: string): Promise<string | null> =>
    gitWorkerRequest<string | null>('upstream-branch', cwd),

  /** Number of local commits not yet pushed to the upstream branch. */
  branchAheadCount: (cwd: string): Promise<number> =>
    gitWorkerRequest<number>('branch-ahead-count', cwd),

  /**
   * Recently checked-out branch names, most recent first.
   * @param limit Maximum entries to return (default 10).
   */
  recentBranches: (cwd: string, limit = 10): Promise<string[]> =>
    gitWorkerRequest<string[]>('recent-branches', cwd, { limit }),

  /** Files changed on the current branch relative to the base branch. */
  branchChanges: (cwd: string): Promise<GitBranchChange[]> =>
    gitWorkerRequest<GitBranchChange[]>('branch-changes', cwd),

  /** High-level git status summary (clean/dirty/conflicts/counts). */
  statusSummary: (cwd: string): Promise<GitStatusSummary> =>
    gitWorkerRequest<GitStatusSummary>('status-summary', cwd),

  /** Full unified diffs for staged and unstaged changes. */
  stagedAndUnstagedChanges: (cwd: string): Promise<GitStagedUnstagedChanges> =>
    gitWorkerRequest<GitStagedUnstagedChanges>('staged-and-unstaged-changes', cwd),

  /** List of untracked file paths (relative to repo root). */
  untrackedChanges: (cwd: string): Promise<string[]> =>
    gitWorkerRequest<string[]>('untracked-changes', cwd),

  /** List of tracked files with uncommitted modifications (relative paths). */
  trackedUncommittedChanges: (cwd: string): Promise<string[]> =>
    gitWorkerRequest<string[]>('tracked-uncommitted-changes', cwd),

  /**
   * Raw git index state.
   * Shape is opaque and subject to change; cast to a known type at call sites.
   */
  indexInfo: (cwd: string): Promise<unknown> =>
    gitWorkerRequest<unknown>('index-info', cwd),

  /** Relative paths of all registered git submodules. */
  submodulePaths: (cwd: string): Promise<string[]> =>
    gitWorkerRequest<string[]>('submodule-paths', cwd),

  /** Name of the synced remote branch, or null if not configured. */
  syncedBranch: (cwd: string): Promise<string | null> =>
    gitWorkerRequest<string | null>('synced-branch', cwd),

  /** Sync state between the local branch and its synced remote counterpart. */
  syncedBranchState: (cwd: string): Promise<GitSyncedBranchState> =>
    gitWorkerRequest<GitSyncedBranchState>('synced-branch-state', cwd),

  /** Default branch of the repository (e.g. "main" or "master"). */
  defaultBranch: (cwd: string): Promise<string> =>
    gitWorkerRequest<string>('default-branch', cwd),

  /** Base branch used for diff comparisons (may differ from default branch). */
  baseBranch: (cwd: string): Promise<string> =>
    gitWorkerRequest<string>('base-branch', cwd),

  // --- Cache management shortcuts ---

  /**
   * Invalidate cached results for the given invalidation groups.
   * Convenience wrapper around the module-level `invalidateGitCache`.
   */
  invalidate: invalidateGitCache,

  /**
   * Invalidate all cached results for a working directory.
   * Use after any operation that changes the working tree or HEAD.
   */
  invalidateAll: invalidateAllGitCache,

  /** Wipe the entire in-process cache (e.g., after an app-server reconnect). */
  clearCache: clearGitWorkerCache,
} as const
