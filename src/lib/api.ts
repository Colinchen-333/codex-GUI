import { invoke } from '@tauri-apps/api/core'
import { log } from './logger'
import { withCache, clearCache, clearAllCache, CACHE_KEYS, CACHE_TTL } from './apiCache'
import { isTauriAvailable } from './tauri'

// ==================== Timeout Utility ====================

/**
 * Wrap Tauri invoke with timeout support
 * Note: This will reject the promise on timeout but won't cancel the backend call
 * @param command - Tauri command name
 * @param args - Command arguments
 * @param timeoutMs - Timeout in milliseconds (default: 30s)
 * @returns Promise that rejects on timeout
 */
async function invokeWithTimeout<T>(
  command: string,
  args?: Record<string, unknown>,
  timeoutMs: number = 30000
): Promise<T> {
  // Avoid leaving dangling timers around on successful invocations.
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms: ${command}`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([invoke<T>(command, args), timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

function invokeOrFallback<T>(
  fallback: T,
  command: string,
  args?: Record<string, unknown>,
  timeoutMs?: number
): Promise<T> {
  if (!isTauriAvailable()) return Promise.resolve(fallback)
  return typeof timeoutMs === 'number'
    ? invokeWithTimeout<T>(command, args, timeoutMs)
    : invoke<T>(command, args)
}

// ==================== Types ====================

export interface Project {
  id: string
  path: string
  displayName: string | null
  createdAt: number
  lastOpenedAt: number | null
  settingsJson: string | null
}

// Thread mode for session creation
export type ThreadMode = 'local' | 'worktree'

// Session status types for agent state tracking
export type SessionStatus = 'idle' | 'running' | 'completed' | 'failed' | 'interrupted'

// Task item for progress tracking
export interface TaskItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface SessionMetadata {
  sessionId: string
  projectId: string
  title: string | null
  tags: string | null
  isFavorite: boolean
  isArchived: boolean
  /**
   * Last accessed timestamp in Unix seconds (from SQLite).
   * Use normalizeTimestampToMs() for JavaScript Date operations.
   */
  lastAccessedAt: number | null
  /**
   * Creation timestamp in Unix seconds (from SQLite).
   * Use normalizeTimestampToMs() for JavaScript Date operations.
   */
  createdAt: number
  // Session lifecycle fields
  status: SessionStatus
  firstMessage: string | null
  tasksJson: string | null
  // Worktree mode fields (frontend-only, stored in tags/settings JSON)
  mode?: ThreadMode
  worktreePath?: string | null
  worktreeBranch?: string | null
}

export interface GitInfo {
  isGitRepo: boolean
  branch: string | null
  isDirty: boolean | null
  lastCommit: string | null
}

export interface ThreadGitInfo {
  sha?: string | null
  branch?: string | null
  originUrl?: string | null
}

export interface ThreadSummary {
  id: string
  preview: string
  modelProvider: string
  createdAt: number
  cwd: string
  cliVersion: string
  source: string
  gitInfo?: ThreadGitInfo
}

export interface ThreadListResponse {
  data: ThreadSummary[]
  nextCursor: string | null
}

export interface ThreadInfo {
  id: string
  cwd: string
  model?: string
  modelProvider?: string
  preview?: string
  createdAt?: number
  cliVersion?: string
  approvalPolicy?: string
  sandboxPolicy?: SandboxPolicy
  reasoningEffort?: string
  reasoningSummary?: string
  gitInfo?: ThreadGitInfo
}

// Sandbox policy (tagged union from API response)
export type SandboxPolicy =
  | { type: 'readOnly' }
  | {
      type: 'workspaceWrite'
      writableRoots?: string[]
      networkAccess?: boolean
      excludeTmpdirEnvVar?: boolean
      excludeSlashTmp?: boolean
    }
  | { type: 'dangerFullAccess' }
  | { type: 'externalSandbox'; networkAccess?: string }

export interface ThreadStartResponse {
  thread: ThreadInfo
  model: string
  modelProvider: string
  cwd: string
  approvalPolicy: string
  sandbox: SandboxPolicy
  reasoningEffort?: string
  reasoningSummary?: string
}

export interface ThreadResumeResponse {
  thread: ThreadInfo
  items: Array<{ id: string; type: string } & Record<string, unknown>>
}

export interface TurnInfo {
  id: string
  status: string
  items: Array<{ id: string; type: string } & Record<string, unknown>>
  error: { message: string; code?: string } | null
}

export interface TurnStartResponse {
  turn: TurnInfo
}

export interface ServerStatus {
  isRunning: boolean
  version: string | null
}

export interface AccountDetails {
  type: string
  email: string | null
  planType: string | null
}

export interface AccountInfo {
  account: AccountDetails | null
  requiresOpenaiAuth: boolean
}

export interface RateLimitWindow {
  usedPercent: number
  windowDurationMins?: number | null
  resetsAt?: number | null
}

export interface CreditsSnapshot {
  hasCredits: boolean
  unlimited: boolean
  balance?: string | null
}

export interface RateLimitSnapshot {
  primary?: RateLimitWindow | null
  secondary?: RateLimitWindow | null
  credits?: CreditsSnapshot | null
  planType?: string | null
}

export interface AccountRateLimitsResponse {
  rateLimits: RateLimitSnapshot
}

export interface LoginResponse {
  loginType: string
  loginId: string | null
  authUrl: string | null
}

export interface AppPaths {
  appDataDir: string | null
  logDir: string | null
}

export interface LogTailResponse {
  file: string | null
  content: string
  truncated: boolean
}

export interface ReasoningEffortOption {
  reasoningEffort: string
  description: string
}

export interface Model {
  id: string
  model: string
  displayName: string
  description: string
  supportedReasoningEfforts: ReasoningEffortOption[]
  defaultReasoningEffort: string
  isDefault: boolean
}

export interface ModelListResponse {
  data: Model[]
  nextCursor: string | null
}

export interface SkillMetadata {
  name: string
  description: string
  shortDescription?: string | null
  path: string
  scope: string
}

// Skill input for sending with messages
export interface SkillInput {
  name: string
  path: string
}

export interface SkillsListEntry {
  cwd: string
  skills: SkillMetadata[]
  errors: Array<{ path: string; message: string }>
}

export interface SkillsListResponse {
  data: SkillsListEntry[]
}

export interface McpServerStatus {
  name: string
  tools: Record<string, { name: string; description?: string }>
  resources: Array<{ uri: string; name?: string }>
  resourceTemplates: Array<{ uriTemplate: string; name?: string }>
  authStatus: { isAuthenticated: boolean; error?: string } | null
}

export interface McpServerStatusResponse {
  data: McpServerStatus[]
  nextCursor: string | null
}

// Review target types matching CLI presets
export type ReviewTarget =
  | { type: 'uncommittedChanges' }
  | { type: 'baseBranch'; branch: string }
  | { type: 'commit'; sha: string; title?: string }
  | { type: 'custom'; instructions: string }

export interface ReviewStartResponse {
  turn: TurnInfo
  reviewThreadId: string
}

export interface GitDiffResponse {
  isGitRepo: boolean
  diff: string
}

export interface FileEntry {
  path: string
  name: string
  isDir: boolean
}

export interface GitBranch {
  name: string
  isCurrent: boolean
}

export interface GitCommit {
  sha: string
  shortSha: string
  title: string
  author: string
  date: string
}

export interface GitFileStatus {
  path: string
  status: string
  isStaged: boolean
  statusLabel: string
}

export interface GitRemoteInfo {
  remote: string | null
  branch: string | null
  ahead: number
  behind: number
}

export type GhCliStatus = 'ready' | 'not-installed' | 'not-authenticated'

export interface WorktreeInfo {
  path: string
  branch: string
  isMain: boolean
  headCommit: string
}

export interface GitMergeResult {
  success: boolean
  conflictFiles: string[]
  message: string
}

// ==================== Config Types ====================

export interface ConfigLayer {
  name: string
  path?: string
  config: Record<string, string | number | boolean | null>
}

export interface ConfigOrigins {
  [key: string]: {
    layer: string
    path?: string
  }
}

export interface ConfigReadResponse {
  config: Record<string, string | number | boolean | null>
  origins: ConfigOrigins
  layers?: ConfigLayer[]
}

export interface Snapshot {
  id: string
  sessionId: string
  createdAt: number
  snapshotType: string
  metadataJson: string | null
}

// ==================== Thread Metadata Types ====================

export interface ThreadMetadataUpdateParams {
  /** Optional display name for the thread */
  name?: string
  /** Arbitrary key-value tags for the thread */
  tags?: Record<string, string | number | boolean | null>
  /** Whether the thread is pinned */
  pinned?: boolean
  /** Any other metadata fields the app-server accepts */
  [key: string]: unknown
}

export interface ThreadMetadataUpdateResponse {
  threadId: string
  updatedAt: number
}

// ==================== Skill Config Types ====================

export interface SkillConfigWriteParams {
  /** Skill identifier (name or path) */
  skillId: string
  /** Configuration values to write for this skill */
  config: Record<string, string | number | boolean | null>
}

// ==================== Feedback Types ====================

export interface FeedbackData {
  /** Category: "bug" | "improvement" | "other" */
  category: string
  /** Free-form feedback text */
  message: string
  /** Optional thread ID for context */
  threadId?: string
  /** Optional rating (1–5) */
  rating?: number
  /** Optional structured metadata */
  metadata?: Record<string, unknown>
}

export interface FeedbackUploadResponse {
  feedbackId: string
  receivedAt: number
}

// ==================== App Integration Types ====================

export interface ConnectedApp {
  id: string
  name: string
  displayName: string
  /** Editor or integration type, e.g. "vscode", "cursor", "zed" */
  type: string
  /** Whether the app is currently reachable */
  isConnected: boolean
  /** Optional path to the app executable */
  executablePath?: string | null
  /** App version string, if available */
  version?: string | null
}

export interface AppListResponse {
  data: ConnectedApp[]
}

// ==================== Project API ====================

export const projectApi = {
  list: () => invokeOrFallback<Project[]>([], 'list_projects'),

  add: (path: string) => invoke<Project>('add_project', { path }),

  remove: (id: string) => invoke<void>('remove_project', { id }),

  update: (id: string, displayName?: string, settings?: Record<string, unknown>) =>
    invoke<Project>('update_project', { id, displayName, settings }),

  getGitInfo: (path: string) =>
    withCache(
      `${CACHE_KEYS.GIT_INFO}:${path}`,
      () => invokeOrFallback<GitInfo>(
        { isGitRepo: false, branch: null, isDirty: null, lastCommit: null },
        'get_project_git_info',
        { path }
      ),
      CACHE_TTL.GIT_INFO
    ),
  getGitDiff: (path: string) =>
    isTauriAvailable()
      ? invokeWithTimeout<GitDiffResponse>('get_project_git_diff', { path }, 20000) // 20s timeout for git diff
      : Promise.resolve({ diff: null, isGitRepo: false }),
  getGitDiffStaged: (path: string) =>
    isTauriAvailable()
      ? invokeWithTimeout<GitDiffResponse>('git_diff_staged', { path }, 20000)
      : Promise.resolve({ diff: null, isGitRepo: false }),
  gitDiffBranch: (projectPath: string, baseBranch: string) =>
    invokeWithTimeout<string>('git_diff_branch', { projectPath, baseBranch }, 20000),
  listFiles: (path: string, query?: string, limit?: number) =>
    isTauriAvailable()
      ? invoke<FileEntry[]>('list_project_files', { path, query, limit })
      : Promise.reject(new Error('Unavailable in web mode')),
  validateDirectory: (path: string) =>
    invoke<string>('validate_project_directory', { path }),
  readProjectFile: (projectId: string, relativePath: string) =>
    isTauriAvailable()
      ? invoke<number[]>('read_project_file', { projectId, relativePath })
      : Promise.reject(new Error('Unavailable in web mode')),
  getGitBranches: (path: string) => invoke<GitBranch[]>('get_git_branches', { path }),
  getGitCommits: (path: string, limit?: number) =>
    invoke<GitCommit[]>('get_git_commits', { path, limit }),
  gitStatus: (path: string) =>
    invokeOrFallback<GitFileStatus[]>([], 'git_status', { path }),
  gitStageFiles: (path: string, files: string[]) =>
    invoke<void>('git_stage_files', { path, files }),
  gitUnstageFiles: (path: string, files: string[]) =>
    invoke<void>('git_unstage_files', { path, files }),
  gitCommit: (path: string, message: string) =>
    invoke<string>('git_commit', { path, message }),
  gitPush: (path: string, remote: string, branch: string) =>
    invoke<void>('git_push', { path, remote, branch }),
  gitRemoteInfo: (path: string) =>
    invokeOrFallback<GitRemoteInfo>(
      { remote: null, branch: null, ahead: 0, behind: 0 },
      'git_remote_info',
      { path }
    ),
  // PR operations
  checkGhCli: (projectPath: string) =>
    invokeOrFallback<GhCliStatus>('not-installed', 'check_gh_cli', { projectPath }),
  getCurrentBranch: (projectPath: string) =>
    invoke<string>('get_current_branch', { projectPath }),
  createPullRequest: (
    projectPath: string,
    title: string,
    body: string,
    baseBranch: string,
    headBranch: string,
    draft: boolean
  ) =>
    invokeWithTimeout<string>(
      'create_pull_request',
      { projectPath, title, body, baseBranch, headBranch, draft },
      30000
    ),

  // Patch operations
  gitApplyPatch: (projectPath: string, patch: string, cached: boolean, reverse = false) =>
    invoke<void>('git_apply_patch', { projectPath, patch, cached, reverse }),

  // Worktree operations
  createWorktree: (projectPath: string, branchName: string, worktreePath?: string) =>
    invoke<WorktreeInfo>('create_worktree', { projectPath, branchName, worktreePath }),
  removeWorktree: (projectPath: string, worktreePath: string) =>
    invoke<void>('remove_worktree', { projectPath, worktreePath }),
  listWorktrees: (projectPath: string) =>
    invokeOrFallback<WorktreeInfo[]>([], 'list_worktrees', { projectPath }),

  // Swarm git operations
  gitCheckoutBranch: (projectPath: string, branchName: string) =>
    invoke<void>('git_checkout_branch', { projectPath, branchName }),
  gitMergeNoFf: (projectPath: string, branchName: string, message: string) =>
    invoke<GitMergeResult>('git_merge_no_ff', { projectPath, branchName, message }),
}

// ==================== Session API ====================

export const sessionApi = {
  list: (projectId: string) =>
    invokeOrFallback<SessionMetadata[]>([], 'list_sessions', { projectId }),

  get: (sessionId: string) =>
    invoke<SessionMetadata | null>('get_session', { sessionId }),

  /**
   * Update session metadata
   * @param sessionId - The session ID to update
   * @param projectId - Optional project ID (required when creating new session metadata)
   * @param title - Optional title
   * @param tags - Optional tags array
   * @param isFavorite - Optional favorite flag
   * @param isArchived - Optional archived flag
   * @param status - Optional session status
   * @param firstMessage - Optional first message
   * @param tasksJson - Optional tasks JSON string
   */
  update: (
    sessionId: string,
    title?: string,
    tags?: string[],
    isFavorite?: boolean,
    isArchived?: boolean,
    status?: SessionStatus,
    firstMessage?: string,
    tasksJson?: string,
    projectId?: string
  ) =>
    invoke<SessionMetadata>('update_session_metadata', {
      sessionId,
      projectId,
      title,
      tags,
      isFavorite,
      isArchived,
      status,
      firstMessage,
      tasksJson,
    }),

  delete: (sessionId: string) =>
    invoke<void>('delete_session', { sessionId }),

  /**
   * Search sessions across all projects with relevance scoring
   * Results are sorted by relevance score (descending):
   * - Exact title match: 100 points
   * - Title prefix match: 80 points
   * - Title contains match: 60 points
   * - firstMessage match: 40-50 points
   * - Tag match: 30-35 points
   * - sessionId match: 10 points
   * - Favorites bonus: +5 points
   */
  search: (query: string, tagsFilter?: string[], favoritesOnly?: boolean) =>
    invoke<SessionMetadata[]>('search_sessions', { query, tagsFilter, favoritesOnly }),

  // Lightweight status update
  updateStatus: (sessionId: string, status: SessionStatus) =>
    invoke<void>('update_session_status', { sessionId, status }),

  // Set first message (only if not already set)
  setFirstMessage: (sessionId: string, firstMessage: string) =>
    invoke<void>('set_session_first_message', { sessionId, firstMessage }),

  // Update tasks for progress tracking
  updateTasks: (sessionId: string, tasks: TaskItem[]) => {
    try {
      const tasksJson = JSON.stringify(tasks)
      return invoke<void>('update_session_tasks', { sessionId, tasksJson })
    } catch (e) {
      log.error(`Failed to serialize tasks: ${e}`, 'API')
      return invoke<void>('update_session_tasks', { sessionId, tasksJson: '[]' })
    }
  },
}

// ==================== Thread API ====================

export const threadApi = {
  list: (limit?: number, cursor?: string) =>
    invoke<ThreadListResponse>('list_threads', { limit, cursor }),

  start: (
    projectId: string,
    cwd: string,
    model?: string,
    sandbox?: string,
    approvalPolicy?: string,
    options?: {
      baseInstructions?: string
      developerInstructions?: string
      config?: Record<string, unknown>
    }
  ) =>
    invoke<ThreadStartResponse>('start_thread', {
      projectId,
      cwd,
      // Only send non-empty values
      model: model || undefined,
      sandbox: sandbox || undefined,
      approvalPolicy: approvalPolicy || undefined,
      baseInstructions: options?.baseInstructions || undefined,
      developerInstructions: options?.developerInstructions || undefined,
      config: options?.config,
    }),

  resume: (threadId: string) =>
    invokeWithTimeout<ThreadResumeResponse>('resume_thread', { threadId }, 45000), // 45s timeout for resume

  sendMessage: (
    threadId: string,
    text: string,
    images?: string[],
    skills?: SkillInput[],
    options?: {
      effort?: string
      summary?: string
      model?: string
      approvalPolicy?: string
      sandboxPolicy?: string
    }
  ) =>
    invokeWithTimeout<TurnStartResponse>(
      'send_message',
      {
        threadId,
        text,
        images,
        skills,
        ...options,
      },
      60000 // 60s timeout for sendMessage (can involve complex processing)
    ),

  interrupt: (threadId: string) =>
    invoke<void>('interrupt_turn', { threadId }),

  respondToApproval: (
    threadId: string,
    itemId: string,
    decision: 'accept' | 'acceptForSession' | 'acceptWithExecpolicyAmendment' | 'decline' | 'cancel',
    requestId: number,
    execpolicyAmendment?: { command: string[] } | null
  ) =>
    invoke<void>('respond_to_approval', {
      threadId,
      itemId,
      decision,
      requestId,
      execpolicyAmendment,
    }),

  fork: (threadId: string, cwd?: string) =>
    invoke<ThreadStartResponse>('fork_thread', { threadId, cwd }),

  archive: (threadId: string) =>
    invoke<void>('archive_thread', { threadId }),

  unarchive: (threadId: string) =>
    invoke<void>('unarchive_thread', { threadId }),

  compact: (threadId: string) =>
    invoke<void>('compact_thread', { threadId }),

  read: (threadId: string, limit?: number, cursor?: string) =>
    invoke<ThreadResumeResponse>('read_thread', { threadId, limit, cursor }),

  setName: (threadId: string, name: string) =>
    invoke<void>('set_thread_name', { threadId, name }),

  rollback: (threadId: string, numTurns: number) =>
    invoke<void>('rollback_thread', { threadId, numTurns }),

  steer: (threadId: string, text: string) =>
    invoke<void>('steer_turn', { threadId, text }),

  cancelLogin: () =>
    invoke<void>('cancel_login'),

  listFiltered: (params: {
    limit?: number
    cursor?: string
    modelProviders?: string[]
    sourceKinds?: string[]
    archived?: boolean
    cwd?: string
    searchTerm?: string
    sortKey?: string
  }) =>
    invoke<ThreadListResponse>('list_threads_filtered', params),

  /**
   * Update arbitrary metadata on a thread (app-server `thread/metadata/update`).
   * TODO: Requires Rust command `update_thread_metadata` in thread.rs that
   *       proxies to `thread/metadata/update` via send_request().
   */
  updateMetadata: (threadId: string, metadata: ThreadMetadataUpdateParams) =>
    // TODO: replace with invoke<ThreadMetadataUpdateResponse>('update_thread_metadata', { threadId, ...metadata })
    //       once the Rust backend command is implemented.
    invokeOrFallback<ThreadMetadataUpdateResponse>(
      { threadId, updatedAt: Date.now() },
      'update_thread_metadata',
      { threadId, ...metadata }
    ),
}

// ==================== Snapshot API ====================

export const snapshotApi = {
  create: (sessionId: string, projectPath: string) =>
    invokeWithTimeout<Snapshot>('create_snapshot', { sessionId, projectPath }, 45000), // 45s timeout for snapshot creation

  revert: (snapshotId: string, projectPath: string) =>
    invokeWithTimeout<void>('revert_to_snapshot', { snapshotId, projectPath }, 45000), // 45s timeout for snapshot revert

  list: (sessionId: string) =>
    invoke<Snapshot[]>('list_snapshots', { sessionId }),
}

// ==================== App Server API ====================

export const serverApi = {
  getStatus: () =>
    withCache(
      CACHE_KEYS.SERVER_STATUS,
      () => invokeOrFallback<ServerStatus>({ isRunning: false, version: null }, 'get_server_status'),
      CACHE_TTL.SERVER_STATUS
    ),

  restart: () => (isTauriAvailable() ? invoke<void>('restart_server') : Promise.resolve()),

  getAccountInfo: () =>
    withCache(
      CACHE_KEYS.ACCOUNT_INFO,
      () => invokeOrFallback<AccountInfo>({ account: null, requiresOpenaiAuth: false }, 'get_account_info'),
      CACHE_TTL.ACCOUNT_INFO
    ),

  getAccountRateLimits: () =>
    withCache(
      CACHE_KEYS.RATE_LIMITS,
      () => invokeOrFallback<AccountRateLimitsResponse>({ rateLimits: {} }, 'get_account_rate_limits'),
      CACHE_TTL.RATE_LIMITS
    ),

  startLogin: (loginType: 'chatgpt' | 'apiKey' = 'chatgpt', apiKey?: string) =>
    invoke<LoginResponse>('start_login', { loginType, apiKey }),

  /**
   * Log out of account
   * P2.2: Clear all caches on logout to ensure correct state reset
   */
  logout: async () => {
    const result = await invoke<void>('logout')
    clearAllCache() // Clear all caches
    return result
  },

  /**
   * Get available models list
   * P2.2: Add 5-minute cache since models rarely change
   */
  getModels: () =>
    withCache(
      CACHE_KEYS.MODELS,
      () => invokeOrFallback<ModelListResponse>({ data: [], nextCursor: null }, 'get_models'),
      CACHE_TTL.MODELS
    ),

  /**
   * Get skills list
   * P2.2: Add 1-minute cache with force-reload support
   * @param cwds Working directory list
   * @param forceReload Whether to force reload (clear cache)
   */
  listSkills: (cwds: string[], forceReload = false, projectId?: string) => {
    // Use cwds and projectId as part of cache key to isolate caches per project
    const sortedCwds = [...cwds].sort()
    const scope = projectId ?? `cwd:${sortedCwds.join(',')}`
    const cacheKey = `${CACHE_KEYS.SKILLS}:${scope}:${sortedCwds.join(',')}`
    if (forceReload) {
      clearCache(cacheKey)
    }
    return withCache(
      cacheKey,
      () => invokeOrFallback<SkillsListResponse>({ data: [] }, 'list_skills', { cwds, forceReload }),
      CACHE_TTL.SKILLS
    )
  },

  /**
   * Get MCP servers list
   * P2.2: Add 2-minute cache since MCP server config is relatively stable
   */
  listMcpServers: () =>
    withCache(
      CACHE_KEYS.MCP_SERVERS,
      () => invokeOrFallback<McpServerStatusResponse>({ data: [], nextCursor: null }, 'list_mcp_servers'),
      CACHE_TTL.MCP_SERVERS
    ),

  startReview: (threadId: string, target?: ReviewTarget) =>
    invokeWithTimeout<ReviewStartResponse>('start_review', { threadId, target }, 60000), // 60s timeout for review start

  // Run a local shell command (like CLI's ! prefix)
  runUserShellCommand: (threadId: string, command: string) =>
    invokeWithTimeout<TurnStartResponse>('run_user_shell_command', { threadId, command }, 60000), // 60s timeout for shell commands
}

// ==================== Config API ====================

export const configApi = {
  read: (includeLayers?: boolean) =>
    invoke<ConfigReadResponse>('read_config', { includeLayers }),

  write: (key: string, value: string | number | boolean | null) =>
    invoke<void>('write_config', { key, value }),
}

// ==================== Model API ====================
// Re-exposes serverApi.getModels() under a dedicated namespace for callers
// that follow the official Codex naming convention (model/list).

export const modelApi = {
  /**
   * List available models (proxies to app-server `model/list`).
   * Results are cached for 5 minutes — use serverApi.getModels() directly
   * when you need the same cached call from existing code.
   */
  list: () => serverApi.getModels(),
}

// ==================== Skills API ====================
// Re-exposes serverApi.listSkills() and adds the missing skills/config/write.
// TODO: Rust backend command `write_skill_config` needs to be implemented in
//       src-tauri/src/commands/app_server.rs to proxy `skills/config/write`.

export const skillsApi = {
  /**
   * List skills for one or more working directories (proxies to app-server
   * `skills/list`).  For existing code, serverApi.listSkills() is equivalent.
   */
  list: (cwds: string[], forceReload = false, projectId?: string) =>
    serverApi.listSkills(cwds, forceReload, projectId),

  /**
   * Write configuration for a specific skill (app-server `skills/config/write`).
   * TODO: Requires Rust command `write_skill_config` in app_server.rs.
   */
  writeConfig: (skillId: string, config: Record<string, string | number | boolean | null>) =>
    // TODO: replace with invoke<void>('write_skill_config', { skillId, config })
    //       once the Rust backend command is implemented.
    invokeOrFallback<void>(
      undefined,
      'write_skill_config',
      { skillId, config }
    ),
}

// ==================== Feedback API ====================
// TODO: Rust backend command `upload_feedback` needs to be implemented in
//       src-tauri/src/commands/app_server.rs to proxy `feedback/upload`.

export const feedbackApi = {
  /**
   * Upload user feedback to the app-server (`feedback/upload`).
   * TODO: Requires Rust command `upload_feedback` in app_server.rs.
   */
  upload: (data: FeedbackData) =>
    // TODO: replace with invokeWithTimeout<FeedbackUploadResponse>('upload_feedback', { ...data }, 15000)
    //       once the Rust backend command is implemented.
    invokeOrFallback<FeedbackUploadResponse>(
      { feedbackId: '', receivedAt: Date.now() },
      'upload_feedback',
      { ...data }
    ),
}

// ==================== App Integration API ====================
// TODO: Rust backend command `list_connected_apps` needs to be implemented in
//       src-tauri/src/commands/app_server.rs to proxy `app/list`.

export const appApi = {
  /**
   * List connected editor / app integrations (app-server `app/list`).
   * TODO: Requires Rust command `list_connected_apps` in app_server.rs.
   */
  list: () =>
    // TODO: replace with invoke<AppListResponse>('list_connected_apps')
    //       once the Rust backend command is implemented.
    invokeOrFallback<AppListResponse>(
      { data: [] },
      'list_connected_apps'
    ),
}

// ==================== Allowlist API ====================

export const allowlistApi = {
  get: (projectId: string) =>
    invoke<string[]>('get_allowlist', { projectId }),

  add: (projectId: string, commandPattern: string) =>
    invoke<void>('add_to_allowlist', { projectId, commandPattern }),

  remove: (projectId: string, commandPattern: string) =>
    invoke<void>('remove_from_allowlist', { projectId, commandPattern }),
}

// ==================== Lifecycle API ====================

export const lifecycleApi = {
  rendererReady: () =>
    invokeOrFallback<void>(undefined, 'renderer_ready'),

  rendererHeartbeat: () =>
    invokeOrFallback<void>(undefined, 'renderer_heartbeat'),
}

// ==================== System API (Keep Awake) ====================

export const systemApi = {
  startKeepAwake: () => invoke<void>('start_keep_awake'),
  stopKeepAwake: () => invoke<void>('stop_keep_awake'),
  isKeepAwakeActive: () => invokeOrFallback<boolean>(false, 'is_keep_awake_active'),
  getAppPaths: () => invokeOrFallback<AppPaths>({ appDataDir: null, logDir: null }, 'get_app_paths'),
  getLogTail: (maxBytes?: number) =>
    invokeOrFallback<LogTailResponse>({ file: null, content: '', truncated: false }, 'get_log_tail', { maxBytes }),
}

// ==================== Codex CLI Import Types ====================

export interface CodexProject {
  trustLevel?: string
  model?: string
  instructions?: string
}

export interface CodexConfig {
  model?: string
  modelReasoningEffort?: string
  projects: Record<string, CodexProject>
  mcpServers: Record<string, unknown>
}

export interface CodexSessionSummary {
  id: string
  filePath: string
  timestamp: string
  cwd: string
  projectName: string
  cliVersion: string
  gitBranch?: string
  gitCommit?: string
  firstMessage?: string
  messageCount: number
  fileSize: number
}

export interface CodexSessionMeta {
  id: string
  timestamp: string
  cwd: string
  originator: string
  cliVersion: string
  instructions: string
  source: string
  modelProvider: string
  git?: {
    commitHash?: string
    branch?: string
  }
}

export interface CodexSessionMessage {
  timestamp: string
  messageType: string
  role?: string
  content: unknown
}

export interface CodexSession {
  id: string
  filePath: string
  timestamp: string
  cwd: string
  projectName: string
  cliVersion: string
  gitBranch?: string
  gitCommit?: string
  firstMessage?: string
  messageCount: number
  fileSize: number
  meta: CodexSessionMeta
  messages: CodexSessionMessage[]
}

// ==================== Codex CLI Import API ====================

export const codexImportApi = {
  /**
   * Get Codex CLI directory path (~/.codex)
   */
  getCodexDir: () => invoke<string>('get_codex_dir'),

  /**
   * Read Codex CLI configuration from ~/.codex/config.toml
   */
  getConfig: () => invoke<CodexConfig>('get_codex_config'),

  /**
   * List all Codex CLI sessions from ~/.codex/sessions/
   * Returns sessions sorted by timestamp (most recent first)
   */
  listSessions: () =>
    withCache(
      'codex_cli_sessions',
      () => invoke<CodexSessionSummary[]>('list_codex_sessions'),
      60000 // 1 minute cache
    ),

  /**
   * Get full session details including all messages
   */
  getSession: (sessionId: string) =>
    invoke<CodexSession>('get_codex_session', { sessionId }),

  /**
   * Search Codex CLI sessions by keyword
   */
  searchSessions: (query: string, limit?: number) =>
    invoke<CodexSessionSummary[]>('search_codex_sessions', { query, limit }),

  /**
   * Delete a Codex CLI session file
   */
  deleteSession: (sessionId: string) =>
    invoke<void>('delete_codex_session', { sessionId }),
}

// ==================== Terminal API ====================

export interface TerminalOutput {
  exitCode: number | null
}

export const terminalApi = {
  execute: (cwd: string, command: string) =>
    invokeWithTimeout<TerminalOutput>('execute_terminal_command', { cwd, command }, 120000), // 2 minute timeout for terminal commands
}

// ==================== Automation API ====================

export interface Automation {
  id: string
  name: string
  prompt: string
  project_id: string
  schedule: { cron: string; timezone?: string } | null
  enabled: boolean
  last_run_at: string | null
  run_count: number
  created_at: string
}

export interface AutomationRun {
  id: string
  automation_id: string
  status: string
  started_at: string
  completed_at: string | null
  result_summary: string | null
  thread_id: string | null
}

export const automationApi = {
  list: () =>
    invoke<Automation[]>('list_automations'),

  create: (name: string, prompt: string, projectId: string, scheduleCron?: string, scheduleTimezone?: string) =>
    invoke<Automation>('create_automation', { name, prompt, projectId, scheduleCron, scheduleTimezone }),

  update: (id: string, updates: { name?: string; prompt?: string; scheduleCron?: string; scheduleTimezone?: string; enabled?: boolean }) =>
    invoke<void>('update_automation', { id, ...updates }),

  delete: (id: string) =>
    invoke<void>('delete_automation', { id }),

  runNow: (id: string) =>
    invoke<AutomationRun>('run_automation_now', { id }),

  listRuns: (automationId: string) =>
    invoke<AutomationRun[]>('list_automation_runs', { automationId }),
}

// ==================== Cache Utilities (P2.2) ====================
// Re-export cache utilities for use by other modules
export { clearCache, clearAllCache, getCacheStats, CACHE_KEYS, CACHE_TTL } from './apiCache'
