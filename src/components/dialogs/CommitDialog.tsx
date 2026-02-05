import { useState, useEffect, useCallback, useRef } from 'react'
import { GitBranch, GitCommit, Upload, Github, X, Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useProjectsStore } from '../../stores/projects'
import { projectApi } from '../../lib/api'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { Button } from '../ui/Button'
import { Switch } from '../ui/Switch'
import { IconButton } from '../ui/IconButton'

type NextStep = 'commit' | 'commit-push' | 'commit-pr'

interface CommitStats {
  filesChanged: number
  additions: number
  deletions: number
}

interface CommitDialogProps {
  isOpen: boolean
  onClose: () => void
  onCommit?: (message: string, nextStep: NextStep) => void
}

export function CommitDialog({ isOpen, onClose, onCommit }: CommitDialogProps) {
  const { selectedProjectId, projects, gitInfo } = useProjectsStore()
  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const projectGitInfo = selectedProjectId ? gitInfo[selectedProjectId] : null

  const [commitMessage, setCommitMessage] = useState('')
  const [includeUnstaged, setIncludeUnstaged] = useState(true)
  const [selectedStep, setSelectedStep] = useState<NextStep>('commit')
  const [stats, setStats] = useState<CommitStats>({ filesChanged: 0, additions: 0, deletions: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const containerRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onClose,
    initialFocusRef: closeButtonRef,
    restoreFocus: true,
  })

  const fetchStats = useCallback(async () => {
    if (!selectedProject?.path) return
    
    setIsLoading(true)
    try {
      const result = await projectApi.getGitDiff(selectedProject.path)
      if (result.isGitRepo && result.diff) {
        const lines = result.diff.split('\n')
        let additions = 0
        let deletions = 0
        let filesChanged = 0
        
        for (const line of lines) {
          if (line.startsWith('diff --git')) filesChanged++
          if (line.startsWith('+') && !line.startsWith('+++')) additions++
          if (line.startsWith('-') && !line.startsWith('---')) deletions++
        }
        
        setStats({ filesChanged, additions, deletions })
      }
    } finally {
      setIsLoading(false)
    }
  }, [selectedProject?.path])

  useEffect(() => {
    if (isOpen) {
      void fetchStats()
      setCommitMessage('')
      setSelectedStep('commit')
    }
  }, [isOpen, fetchStats])

  const handleContinue = () => {
    onCommit?.(commitMessage, selectedStep)
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const nextStepOptions: { id: NextStep; label: string; icon: React.ReactNode }[] = [
    { id: 'commit', label: 'Commit', icon: <GitCommit size={16} /> },
    { id: 'commit-push', label: 'Commit and push', icon: <Upload size={16} /> },
    { id: 'commit-pr', label: 'Commit and create PR', icon: <Github size={16} /> },
  ]

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={containerRef}
        className="w-full max-w-[420px] rounded-[var(--radius-2xl)] bg-surface-solid p-6 shadow-[var(--shadow-2xl)] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="commit-dialog-title"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08]">
              <GitCommit size={18} className="text-text-2" />
            </div>
            <h2 id="commit-dialog-title" className="text-[16px] font-semibold text-text-1">Commit your changes</h2>
          </div>
          <IconButton ref={closeButtonRef} size="sm" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-text-3">Branch</span>
            <div className="flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-stroke/20 bg-surface-hover/[0.05] px-2 py-0.5">
              <GitBranch size={12} className="text-text-2" />
              <span className="text-[12px] font-medium text-text-1">
                {projectGitInfo?.branch || 'main'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-medium">
            <span className="text-text-3">{stats.filesChanged} files</span>
            <span className="text-emerald-400">+{stats.additions.toLocaleString()}</span>
            <span className="text-red-400">-{stats.deletions.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-5">
          <span className="text-[13px] text-text-2">Include unstaged</span>
          <Switch checked={includeUnstaged} onChange={setIncludeUnstaged} />
        </div>

        <div className="mb-4">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-3 mb-2">
            Commit Message
          </label>
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Leave blank to autogenerate a commit message"
            className="w-full h-[72px] rounded-[var(--radius-sm)] border border-stroke/20 bg-surface-hover/[0.03] px-3 py-2 text-[13px] text-text-1 placeholder:text-text-3 focus:border-stroke/30 focus:outline-none resize-none"
          />
        </div>

        <div className="mb-5">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-3 mb-2">
            Next Steps
          </label>
          <div className="space-y-1">
            {nextStepOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedStep(option.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left transition-colors',
                  selectedStep === option.id
                    ? 'bg-surface-hover/[0.08] text-text-1'
                    : 'text-text-2 hover:bg-surface-hover/[0.04]'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(selectedStep === option.id ? 'text-text-1' : 'text-text-3')}>{option.icon}</span>
                  <span className="text-[13px] font-medium">{option.label}</span>
                </div>
                {selectedStep === option.id && (
                  <Check size={16} className="text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleContinue}
          disabled={stats.filesChanged === 0}
          loading={isLoading}
          variant="primary"
          className="w-full"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
