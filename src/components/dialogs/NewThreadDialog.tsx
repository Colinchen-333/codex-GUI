import { useState, useCallback } from 'react'
import { GitBranch, Monitor, Loader2, AlertCircle } from 'lucide-react'
import { BaseDialog } from '../ui/BaseDialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { projectApi } from '../../lib/api'
import { cn } from '../../lib/utils'

type ThreadMode = 'local' | 'worktree'

interface NewThreadDialogProps {
  isOpen: boolean
  onClose: () => void
  projectPath: string | null
  onCreateLocal: () => void
  onCreateWorktree: (branchName: string, worktreePath: string) => void
}

const modes: { id: ThreadMode; label: string; icon: typeof Monitor; description: string; disabled?: boolean }[] = [
  {
    id: 'local',
    label: 'Local',
    icon: Monitor,
    description: 'Work directly in the current project directory.',
  },
  {
    id: 'worktree',
    label: 'Worktree',
    icon: GitBranch,
    description: 'Create an isolated git worktree with a new branch.',
  },
]

export function NewThreadDialog({
  isOpen,
  onClose,
  projectPath,
  onCreateLocal,
  onCreateWorktree,
}: NewThreadDialogProps) {
  const [selectedMode, setSelectedMode] = useState<ThreadMode>('local')
  const [branchName, setBranchName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetState = useCallback(() => {
    setSelectedMode('local')
    setBranchName('')
    setIsCreating(false)
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [onClose, resetState])

  const generateWorktreePath = useCallback((branch: string): string => {
    if (!projectPath) return ''
    const safeBranch = branch.replace(/\//g, '-')
    const parent = projectPath.replace(/\/[^/]+$/, '')
    return `${parent}/.worktrees/${safeBranch}`
  }, [projectPath])

  const handleCreate = useCallback(async () => {
    setError(null)

    if (selectedMode === 'local') {
      onCreateLocal()
      handleClose()
      return
    }

    if (selectedMode === 'worktree') {
      if (!branchName.trim()) {
        setError('Branch name is required')
        return
      }

      if (!projectPath) {
        setError('No project selected')
        return
      }

      setIsCreating(true)
      try {
        const worktreePath = generateWorktreePath(branchName)
        const result = await projectApi.createWorktree(projectPath, branchName, worktreePath)
        onCreateWorktree(result.branch, result.path)
        handleClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setIsCreating(false)
      }
    }
  }, [selectedMode, branchName, projectPath, onCreateLocal, onCreateWorktree, handleClose, generateWorktreePath])

  const worktreePath = branchName.trim() ? generateWorktreePath(branchName.trim()) : ''

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="New Session"
      maxWidth="md"
    >
      <div className="px-6 py-5 space-y-5">
        {/* Mode selector tabs */}
        <div className="flex gap-2">
          {modes.map((mode) => {
            const Icon = mode.icon
            const isSelected = selectedMode === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => !mode.disabled && setSelectedMode(mode.id)}
                disabled={mode.disabled}
                title={mode.disabled ? 'Unavailable' : undefined}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isSelected
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : mode.disabled
                      ? 'text-text-3/50 cursor-not-allowed border border-stroke/10'
                      : 'text-text-2 hover:text-text-1 hover:bg-surface-hover/[0.08] border border-stroke/20',
                )}
              >
                <Icon size={16} />
                <span>{mode.label}</span>
                {mode.disabled && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover/[0.12] text-text-3">
                    Unavailable
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Mode description */}
        <p className="text-sm text-text-3">
          {modes.find((m) => m.id === selectedMode)?.description}
        </p>

        {/* Worktree mode form */}
        {selectedMode === 'worktree' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="branch-name" className="block text-sm font-medium text-text-2 mb-1.5">
                Branch Name
              </label>
              <Input
                id="branch-name"
                placeholder="feature/my-new-feature"
                value={branchName}
                onChange={(e) => {
                  setBranchName(e.target.value)
                  setError(null)
                }}
                error={!!error}
                disabled={isCreating}
                icon={<GitBranch size={14} />}
              />
            </div>

            {worktreePath && (
              <div>
                <label className="block text-sm font-medium text-text-3 mb-1">
                  Worktree Path
                </label>
                <div className="px-3 py-2 rounded-lg bg-surface/50 border border-stroke/10 text-xs text-text-3 font-mono truncate">
                  {worktreePath}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-status-error">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stroke/20">
        <Button variant="ghost" onClick={handleClose} disabled={isCreating}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleCreate}
          loading={isCreating}
          disabled={selectedMode === 'worktree' && !branchName.trim()}
        >
          {isCreating ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Creating...
            </>
          ) : selectedMode === 'worktree' ? (
            'Create Worktree'
          ) : (
            'Create Session'
          )}
        </Button>
      </div>
    </BaseDialog>
  )
}
