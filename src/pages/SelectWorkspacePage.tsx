import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Check } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { Button } from '../components/ui/Button'
import { useProjectsStore } from '../stores/projects'

import { cn } from '../lib/utils'

export function SelectWorkspacePage() {
  const navigate = useNavigate()
  const { projects, isLoading: projectsLoading, fetchProjects, addProject, selectProject } = useProjectsStore()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    void fetchProjects()
  }, [fetchProjects])

  const workspaces = useMemo(() => {
    return projects.map((project) => ({
      id: project.id,
      path: project.path,
      name: project.displayName || project.path.split('/').pop() || project.path,
    }))
  }, [projects])

  const selectAllState = useMemo(() => {
    if (selectedIds.size === 0) return 'none'
    if (selectedIds.size === workspaces.length) return 'all'
    return 'partial'
  }, [selectedIds, workspaces.length])

  const toggleWorkspace = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectAllState === 'all') {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(workspaces.map((ws) => ws.id)))
    }
  }

  const handleContinue = () => {
    const firstSelected = [...selectedIds][0]
    if (!firstSelected) return
    selectProject(firstSelected)
    void navigate('/')
  }

  const handleSkip = () => {
    void navigate('/')
  }

  const handleOpenFolder = async () => {
    const selected = await open({ directory: true, multiple: false, title: 'Select Project Folder' })
    if (!selected || typeof selected !== 'string') return
    const project = await addProject(selected)
    setSelectedIds((prev) => new Set(prev).add(project.id))
  }

  return (
    <div className="fixed inset-0 overflow-hidden select-none">
      <div className="absolute inset-0 bg-background" />
      
      <div className="h-toolbar-sm draggable text-text-3 fixed inset-x-0 top-0 z-10 flex items-center justify-center font-medium text-sm select-none">
        Select Workspace
      </div>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
        <div className="flex w-full max-w-[400px] flex-col items-center gap-6 px-6">
          <div className="text-center">
            <h1 className="text-[24px] font-semibold text-text-1">
              Choose Workspaces
            </h1>
            <p className="mt-2 text-[15px] leading-6 text-text-3">
              Select the projects you want Codex to work with.
            </p>
          </div>

          {workspaces.length > 0 ? (
            <div className="w-full flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-text-2">Available projects</span>
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={toggleSelectAll}
                  aria-label={selectAllState === 'all' ? 'Deselect all' : 'Select all'}
                >
                  {selectAllState === 'all' ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              <div className="flex h-[240px] w-full flex-col gap-2 overflow-y-auto rounded-2xl border border-stroke/20 bg-surface-solid px-5 py-4">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      selectedIds.has(ws.id)
                        ? 'bg-primary/10'
                        : 'hover:bg-surface-hover/[0.08]'
                    )}
                    onClick={() => toggleWorkspace(ws.id)}
                  >
                    <div className={cn(
                      'flex h-[18px] w-[18px] items-center justify-center rounded-[3px] border',
                      selectedIds.has(ws.id)
                        ? 'bg-primary border-primary'
                        : 'border-stroke/50'
                    )}>
                      {selectedIds.has(ws.id) && (
                        <Check size={12} className="text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] font-medium text-text-1">
                        {ws.name}
                      </span>
                      <span className="truncate text-[12px] text-text-3">
                        {ws.path}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={handleOpenFolder}
              >
                <FolderOpen size={14} />
                Add project
              </Button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stroke/20 bg-surface-solid px-5 py-6">
              <p className="text-sm text-text-3">No projects found.</p>
            </div>
          )}

          <div className="flex w-full items-center justify-between gap-3">
              <Button
                variant="ghost"
                className="text-text-3"
                onClick={handleSkip}
                disabled={projectsLoading}
              >
                Skip
              </Button>
              <Button
                variant="primary"
                className="flex-1 justify-center"
                onClick={handleContinue}
                disabled={selectedIds.size === 0 || projectsLoading}
              >
                Continue
              </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
