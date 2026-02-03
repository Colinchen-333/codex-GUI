import { memo } from 'react'
import { Pencil, Settings, FolderOpen, Trash2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { ContextMenu, type ContextMenuItem } from '../../ui/ContextMenu'

export interface Project {
  id: string
  path: string
  displayName: string | null
  lastOpenedAt: number | null
}

export interface ProjectListProps {
  projects: Project[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onRename: (id: string, currentName: string) => void
  onDelete: (id: string, name: string) => void
  onSettings: (id: string) => void
}

/**
 * ProjectList - Displays list of projects with context menu actions
 *
 * Features:
 * - Project selection with visual feedback
 * - Context menu for rename, settings, open in Finder, remove
 * - Empty state display
 * - Optimized with React.memo
 *
 * Context menu items are created per-project as they depend on project data.
 */
export const ProjectList = memo(function ProjectList({
  projects,
  selectedId,
  onSelect,
  onRename,
  onDelete,
  onSettings,
}: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-surface-hover/[0.12] text-text-2">
            <span className="text-lg">📁</span>
          </div>
          <p className="text-sm font-semibold text-text-1">No projects yet</p>
          <p className="text-xs text-text-3">Add a project to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="space-y-0.5"
      role="listbox"
      aria-label="Projects list"
      id="projects-panel"
      aria-labelledby="projects-tab"
    >
      {projects.map((project) => {
        const displayName =
          project.displayName || project.path.split('/').pop() || 'Unknown'
        const isSelected = selectedId === project.id

        const contextMenuItems: ContextMenuItem[] = [
          {
            label: 'Rename',
            icon: <Pencil size={14} />,
            onClick: () => onRename(project.id, displayName),
          },
          {
            label: 'Settings',
            icon: <Settings size={14} />,
            onClick: () => onSettings(project.id),
          },
          {
            label: 'Open in Finder',
            icon: <FolderOpen size={14} />,
            onClick: () => {
              // Use Tauri shell to open folder
              void import('@tauri-apps/plugin-shell').then(async ({ open }) => {
                await open(project.path)
              })
            },
          },
          {
            label: 'Remove',
            icon: <Trash2 size={14} />,
            onClick: () => onDelete(project.id, displayName),
            variant: 'danger',
          },
        ]

        return (
          <ContextMenu key={project.id} items={contextMenuItems}>
            <button
              className={cn(
                'group w-full h-12 rounded-md px-3 py-1.5 text-left transition-colors relative overflow-hidden flex flex-col justify-center',
                isSelected
                  ? 'bg-surface-selected/[0.12] text-text-1'
                  : 'text-text-1 hover:bg-surface-hover/[0.08]'
              )}
              onClick={() => onSelect(project.id)}
              role="option"
              aria-selected={isSelected}
            >
              <div className="truncate text-[14px] leading-tight font-medium">{displayName}</div>
              <div className={cn(
                "truncate text-[12px] leading-tight transition-colors",
                isSelected ? "text-text-2" : "text-text-3"
              )}>
                {project.path}
              </div>
            </button>
          </ContextMenu>
        )
      })}
    </div>
  )
})
