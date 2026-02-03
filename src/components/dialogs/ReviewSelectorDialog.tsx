import { useState, useEffect, useRef } from 'react'
import { projectApi, type GitBranch, type GitCommit, type ReviewTarget } from '../../lib/api'
import { useDialogKeyboardShortcut } from '../../hooks/useDialogKeyboardShortcut'
import { logError } from '../../lib/errorUtils'

interface ReviewSelectorDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (target: ReviewTarget) => void
  projectPath: string
}

type TabType = 'uncommitted' | 'branch' | 'commit' | 'custom'

export function ReviewSelectorDialog({
  isOpen,
  onClose,
  onSelect,
  projectPath,
}: ReviewSelectorDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('uncommitted')
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [commits, setCommits] = useState<GitCommit[]>([])
  const [loading, setLoading] = useState(false)
  const [customInstructions, setCustomInstructions] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null)
  const startReviewButtonRef = useRef<HTMLButtonElement>(null)

  // Use keyboard shortcut hook for Cmd+Enter (or Ctrl+Enter on Windows/Linux)
  useDialogKeyboardShortcut({
    isOpen,
    onConfirm: () => {
      if (canSubmit()) {
        startReviewButtonRef.current?.click()
      }
    },
    onCancel: onClose,
    requireModifierKey: true, // Require Cmd/Ctrl key since there are inputs
  })

  useEffect(() => {
    if (isOpen && projectPath) {
      const loadGitData = async () => {
        setLoading(true)
        try {
          const [branchData, commitData] = await Promise.all([
            projectApi.getGitBranches(projectPath),
            projectApi.getGitCommits(projectPath, 20),
          ])
          setBranches(branchData)
          setCommits(commitData)
        } catch (error) {
          logError(error, {
            context: 'ReviewSelectorDialog',
            source: 'dialogs',
            details: 'Failed to load git data'
          })
        } finally {
          setLoading(false)
        }
      }
      void loadGitData()
    }
  }, [isOpen, projectPath])

  const handleSelect = () => {
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
  }

  const canSubmit = () => {
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
  }

  const getSubmitHint = () => {
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
  }

  if (!isOpen) return null

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'uncommitted', label: 'Uncommitted', icon: '📝' },
    { id: 'branch', label: 'Branch', icon: '🌿' },
    { id: 'commit', label: 'Commit', icon: '📌' },
    { id: 'custom', label: 'Custom', icon: '✏️' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-surface-solid shadow-[var(--shadow-2)] border border-stroke/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stroke/20 px-6 py-4">
          <h2 className="text-lg font-semibold text-text-1">Review Target</h2>
          <button
            className="text-text-3 hover:text-text-1"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stroke/20 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-stroke/40 text-text-1'
                  : 'text-text-3 hover:text-text-1'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="h-[300px] overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-text-3">
              Loading...
            </div>
          ) : (
            <>
              {activeTab === 'uncommitted' && (
                <div className="space-y-3">
                  <p className="text-sm text-text-3">
                    Review all uncommitted changes in your working directory.
                  </p>
                  <div className="rounded-lg border border-stroke/20 bg-surface-hover/[0.06] p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📝</span>
                      <div>
                        <div className="font-medium text-text-1">Uncommitted Changes</div>
                        <div className="text-sm text-text-3">
                          Staged and unstaged changes
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'branch' && (
                <div className="space-y-2">
                  <p className="mb-3 text-sm text-text-3">
                    Compare current HEAD against a base branch.
                  </p>
                  {branches.length === 0 ? (
                    <p className="text-sm text-text-3">No branches found.</p>
                  ) : (
                    branches.map((branch) => (
                      <button
                        key={branch.name}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                          selectedBranch === branch.name
                            ? 'border-stroke/40 bg-surface-selected/[0.16]'
                            : 'border-stroke/20 hover:bg-surface-hover/[0.08]'
                        }`}
                        onClick={() => setSelectedBranch(branch.name)}
                      >
                        <span className="text-lg">🌿</span>
                        <div className="flex-1">
                          <div className="font-medium text-text-1">{branch.name}</div>
                          {branch.isCurrent && (
                            <span className="text-xs text-text-3">(current)</span>
                          )}
                        </div>
                        {selectedBranch === branch.name && (
                          <span className="text-text-1">✓</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'commit' && (
                <div className="space-y-2">
                  <p className="mb-3 text-sm text-text-3">
                    Review a specific commit.
                  </p>
                  {commits.length === 0 ? (
                    <p className="text-sm text-text-3">No commits found.</p>
                  ) : (
                    commits.map((commit) => (
                      <button
                        key={commit.sha}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                          selectedCommit === commit.sha
                            ? 'border-stroke/40 bg-surface-selected/[0.16]'
                            : 'border-stroke/20 hover:bg-surface-hover/[0.08]'
                        }`}
                        onClick={() => setSelectedCommit(commit.sha)}
                      >
                        <span className="font-mono text-xs text-text-3">
                          {commit.shortSha}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-text-1">{commit.title}</div>
                          <div className="text-xs text-text-3">
                            {commit.author} • {commit.date}
                          </div>
                        </div>
                        {selectedCommit === commit.sha && (
                          <span className="text-text-1">✓</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'custom' && (
                <div className="space-y-3">
                  <p className="text-sm text-text-3">
                    Provide custom review instructions.
                  </p>
                  <textarea
                    className="h-[200px] w-full resize-none rounded-lg border border-stroke/30 bg-surface-solid p-3 text-sm text-text-1 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/15"
                    placeholder="Enter custom review instructions..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-stroke/20 px-6 py-4">
          <button
            className="rounded-md border border-stroke/30 px-4 py-2 text-sm font-medium text-text-2 hover:bg-surface-hover/[0.12]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            ref={startReviewButtonRef}
            className="rounded-md bg-surface-selected/[0.2] px-4 py-2 text-sm font-medium text-text-1 hover:bg-surface-selected/[0.28] shadow-[var(--shadow-1)] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSelect}
            disabled={!canSubmit()}
            title={getSubmitHint()}
          >
            Start Review
          </button>
        </div>
      </div>
    </div>
  )
}
