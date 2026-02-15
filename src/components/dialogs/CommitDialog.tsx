import { useState, useEffect, useCallback, useRef } from 'react'
import { GitBranch, GitCommit as GitCommitIcon, GitPullRequest, Upload, X, Check, FileText, Plus, Minus, CircleDot, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useProjectsStore } from '../../stores/projects'
import { projectApi, type GitFileStatus, type GitRemoteInfo } from '../../lib/api'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { useToast } from '../ui/useToast'
import { CreatePRDialog } from '../LazyComponents'
import { isTauriAvailable } from '../../lib/tauri'

type CommitStep = 'review' | 'pushing' | 'done'

interface CommitDialogProps {
  isOpen: boolean
  initialIntent?: 'commit' | 'pr'
  onClose: () => void
}

const STATUS_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  M: { icon: <FileText size={14} />, color: 'text-status-info' },
  A: { icon: <Plus size={14} />, color: 'text-status-success' },
  D: { icon: <Minus size={14} />, color: 'text-status-error' },
  R: { icon: <FileText size={14} />, color: 'text-status-info' },
  '?': { icon: <CircleDot size={14} />, color: 'text-status-warning' },
}

export function CommitDialog({ isOpen, initialIntent = 'commit', onClose }: CommitDialogProps) {
  const { selectedProjectId, projects, gitInfo } = useProjectsStore()
  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const projectGitInfo = selectedProjectId ? gitInfo[selectedProjectId] : null
  const { toast } = useToast()
  const tauriAvailable = isTauriAvailable()
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  const [commitMessage, setCommitMessage] = useState('')
  const [files, setFiles] = useState<GitFileStatus[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [isPushing, setIsPushing] = useState(false)
  const [step, setStep] = useState<CommitStep>('review')
  const [remoteInfo, setRemoteInfo] = useState<GitRemoteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showStagedFiles, setShowStagedFiles] = useState(true)
  const [showUnstagedFiles, setShowUnstagedFiles] = useState(true)
  const [commitSha, setCommitSha] = useState<string | null>(null)
  const [showPRDialog, setShowPRDialog] = useState(false)
  const [pushCompleted, setPushCompleted] = useState(false)

  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const containerRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onClose,
    initialFocusRef: closeButtonRef,
    restoreFocus: true,
  })

  useEffect(() => {
    if (!isOpen) {
      setShowPRDialog(false)
      return
    }
    if (initialIntent === 'pr') {
      setShowPRDialog(true)
    }
  }, [initialIntent, isOpen])

  const stagedFiles = files.filter((f) => f.isStaged)
  const unstagedFiles = files.filter((f) => !f.isStaged)
  const selectedCount = selectedFiles.size
  const primaryActionLabel = remoteInfo?.remote ? 'Commit & Push' : 'Commit'

  const fetchStatus = useCallback(async () => {
    if (!selectedProject?.path) return

    setIsLoadingStatus(true)
    setError(null)
    try {
      const [statusResult, remoteResult] = await Promise.all([
        projectApi.gitStatus(selectedProject.path),
        projectApi.gitRemoteInfo(selectedProject.path),
      ])
      setFiles(statusResult)
      setRemoteInfo(remoteResult)

      // Auto-select all staged files
      const stagedPaths = new Set(
        statusResult.filter((f) => f.isStaged).map((f) => `staged:${f.path}`)
      )
      setSelectedFiles(stagedPaths)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get git status')
    } finally {
      setIsLoadingStatus(false)
    }
  }, [selectedProject?.path])

  useEffect(() => {
    if (isOpen) {
      if (tauriAvailable) void fetchStatus()
      setCommitMessage('')
      setStep('review')
      setCommitSha(null)
      setError(tauriAvailable ? null : 'Unavailable in web mode')
      setPushCompleted(false)
    }
  }, [isOpen, fetchStatus, tauriAvailable])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return
      if (step !== 'review') return
      if (selectedCount === 0) return
      if (isCommitting) return

      const modifier = isMac ? e.metaKey : e.ctrlKey
      if (!modifier) return
      if (e.key !== 'Enter') return

      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()

      if (remoteInfo?.remote) {
        void handleCommitAndPush()
      } else {
        void handleCommit()
      }
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [handleCommit, handleCommitAndPush, isCommitting, isMac, isOpen, remoteInfo?.remote, selectedCount, step])

  const handleToggleFile = (file: GitFileStatus) => {
    const key = `${file.isStaged ? 'staged' : 'unstaged'}:${file.path}`
    setSelectedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleSelectAll = (staged: boolean) => {
    const group = staged ? stagedFiles : unstagedFiles
    const prefix = staged ? 'staged' : 'unstaged'
    const groupKeys = group.map((f) => `${prefix}:${f.path}`)
    const allSelected = groupKeys.every((k) => selectedFiles.has(k))

    setSelectedFiles((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        groupKeys.forEach((k) => next.delete(k))
      } else {
        groupKeys.forEach((k) => next.add(k))
      }
      return next
    })
  }

  const handleCommit = useCallback(async () => {
    if (!selectedProject?.path || selectedFiles.size === 0) return

    const stagedFiles = files.filter((f) => f.isStaged)
    const unstagedFiles = files.filter((f) => !f.isStaged)

    setIsCommitting(true)
    setError(null)

    try {
      // Stage selected unstaged files
      const unstagedToStage = unstagedFiles
        .filter((f) => selectedFiles.has(`unstaged:${f.path}`))
        .map((f) => f.path)

      if (unstagedToStage.length > 0) {
        await projectApi.gitStageFiles(selectedProject.path, unstagedToStage)
      }

      // Unstage selected staged files that were deselected
      const stagedToUnstage = stagedFiles
        .filter((f) => !selectedFiles.has(`staged:${f.path}`))
        .map((f) => f.path)

      if (stagedToUnstage.length > 0) {
        await projectApi.gitUnstageFiles(selectedProject.path, stagedToUnstage)
      }

      // Perform commit
      const message = commitMessage.trim() || 'Update'
      const sha = await projectApi.gitCommit(selectedProject.path, message)
      setCommitSha(sha)

      toast.success('Commit created', {
        message: `${sha.substring(0, 7)}: ${message.split('\n')[0]}`,
      })

      setStep('done')
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Commit failed'
      setError(errMsg)
      toast.error('Commit failed', { message: errMsg })
    } finally {
      setIsCommitting(false)
    }
  }, [commitMessage, files, selectedFiles, selectedProject?.path, toast])

  const handlePush = useCallback(async () => {
    if (!selectedProject?.path || !remoteInfo?.remote || !remoteInfo?.branch) return

    setIsPushing(true)
    setError(null)

    try {
      await projectApi.gitPush(
        selectedProject.path,
        remoteInfo.remote,
        remoteInfo.branch
      )

      toast.success('Push successful', {
        message: `Pushed to ${remoteInfo.remote}/${remoteInfo.branch}`,
      })

      setPushCompleted(true)
      setStep('done')
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Push failed'
      setError(errMsg)
      toast.error('Push failed', { message: errMsg })
    } finally {
      setIsPushing(false)
    }
  }, [remoteInfo?.branch, remoteInfo?.remote, selectedProject?.path, toast])

  const handleCommitAndPush = useCallback(async () => {
    if (!selectedProject?.path || selectedFiles.size === 0) return

    const stagedFiles = files.filter((f) => f.isStaged)
    const unstagedFiles = files.filter((f) => !f.isStaged)

    setIsCommitting(true)
    setError(null)

    try {
      // Stage/unstage as needed
      const unstagedToStage = unstagedFiles
        .filter((f) => selectedFiles.has(`unstaged:${f.path}`))
        .map((f) => f.path)

      if (unstagedToStage.length > 0) {
        await projectApi.gitStageFiles(selectedProject.path, unstagedToStage)
      }

      const stagedToUnstage = stagedFiles
        .filter((f) => !selectedFiles.has(`staged:${f.path}`))
        .map((f) => f.path)

      if (stagedToUnstage.length > 0) {
        await projectApi.gitUnstageFiles(selectedProject.path, stagedToUnstage)
      }

      const message = commitMessage.trim() || 'Update'
      const sha = await projectApi.gitCommit(selectedProject.path, message)
      setCommitSha(sha)

      toast.success('Commit created', {
        message: `${sha.substring(0, 7)}: ${message.split('\n')[0]}`,
      })

      setIsCommitting(false)
      setStep('pushing')

      // Push
      if (remoteInfo?.remote && remoteInfo?.branch) {
        setIsPushing(true)
        await projectApi.gitPush(
          selectedProject.path,
          remoteInfo.remote,
          remoteInfo.branch
        )

        toast.success('Push successful', {
          message: `Pushed to ${remoteInfo.remote}/${remoteInfo.branch}`,
        })

        setPushCompleted(true)
        setStep('done')
      } else {
        setStep('done')
        setError('No remote configured for push')
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Operation failed'
      setError(errMsg)
      toast.error('Operation failed', { message: errMsg })
    } finally {
      setIsCommitting(false)
      setIsPushing(false)
    }
  }, [commitMessage, files, remoteInfo?.branch, remoteInfo?.remote, selectedFiles, selectedProject?.path, toast])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const renderFileItem = (file: GitFileStatus, grouped: 'staged' | 'unstaged') => {
    const key = `${grouped}:${file.path}`
    const isSelected = selectedFiles.has(key)
    const statusInfo = STATUS_ICONS[file.status] || STATUS_ICONS['?']

    return (
      <label
        key={key}
        className={cn(
          'flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] cursor-pointer transition-colors',
          isSelected ? 'bg-surface-hover/[0.08]' : 'hover:bg-surface-hover/[0.04]'
        )}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => handleToggleFile(file)}
          className="sr-only"
        />
        <div
          className={cn(
            'h-4 w-4 rounded-[var(--radius-xs)] border flex-shrink-0 flex items-center justify-center transition-all',
            isSelected
              ? 'border-primary bg-primary'
              : 'border-stroke/40 bg-surface-solid'
          )}
        >
          {isSelected && <Check size={10} className="text-primary-foreground" strokeWidth={3} />}
        </div>
        <span className={cn('flex-shrink-0', statusInfo.color)}>
          {statusInfo.icon}
        </span>
        <span className="text-[12px] text-text-1 truncate font-mono flex-1">
          {file.path}
        </span>
        <span className="text-[10px] text-text-3 flex-shrink-0 uppercase">
          {file.statusLabel}
        </span>
      </label>
    )
  }

  if (!isOpen) return null

  if (!tauriAvailable) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-heavy backdrop-blur-sm p-4"
        onClick={handleBackdropClick}
        role="presentation"
      >
        <div
          ref={containerRef}
          className="w-full max-w-[520px] rounded-[var(--radius-2xl)] bg-surface-solid shadow-[var(--shadow-2xl)] animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="commit-dialog-title"
          tabIndex={-1}
        >
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover/[0.08]">
                <GitCommitIcon size={18} className="text-text-2" />
              </div>
              <h2 id="commit-dialog-title" className="text-[16px] font-semibold text-text-1">
                Commit Changes
              </h2>
            </div>
            <IconButton ref={closeButtonRef} size="sm" onClick={onClose} aria-label="Close">
              <X size={16} />
            </IconButton>
          </div>

          <div className="px-5 pb-5">
            <div className="rounded-[var(--radius-sm)] border border-status-warning/30 bg-status-warning-muted px-3 py-2">
              <p className="text-[12px] text-status-warning">Unavailable in web mode</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!selectedProject?.path) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-heavy backdrop-blur-sm p-4"
        onClick={handleBackdropClick}
        role="presentation"
      >
        <div
          ref={containerRef}
          className="w-full max-w-[520px] rounded-[var(--radius-2xl)] bg-surface-solid shadow-[var(--shadow-2xl)] animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="commit-dialog-title"
          tabIndex={-1}
        >
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover/[0.08]">
                <GitCommitIcon size={18} className="text-text-2" />
              </div>
              <h2 id="commit-dialog-title" className="text-[16px] font-semibold text-text-1">
                Commit Changes
              </h2>
            </div>
            <IconButton ref={closeButtonRef} size="sm" onClick={onClose} aria-label="Close">
              <X size={16} />
            </IconButton>
          </div>

          <div className="px-5 pb-5">
            <div className="rounded-[var(--radius-sm)] border border-status-warning/30 bg-status-warning-muted px-3 py-2">
              <p className="text-[12px] text-status-warning">No project selected</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-heavy backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={containerRef}
        className="w-full max-w-[520px] rounded-[var(--radius-2xl)] bg-surface-solid shadow-[var(--shadow-2xl)] animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="commit-dialog-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover/[0.08]">
              <GitCommitIcon size={18} className="text-text-2" />
            </div>
            <h2 id="commit-dialog-title" className="text-[16px] font-semibold text-text-1">
              {step === 'done' ? 'Commit Complete' : 'Commit Changes'}
            </h2>
          </div>
          <IconButton ref={closeButtonRef} size="sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </IconButton>
        </div>

        {/* Branch & stats info */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-text-3">Branch</span>
            <div className="flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-stroke/20 bg-surface-hover/[0.05] px-2 py-0.5">
              <GitBranch size={12} className="text-text-2" />
              <span className="text-[12px] font-medium text-text-1">
                {projectGitInfo?.branch || remoteInfo?.branch || 'main'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-medium">
            <span className="text-text-3">{files.length} files</span>
            {remoteInfo && remoteInfo.ahead > 0 && (
              <span className="text-status-success">{remoteInfo.ahead} ahead</span>
            )}
            {remoteInfo && remoteInfo.behind > 0 && (
              <span className="text-status-error">{remoteInfo.behind} behind</span>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-3 rounded-[var(--radius-sm)] border border-status-error/30 bg-status-error-muted px-3 py-2">
            <p className="text-[12px] text-status-error">{error}</p>
          </div>
        )}

        {step === 'review' && (
          <>
            {/* File list */}
            <div className="flex-1 overflow-y-auto px-5 pt-4 min-h-0">
              {isLoadingStatus ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-text-3" />
                  <span className="ml-2 text-[13px] text-text-3">Loading changes...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-[13px] text-text-3">No changes to commit</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Staged files */}
                  {stagedFiles.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowStagedFiles(!showStagedFiles)}
                        className="flex items-center gap-1.5 mb-1 w-full text-left group"
                      >
                        {showStagedFiles ? (
                          <ChevronDown size={12} className="text-text-3" />
                        ) : (
                          <ChevronRight size={12} className="text-text-3" />
                        )}
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-3">
                          Staged ({stagedFiles.length})
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectAll(true)
                          }}
                          className="ml-auto text-[10px] text-text-3 hover:text-text-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {stagedFiles.every((f) => selectedFiles.has(`staged:${f.path}`))
                            ? 'Deselect all'
                            : 'Select all'}
                        </button>
                      </button>
                      {showStagedFiles && (
                        <div className="space-y-0.5">
                          {stagedFiles.map((f) => renderFileItem(f, 'staged'))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Unstaged files */}
                  {unstagedFiles.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowUnstagedFiles(!showUnstagedFiles)}
                        className="flex items-center gap-1.5 mb-1 w-full text-left group"
                      >
                        {showUnstagedFiles ? (
                          <ChevronDown size={12} className="text-text-3" />
                        ) : (
                          <ChevronRight size={12} className="text-text-3" />
                        )}
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-3">
                          Unstaged ({unstagedFiles.length})
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectAll(false)
                          }}
                          className="ml-auto text-[10px] text-text-3 hover:text-text-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {unstagedFiles.every((f) => selectedFiles.has(`unstaged:${f.path}`))
                            ? 'Deselect all'
                            : 'Select all'}
                        </button>
                      </button>
                      {showUnstagedFiles && (
                        <div className="space-y-0.5">
                          {unstagedFiles.map((f) => renderFileItem(f, 'unstaged'))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Commit message */}
            <div className="px-5 pt-4">
              <label
                htmlFor="commit-message"
                className="block text-[10px] font-semibold uppercase tracking-wider text-text-3 mb-2"
              >
                Commit Message
              </label>
              <textarea
                id="commit-message"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Leave blank to use default message"
                className="w-full h-[72px] rounded-[var(--radius-sm)] border border-stroke/20 bg-surface-hover/[0.03] px-3 py-2 text-[13px] text-text-1 placeholder:text-text-3 focus:border-stroke/30 focus:outline-none resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="p-5 pt-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-text-3">
                <span>
                  <span className="font-mono">{isMac ? 'Cmd' : 'Ctrl'}+Enter</span> to {primaryActionLabel}
                </span>
                <span>
                  <span className="font-mono">Esc</span> to close
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCommit}
                  disabled={selectedCount === 0 || isCommitting}
                  loading={isCommitting}
                  variant="secondary"
                  className="flex-1"
                >
                  <GitCommitIcon size={14} />
                  Commit ({selectedCount})
                </Button>
                <Button
                  onClick={handleCommitAndPush}
                  disabled={selectedCount === 0 || isCommitting || !remoteInfo?.remote}
                  loading={isCommitting}
                  variant="primary"
                  className="flex-1"
                >
                  <Upload size={14} />
                  Commit & Push
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'pushing' && (
          <div className="flex flex-col items-center justify-center py-12 px-5">
            <Loader2 size={32} className="animate-spin text-primary mb-4" />
            <p className="text-[14px] text-text-1 font-medium">Pushing to remote...</p>
            {remoteInfo && (
              <p className="text-[12px] text-text-3 mt-1">
                {remoteInfo.remote}/{remoteInfo.branch}
              </p>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="px-5 py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-success-muted">
                <Check size={16} className="text-status-success" />
              </div>
              <div>
                <p className="text-[14px] text-text-1 font-medium">
                  {pushCompleted ? 'Commit pushed' : 'Commit created'}
                </p>
                {commitSha && (
                  <p className="text-[12px] text-text-3 font-mono">
                    {commitSha.substring(0, 7)}
                  </p>
                )}
              </div>
            </div>

            {/* After push: show Create PR option */}
            {pushCompleted && (
              <div className="flex gap-2">
                <Button onClick={onClose} variant="secondary" className="flex-1">
                  Done
                </Button>
                <Button
                  onClick={() => setShowPRDialog(true)}
                  variant="primary"
                  className="flex-1"
                >
                  <GitPullRequest size={14} />
                  Create PR
                </Button>
              </div>
            )}

            {/* Before push: show Push button */}
            {!pushCompleted && remoteInfo?.remote && remoteInfo?.branch && (
              <div className="flex gap-2">
                <Button onClick={onClose} variant="secondary" className="flex-1">
                  Done
                </Button>
                <Button
                  onClick={handlePush}
                  disabled={isPushing}
                  loading={isPushing}
                  variant="primary"
                  className="flex-1"
                >
                  <Upload size={14} />
                  Push to {remoteInfo.remote}/{remoteInfo.branch}
                </Button>
              </div>
            )}

            {!pushCompleted && (!remoteInfo?.remote || !remoteInfo?.branch) && (
              <Button onClick={onClose} variant="primary" className="w-full">
                Done
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create PR Dialog */}
      <CreatePRDialog
        isOpen={showPRDialog}
        onClose={() => {
          setShowPRDialog(false)
          onClose()
        }}
      />
    </div>
  )
}
