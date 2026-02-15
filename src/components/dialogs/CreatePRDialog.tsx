import { useState, useEffect, useCallback, useRef } from 'react'
import { GitPullRequest, X, Check, ExternalLink, AlertTriangle, Copy, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { copyTextToClipboard } from '../../lib/clipboard'
import { useProjectsStore } from '../../stores/projects'
import { projectApi, type GitBranch } from '../../lib/api'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { Switch } from '../ui/Switch'
import { useToast } from '../ui/useToast'
import { isTauriAvailable } from '../../lib/tauri'

type PRStep = 'form' | 'creating' | 'done'
type GhStatus = 'checking' | 'ready' | 'not-installed' | 'not-authenticated'

interface CreatePRDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CreatePRDialog({ isOpen, onClose }: CreatePRDialogProps) {
  const { selectedProjectId, projects } = useProjectsStore()
  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const { toast } = useToast()
  const tauriAvailable = isTauriAvailable()
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  // Form state
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [baseBranch, setBaseBranch] = useState('')
  const [headBranch, setHeadBranch] = useState('')
  const [isDraft, setIsDraft] = useState(false)

  // UI state
  const [step, setStep] = useState<PRStep>('form')
  const [ghStatus, setGhStatus] = useState<GhStatus>('checking')
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onClose,
    initialFocus: tauriAvailable && !!selectedProject?.path ? titleInputRef : closeButtonRef,
    restoreFocus: true,
  })

  const initialize = useCallback(async () => {
    if (!selectedProject?.path) return
    if (!tauriAvailable) {
      setGhStatus('not-installed')
      setError('Unavailable in web mode')
      return
    }

    setGhStatus('checking')
    setError(null)
    setStep('form')
    setPrUrl(null)
    setCopied(false)
    setTitle('')
    setBody('')
    setIsDraft(false)

    try {
      const [ghCliStatus, branchList, currentBranch] = await Promise.all([
        projectApi.checkGhCli(selectedProject.path),
        projectApi.getGitBranches(selectedProject.path),
        projectApi.getCurrentBranch(selectedProject.path),
      ])

      setBranches(branchList)
      setHeadBranch(currentBranch)

      // Set default base branch (prefer main, then master, then first non-current)
      const mainBranch = branchList.find((b) => b.name === 'main')
      const masterBranch = branchList.find((b) => b.name === 'master')
      const defaultBase = mainBranch?.name || masterBranch?.name || branchList.find((b) => !b.isCurrent)?.name || ''
      setBaseBranch(defaultBase)

      setGhStatus(ghCliStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize')
      setGhStatus('not-installed')
    }
  }, [selectedProject, tauriAvailable])

  useEffect(() => {
    if (isOpen) {
      void initialize()
    }
  }, [isOpen, initialize])
  // Initialize form when dialog opens.

  const handleCreatePR = useCallback(async () => {
    if (!selectedProject?.path || !title.trim()) return

    setStep('creating')
    setError(null)

    try {
      const url = await projectApi.createPullRequest(
        selectedProject.path,
        title.trim(),
        body,
        baseBranch,
        headBranch,
        isDraft
      )

      setPrUrl(url)
      setStep('done')
      toast.success('Pull request created', {
        message: isDraft ? 'Created as draft PR' : undefined,
      })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to create PR'
      setError(errMsg)
      setStep('form')
      toast.error('PR creation failed', { message: errMsg })
    }
  }, [baseBranch, body, headBranch, isDraft, selectedProject?.path, title, toast])

  useEffect(() => {
    if (!isOpen) return
    if (!tauriAvailable) return
    if (!selectedProject?.path) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return
      const modifier = isMac ? e.metaKey : e.ctrlKey
      if (!modifier) return
      if (e.key !== 'Enter') return
      if (step !== 'form') return
      if (ghStatus !== 'ready') return
      if (!title.trim() || !baseBranch || !headBranch) return

      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      void handleCreatePR()
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [baseBranch, ghStatus, handleCreatePR, headBranch, isMac, isOpen, selectedProject?.path, step, tauriAvailable, title])

  const handleCopyUrl = async () => {
    if (!prUrl) return
    try {
      const ok = await copyTextToClipboard(prUrl)
      if (!ok) throw new Error('Clipboard unavailable')
      setCopied(true)
      toast.success('URL copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy URL')
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const branchOptions = branches
    .filter((b) => b.name !== headBranch)
    .map((b) => ({ value: b.name, label: b.name }))

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
          aria-labelledby="create-pr-dialog-title"
          tabIndex={-1}
        >
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover/[0.08]">
                <GitPullRequest size={18} className="text-text-2" />
              </div>
              <h2 id="create-pr-dialog-title" className="text-[16px] font-semibold text-text-1">
                Create Pull Request
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
          aria-labelledby="create-pr-dialog-title"
          tabIndex={-1}
        >
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover/[0.08]">
                <GitPullRequest size={18} className="text-text-2" />
              </div>
              <h2 id="create-pr-dialog-title" className="text-[16px] font-semibold text-text-1">
                Create Pull Request
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
        aria-labelledby="create-pr-dialog-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover/[0.08]">
              <GitPullRequest size={18} className="text-text-2" />
            </div>
            <h2 id="create-pr-dialog-title" className="text-[16px] font-semibold text-text-1">
              {step === 'done' ? 'Pull Request Created' : 'Create Pull Request'}
            </h2>
          </div>
          <IconButton ref={closeButtonRef} size="sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </IconButton>
        </div>

        {/* GH CLI Status Warning */}
        {ghStatus === 'checking' && (
          <div className="flex items-center gap-2 mx-5 mt-4 px-3 py-2 rounded-[var(--radius-sm)] border border-stroke/20 bg-surface-hover/[0.03]">
            <Loader2 size={14} className="animate-spin text-text-3" />
            <span className="text-[12px] text-text-3">Checking GitHub CLI...</span>
          </div>
        )}

        {(ghStatus === 'not-installed' || ghStatus === 'not-authenticated') && (
          <div className="mx-5 mt-4 rounded-[var(--radius-sm)] border border-status-warning/30 bg-status-warning-muted px-3 py-2.5">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-status-warning mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-text-1">
                  {ghStatus === 'not-installed'
                    ? 'GitHub CLI not found'
                    : 'GitHub CLI not authenticated'}
                </p>
                <p className="text-[11px] text-text-3 mt-0.5">
                  {ghStatus === 'not-installed'
                    ? 'Install GitHub CLI, then run: gh auth login'
                    : 'Run: gh auth login'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-3 rounded-[var(--radius-sm)] border border-status-error/30 bg-status-error-muted px-3 py-2">
            <p className="text-[12px] text-status-error">{error}</p>
          </div>
        )}

        {step === 'form' && (
          <>
            {/* Form */}
            <div className="flex-1 overflow-y-auto px-5 pt-4 space-y-4 min-h-0">
              {/* Head branch (current, read-only) */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-3 mb-1.5">
                  Head branch (current)
                </label>
                <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-stroke/20 bg-surface-hover/[0.03] px-3 py-2">
                  <span className="text-[13px] font-mono text-text-2">{headBranch || '...'}</span>
                </div>
              </div>

              {/* Base branch */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-3 mb-1.5">
                  Base branch
                </label>
                <Select
                  selectSize="md"
                  value={baseBranch}
                  onChange={(e) => setBaseBranch(e.target.value)}
                  options={branchOptions}
                  placeholder="Select base branch"
                />
              </div>

              {/* Title */}
              <div>
                <label htmlFor="pr-title" className="block text-[10px] font-semibold uppercase tracking-wider text-text-3 mb-1.5">
                  Title
                </label>
                <Input
                  id="pr-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="PR title"
                  error={title.length > 0 && title.trim().length === 0}
                  ref={titleInputRef}
                />
              </div>

              {/* Body */}
              <div>
                <label htmlFor="pr-body" className="block text-[10px] font-semibold uppercase tracking-wider text-text-3 mb-1.5">
                  Description
                </label>
                <Textarea
                  id="pr-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Describe your changes (Markdown supported)"
                  className="min-h-[120px]"
                />
              </div>

              {/* Draft toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-text-1">Draft PR</p>
                  <p className="text-[11px] text-text-3">Create as draft pull request</p>
                </div>
                <Switch
                  checked={isDraft}
                  onChange={setIsDraft}
                  size="sm"
                  aria-label="Create as draft"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-5 pt-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-text-3">
                <span>
                  <span className="font-mono">{isMac ? 'Cmd' : 'Ctrl'}+Enter</span> to create PR
                </span>
                <span>
                  <span className="font-mono">Esc</span> to close
                </span>
              </div>
              <div className="flex gap-2">
                <Button onClick={onClose} variant="secondary" className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePR}
                  disabled={!title.trim() || !baseBranch || !headBranch || ghStatus !== 'ready'}
                  variant="primary"
                  className="flex-1"
                >
                  <GitPullRequest size={14} />
                  Create Pull Request
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'creating' && (
          <div className="flex flex-col items-center justify-center py-12 px-5">
            <Loader2 size={32} className="animate-spin text-primary mb-4" />
            <p className="text-[14px] text-text-1 font-medium">Creating pull request...</p>
            <p className="text-[12px] text-text-3 mt-1">
              {headBranch} → {baseBranch}
            </p>
          </div>
        )}

        {step === 'done' && prUrl && (
          <div className="px-5 py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-success-muted">
                <Check size={16} className="text-status-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-text-1 font-medium">Pull request created</p>
                <p className="text-[12px] text-text-3 truncate">{title}</p>
              </div>
            </div>

            {/* PR URL display */}
            <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-stroke/20 bg-surface-hover/[0.03] px-3 py-2 mb-4">
              <span className="text-[12px] font-mono text-primary truncate flex-1">{prUrl}</span>
              <button
                onClick={handleCopyUrl}
                className={cn(
                  'flex-shrink-0 p-1 rounded-[var(--radius-xs)] transition-colors',
                  copied ? 'text-status-success' : 'text-text-3 hover:text-text-1'
                )}
                aria-label="Copy URL"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>

            <div className="flex gap-2">
              <Button onClick={onClose} variant="secondary" className="flex-1">
                Done
              </Button>
              <Button
                onClick={() => window.open(prUrl, '_blank')}
                variant="primary"
                className="flex-1"
              >
                <ExternalLink size={14} />
                Open in Browser
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
