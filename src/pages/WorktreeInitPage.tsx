import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2, XCircle, Terminal, GitBranch } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { projectApi } from '../lib/api'

type InitStatus = 'running' | 'success' | 'error'

export function WorktreeInitPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<InitStatus>('running')
  const [output, setOutput] = useState<string[]>([])
  const [worktreePath, setWorktreePath] = useState<string | null>(null)

  const projectPath = searchParams.get('projectPath')
  const branchName = searchParams.get('branch')

  const addOutput = useCallback((line: string) => {
    setOutput((prev) => [...prev, line])
  }, [])

  // Validate params and initialize worktree - this is an intentional side effect
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!projectPath || !branchName) {
      addOutput('Error: Missing project path or branch name.')
      setStatus('error')
      return
    }

    let cancelled = false

    const initWorktree = async () => {
      addOutput('Initializing worktree...')
      addOutput(`Project: ${projectPath}`)
      addOutput(`Branch: ${branchName}`)
      addOutput('')

      try {
        addOutput('Creating git worktree...')
        const result = await projectApi.createWorktree(projectPath, branchName)

        if (cancelled) return

        addOutput(`Worktree created at: ${result.path}`)
        addOutput(`Branch: ${result.branch}`)
        addOutput(`HEAD: ${result.headCommit}`)
        addOutput('')
        addOutput('Worktree ready.')

        setWorktreePath(result.path)
        setStatus('success')
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        addOutput('')
        addOutput(`Error: ${message}`)
        setStatus('error')
      }
    }

    void initWorktree()

    return () => {
      cancelled = true
    }
  }, [projectPath, branchName, addOutput])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCancel = () => {
    void navigate('/')
  }

  const handleContinue = () => {
    // Navigate to the main view. The worktree path is available for
    // session context if the caller provided a callback via state.
    void navigate('/')
  }

  const handleWorkLocally = () => {
    void navigate('/')
  }

  const statusConfig = {
    running: {
      icon: <Loader2 size={20} className="animate-spin text-primary" />,
      label: 'Initializing...',
      className: 'text-text-2',
    },
    success: {
      icon: <CheckCircle2 size={20} className="text-status-success" />,
      label: 'Worktree Ready',
      className: 'text-status-success',
    },
    error: {
      icon: <XCircle size={20} className="text-status-error" />,
      label: 'Initialization Failed',
      className: 'text-status-error',
    },
  }

  const currentStatus = statusConfig[status]

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 z-10 border-b border-stroke/20 bg-background">
        <div className="px-6 py-4">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-primary" />
            <h1 className="text-lg font-semibold text-text-1">Initialize Worktree</h1>
          </div>
          <p className="text-sm text-text-3 mt-1">
            Setting up a dedicated worktree for this task.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-[var(--thread-content-max-width)]">
          <div className="flex items-center gap-3 mb-4">
            {currentStatus.icon}
            <span className={`text-sm font-medium ${currentStatus.className}`}>
              {currentStatus.label}
            </span>
          </div>

          {/* Worktree info card on success */}
          {status === 'success' && worktreePath && (
            <div className="mb-4 rounded-lg border border-status-success/30 bg-status-success-muted p-4">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch size={14} className="text-status-success" />
                <span className="text-sm font-medium text-text-1">{branchName}</span>
              </div>
              <div className="text-xs text-text-3 font-mono truncate">{worktreePath}</div>
            </div>
          )}

          <div className="vertical-scroll-fade-mask min-h-[200px] max-h-[400px] bg-surface-solid text-text-3 text-sm flex flex-col overflow-y-auto whitespace-pre rounded-lg border border-stroke/20 p-3 font-mono">
            <div className="flex items-center gap-2 mb-2 text-text-2">
              <Terminal size={14} />
              <span className="text-xs uppercase tracking-wider">Output</span>
            </div>
            {output.map((line, index) => (
              <div key={index} className="text-xs leading-relaxed">
                {line}
              </div>
            ))}
            {status === 'running' && (
              <div className="text-xs text-text-3/50 animate-pulse">_</div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-stroke/20 px-6 py-4">
        <div className="mx-auto max-w-[var(--thread-composer-max-width)] flex items-center justify-between gap-4">
          <Button variant="outline" onClick={handleCancel} disabled={status === 'running'}>
            Cancel
          </Button>
          {status === 'success' && (
            <Button variant="primary" onClick={handleContinue}>
              Continue
            </Button>
          )}
          {status === 'error' && (
            <Button variant="secondary" onClick={handleWorkLocally}>
              Work Locally Instead
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
