import { useCallback, useEffect, useMemo, useState } from 'react'
import { FolderOpen, RefreshCw, SquareTerminal, Code2, Trash2, GitBranch } from 'lucide-react'

import { SettingsSection, SettingsCard, SettingsList, SettingsRow } from '../../components/settings/SettingsLayout'
import { useProjectsStore } from '../../stores/projects'
import { projectApi, type WorktreeInfo } from '../../lib/api'
import { parseError } from '../../lib/errorUtils'
import { isTauriAvailable } from '../../lib/tauri'
import { revealInFinder, openInTerminal, openInVSCode } from '../../lib/hostActions'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { BaseDialog } from '../../components/ui/BaseDialog'
import { useToast } from '../../components/ui/useToast'
import { cn } from '../../lib/utils'

export function WorktreesSettingsPage() {
  const selectedProjectId = useProjectsStore((state) => state.selectedProjectId)
  const projects = useProjectsStore((state) => state.projects)
  const { toast } = useToast()
  const tauriAvailable = isTauriAvailable()

  const projectPath = useMemo(() => {
    if (!selectedProjectId) return null
    const project = projects.find((p) => p.id === selectedProjectId)
    return project?.path ?? null
  }, [projects, selectedProjectId])

  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [branchName, setBranchName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [worktreeToRemove, setWorktreeToRemove] = useState<WorktreeInfo | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const suggestedWorktreePath = useMemo(() => {
    if (!projectPath) return ''
    const branch = branchName.trim()
    if (!branch) return ''
    const safeBranch = branch.replace(/\//g, '-')
    const parent = projectPath.replace(/\/[^/]+$/, '')
    return `${parent}/.worktrees/${safeBranch}`
  }, [branchName, projectPath])

  const requireTauri = useCallback((): boolean => {
    if (isTauriAvailable()) return true
    toast.error('Unavailable in web mode')
    return false
  }, [toast])

  const refresh = useCallback(async () => {
    if (!projectPath) return
    setIsLoading(true)
    setError(null)
    try {
      const list = await projectApi.listWorktrees(projectPath)
      setWorktrees(list)
    } catch (err) {
      setWorktrees([])
      setError(parseError(err))
    } finally {
      setIsLoading(false)
    }
  }, [projectPath])

  useEffect(() => {
    if (!projectPath) {
      setWorktrees([])
      setError(null)
      setIsLoading(false)
      return
    }
    void refresh()
  }, [projectPath, refresh])

  const handleCreate = useCallback(async () => {
    const branch = branchName.trim()
    if (!branch) {
      toast.error('Branch name is required')
      return
    }
    if (!projectPath) {
      toast.error('No project selected')
      return
    }
    if (!requireTauri()) return

    setIsCreating(true)
    try {
      await projectApi.createWorktree(projectPath, branch, suggestedWorktreePath || undefined)
      toast.success('Worktree created')
      setBranchName('')
      await refresh()
    } catch (err) {
      toast.error('Failed to create worktree', { message: parseError(err) })
    } finally {
      setIsCreating(false)
    }
  }, [branchName, projectPath, refresh, requireTauri, suggestedWorktreePath, toast])

  const handleReveal = useCallback(async (path: string) => {
    if (!requireTauri()) return
    try {
      await revealInFinder(path)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reveal in Finder')
    }
  }, [requireTauri, toast])

  const handleOpenTerminal = useCallback(async (path: string) => {
    if (!requireTauri()) return
    try {
      await openInTerminal(path)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open in Terminal')
    }
  }, [requireTauri, toast])

  const handleOpenVSCode = useCallback(async (path: string) => {
    if (!requireTauri()) return
    try {
      await openInVSCode(path)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open in VS Code')
    }
  }, [requireTauri, toast])

  const openRemoveDialog = useCallback((wt: WorktreeInfo) => {
    setWorktreeToRemove(wt)
    setRemoveDialogOpen(true)
  }, [])

  const confirmRemove = useCallback(async () => {
    if (!projectPath || !worktreeToRemove) return
    if (!requireTauri()) return

    setIsRemoving(true)
    try {
      await projectApi.removeWorktree(projectPath, worktreeToRemove.path)
      toast.success('Worktree removed')
      setRemoveDialogOpen(false)
      setWorktreeToRemove(null)
      await refresh()
    } catch (err) {
      toast.error('Failed to remove worktree', { message: parseError(err) })
    } finally {
      setIsRemoving(false)
    }
  }, [projectPath, refresh, requireTauri, toast, worktreeToRemove])

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Worktrees"
        description="Manage git worktrees for the selected project."
      >
        <SettingsCard>
          <SettingsList>
            {!projectPath ? (
              <SettingsRow
                title="Select a project"
                description="Choose a project in the sidebar to manage its git worktrees."
                align="start"
              >
                <Button variant="outline" size="sm" disabled>
                  No project selected
                </Button>
              </SettingsRow>
            ) : (
              <SettingsRow
                title="Create worktree"
                description="Creates a new git worktree and branch under .worktrees/."
                align="start"
              >
                <div className="w-full max-w-[440px] space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="feature/my-task"
                      inputSize="sm"
                      aria-label="Branch name"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      loading={isCreating}
                      disabled={!tauriAvailable || !branchName.trim() || isLoading}
                      onClick={() => void handleCreate()}
                      title={tauriAvailable ? 'Create worktree' : 'Unavailable in web mode'}
                    >
                      Create
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void refresh()}
                      disabled={isLoading}
                      title="Refresh"
                    >
                      <RefreshCw size={14} />
                    </Button>
                  </div>
                  {suggestedWorktreePath && (
                    <div className="text-[11px] text-text-3 font-mono truncate" title={suggestedWorktreePath}>
                      {suggestedWorktreePath}
                    </div>
                  )}
                  {error && (
                    <div className="text-[11px] text-status-error">{error}</div>
                  )}
                  {isLoading && (
                    <div className="text-[11px] text-text-3">Loading worktrees...</div>
                  )}
                </div>
              </SettingsRow>
            )}

            {projectPath && worktrees.length > 0 && (
              <SettingsRow
                title={`Worktrees (${worktrees.length})`}
                description="Detected git worktrees for the selected project."
                align="start"
              >
                <div className="w-full space-y-2">
                  {worktrees.map((wt) => (
                    <div
                      key={wt.path}
                      className="flex items-center justify-between gap-3 rounded-md border border-stroke/20 bg-surface-hover/[0.04] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <GitBranch size={14} className="text-text-3 flex-shrink-0" />
                          <span className="truncate text-xs font-semibold text-text-1" title={wt.branch}>
                            {wt.branch}
                          </span>
                          {wt.isMain && (
                            <span className="rounded-xs border border-stroke/20 bg-surface-hover/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-text-2">
                              MAIN
                            </span>
                          )}
                        </div>
                        <div className="mt-1 truncate text-[11px] text-text-3 font-mono" title={wt.path}>
                          {wt.path}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          className={cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded-sm border border-stroke/20 bg-surface-solid text-text-2',
                            'hover:bg-surface-hover/[0.08] hover:text-text-1 transition-colors'
                          )}
                          onClick={() => void handleReveal(wt.path)}
                          disabled={!tauriAvailable}
                          title="Reveal in Finder"
                        >
                          <FolderOpen size={14} />
                        </button>
                        <button
                          type="button"
                          className={cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded-sm border border-stroke/20 bg-surface-solid text-text-2',
                            'hover:bg-surface-hover/[0.08] hover:text-text-1 transition-colors'
                          )}
                          onClick={() => void handleOpenTerminal(wt.path)}
                          disabled={!tauriAvailable}
                          title="Open in Terminal"
                        >
                          <SquareTerminal size={14} />
                        </button>
                        <button
                          type="button"
                          className={cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded-sm border border-stroke/20 bg-surface-solid text-text-2',
                            'hover:bg-surface-hover/[0.08] hover:text-text-1 transition-colors'
                          )}
                          onClick={() => void handleOpenVSCode(wt.path)}
                          disabled={!tauriAvailable}
                          title="Open in VS Code"
                        >
                          <Code2 size={14} />
                        </button>
                        <button
                          type="button"
                          className={cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded-sm border border-stroke/20 bg-surface-solid text-text-2',
                            'hover:bg-destructive/10 hover:text-destructive transition-colors'
                          )}
                          onClick={() => openRemoveDialog(wt)}
                          disabled={!tauriAvailable}
                          title="Remove worktree"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </SettingsRow>
            )}

            {projectPath && !isLoading && !error && worktrees.length === 0 && (
              <SettingsRow
                title="No worktrees found"
                description="Create one above or start a new worktree session to populate this list."
                align="start"
              >
                <span className="text-xs text-text-3"> </span>
              </SettingsRow>
            )}
          </SettingsList>
        </SettingsCard>
      </SettingsSection>

      <BaseDialog
        isOpen={removeDialogOpen}
        onClose={() => {
          if (isRemoving) return
          setRemoveDialogOpen(false)
          setWorktreeToRemove(null)
        }}
        title="Remove worktree"
        description="Confirm removing this worktree."
        maxWidth="md"
        variant="danger"
        footer={
          <div className="flex items-center justify-end gap-2 px-6 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRemoveDialogOpen(false)
                setWorktreeToRemove(null)
              }}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={isRemoving}
              onClick={() => void confirmRemove()}
            >
              Remove
            </Button>
          </div>
        }
      >
        <div className="px-6 py-5 space-y-3">
          <p className="text-[13px] text-text-1">
            This will remove the worktree directory and detach it from the repository.
          </p>
          <div className="rounded-md border border-stroke/20 bg-background px-3 py-2">
            <div className="text-[11px] text-text-3">Branch</div>
            <div className="text-xs font-semibold text-text-1">{worktreeToRemove?.branch ?? '-'}</div>
            <div className="mt-2 text-[11px] text-text-3">Path</div>
            <div className="text-[11px] text-text-2 font-mono break-all">{worktreeToRemove?.path ?? '-'}</div>
          </div>
          <p className="text-[12px] text-text-3">
            Tip: if the branch is still needed, keep it and only remove the worktree.
          </p>
        </div>
      </BaseDialog>
    </div>
  )
}
