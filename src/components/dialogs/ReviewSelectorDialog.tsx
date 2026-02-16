import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Check, FileDiff, GitBranch, GitCommit, PencilLine } from 'lucide-react'
import { projectApi, type GitBranch as GitBranchType, type GitCommit as GitCommitType, type ReviewTarget } from '../../lib/api'
import { useDialogKeyboardShortcut } from '../../hooks/useDialogKeyboardShortcut'
import { logError } from '../../lib/errorUtils'
import { cn } from '../../lib/utils'
import { BaseDialog } from '../ui/BaseDialog'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'

interface ReviewSelectorDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (target: ReviewTarget) => void
  projectPath: string
}

type TabType = 'uncommitted' | 'branch' | 'commit' | 'custom'

const TABS: Array<{ id: TabType; label: string; icon: ReactNode }> = [
  { id: 'uncommitted', label: 'Uncommitted', icon: <FileDiff size={16} /> },
  { id: 'branch', label: 'Branch', icon: <GitBranch size={16} /> },
  { id: 'commit', label: 'Commit', icon: <GitCommit size={16} /> },
  { id: 'custom', label: 'Custom', icon: <PencilLine size={16} /> },
]

export function ReviewSelectorDialog({
  isOpen,
  onClose,
  onSelect,
  projectPath,
}: ReviewSelectorDialogProps) {
  const tabPanelIdBase = useId()

  const [activeTab, setActiveTab] = useState<TabType>('uncommitted')
  const [branches, setBranches] = useState<GitBranchType[]>([])
  const [commits, setCommits] = useState<GitCommitType[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [customInstructions, setCustomInstructions] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null)
  const startReviewButtonRef = useRef<HTMLButtonElement>(null)

  const canSubmit = useCallback(() => {
    switch (activeTab) {
      case 'uncommitted':
        return true
      case 'branch':
        return !!selectedBranch
      case 'commit':
        return !!selectedCommit
      case 'custom':
        return customInstructions.trim().length > 0
      default:
        return false
    }
  }, [activeTab, customInstructions, selectedBranch, selectedCommit])

  const getSubmitHint = useCallback(() => {
    if (canSubmit()) return undefined
    switch (activeTab) {
      case 'branch':
        return 'Select a branch to compare'
      case 'commit':
        return 'Select a commit to review'
      case 'custom':
        return 'Enter review instructions'
      default:
        return undefined
    }
  }, [activeTab, canSubmit])

  const loadGitData = useCallback(async () => {
    if (!projectPath) return

    setLoading(true)
    setLoadError(null)
    try {
      const [branchData, commitData] = await Promise.all([
        projectApi.getGitBranches(projectPath),
        projectApi.getGitCommits(projectPath, 20),
      ])
      setBranches(branchData)
      setCommits(commitData)
    } catch (error) {
      setBranches([])
      setCommits([])
      setLoadError('Could not load Git data for this project.')
      logError(error, {
        context: 'ReviewSelectorDialog',
        source: 'dialogs',
        details: 'Failed to load git data',
      })
    } finally {
      setLoading(false)
    }
  }, [projectPath])

  const handleSelect = useCallback(() => {
    let target: ReviewTarget

    switch (activeTab) {
      case 'uncommitted':
        target = { type: 'uncommittedChanges' }
        break
      case 'branch':
        if (!selectedBranch) return
        target = { type: 'baseBranch', branch: selectedBranch }
        break
      case 'commit': {
        if (!selectedCommit) return
        const commit = commits.find((c) => c.sha === selectedCommit)
        target = { type: 'commit', sha: selectedCommit, title: commit?.title }
        break
      }
      case 'custom':
        if (!customInstructions.trim()) return
        target = { type: 'custom', instructions: customInstructions.trim() }
        break
      default:
        return
    }

    onSelect(target)
    onClose()
  }, [activeTab, commits, customInstructions, onClose, onSelect, selectedBranch, selectedCommit])

  useDialogKeyboardShortcut({
    isOpen,
    onConfirm: () => {
      if (canSubmit()) startReviewButtonRef.current?.click()
    },
    requireModifierKey: true,
  })

  useEffect(() => {
    if (!isOpen) return
    setActiveTab('uncommitted')
    setSelectedBranch(null)
    setSelectedCommit(null)
    setCustomInstructions('')
    setLoadError(null)
    setBranches([])
    setCommits([])
  }, [isOpen, projectPath])

  useEffect(() => {
    if (isOpen && projectPath) void loadGitData()
  }, [isOpen, projectPath, loadGitData])

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Review Target"
      description="Choose what to review: uncommitted changes, a base branch, a commit, or custom instructions."
      titleIcon={<FileDiff size={16} />}
      maxWidth="lg"
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <div className="text-xs text-text-3">
            Press <span className="font-mono">Cmd</span>+<span className="font-mono">Enter</span> to start.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              ref={startReviewButtonRef}
              variant="primary"
              onClick={handleSelect}
              disabled={!canSubmit()}
              title={getSubmitHint()}
            >
              Start review
            </Button>
          </div>
        </div>
      }
    >
      <div className="p-6">
        <div className="flex items-center gap-2 border-b border-stroke/20" role="tablist" aria-label="Review target tabs">
          {TABS.map((tab) => {
            const selected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${tabPanelIdBase}-${tab.id}`}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 -mb-px text-sm font-semibold transition-colors',
                  'border-b-2',
                  selected
                    ? 'border-primary text-text-1'
                    : 'border-transparent text-text-3 hover:text-text-1 hover:border-stroke/20'
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className={cn('text-text-2', selected && 'text-text-1')}>{tab.icon}</span>
                {tab.label}
              </button>
            )
          })}
        </div>

        <div id={`${tabPanelIdBase}-${activeTab}`} role="tabpanel" className="pt-5">
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-text-3">
              Loading Git data...
            </div>
          ) : loadError ? (
            <div className="h-[300px] flex flex-col items-start justify-center gap-3 rounded-lg border border-stroke/20 bg-surface-solid p-4">
              <div className="text-sm font-semibold text-text-1">Git data unavailable</div>
              <div className="text-sm text-text-3">{loadError}</div>
              <Button variant="secondary" size="sm" onClick={() => void loadGitData()}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              {activeTab === 'uncommitted' && (
                <div className="space-y-3">
                  <p className="text-sm text-text-3">
                    Review all uncommitted changes in your working directory.
                  </p>
                  <div className="rounded-lg border border-stroke/20 bg-surface-solid p-4">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-10 rounded-lg border border-stroke/20 bg-surface-hover/[0.06] inline-flex items-center justify-center">
                        <FileDiff size={18} className="text-text-2" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-text-1">Uncommitted changes</div>
                        <div className="text-sm text-text-3">Staged and unstaged changes</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'branch' && (
                <div className="space-y-2">
                  <p className="mb-3 text-sm text-text-3">Compare current HEAD against a base branch.</p>
                  {branches.length === 0 ? (
                    <p className="text-sm text-text-3">No branches found.</p>
                  ) : (
                    <div className="h-[260px] overflow-y-auto space-y-2 pr-1">
                      {branches.map((branch) => {
                        const selected = selectedBranch === branch.name
                        return (
                          <button
                            key={branch.name}
                            type="button"
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                              selected
                                ? 'border-primary/40 bg-surface-selected/[0.12]'
                                : 'border-stroke/20 bg-surface-solid hover:bg-surface-hover/[0.06]'
                            )}
                            onClick={() => setSelectedBranch(branch.name)}
                          >
                            <span className="h-8 w-8 rounded-md border border-stroke/20 bg-surface-hover/[0.06] inline-flex items-center justify-center flex-shrink-0">
                              <GitBranch size={16} className="text-text-2" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="truncate font-semibold text-text-1">{branch.name}</div>
                                {branch.isCurrent && <Badge variant="secondary">Current</Badge>}
                              </div>
                            </div>
                            {selected && <Check size={16} className="text-text-1 flex-shrink-0" aria-hidden="true" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'commit' && (
                <div className="space-y-2">
                  <p className="mb-3 text-sm text-text-3">Review a specific commit.</p>
                  {commits.length === 0 ? (
                    <p className="text-sm text-text-3">No commits found.</p>
                  ) : (
                    <div className="h-[260px] overflow-y-auto space-y-2 pr-1">
                      {commits.map((commit) => {
                        const selected = selectedCommit === commit.sha
                        return (
                          <button
                            key={commit.sha}
                            type="button"
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                              selected
                                ? 'border-primary/40 bg-surface-selected/[0.12]'
                                : 'border-stroke/20 bg-surface-solid hover:bg-surface-hover/[0.06]'
                            )}
                            onClick={() => setSelectedCommit(commit.sha)}
                          >
                            <span className="font-mono text-xs text-text-3 w-[72px] flex-shrink-0">{commit.shortSha}</span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold text-text-1">{commit.title}</div>
                              <div className="text-xs text-text-3">
                                {commit.author} • {commit.date}
                              </div>
                            </div>
                            {selected && <Check size={16} className="text-text-1 flex-shrink-0" aria-hidden="true" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'custom' && (
                <div className="space-y-3">
                  <p className="text-sm text-text-3">Provide custom review instructions.</p>
                  <Textarea
                    className="h-[220px]"
                    placeholder="Enter custom review instructions..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </BaseDialog>
  )
}
