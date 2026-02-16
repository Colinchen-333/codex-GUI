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
            <FolderOpen size={18} className="text-text-2" aria-hidden="true" />
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
              }).catch((err) => console.error('Failed to open folder:', err))
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
                'group flex w-full flex-col justify-center h-[36px] rounded-md px-2.5 py-1.5 text-left transition-all duration-200 relative overflow-hidden',
                isSelected
                  ? 'bg-surface-hover/[0.08] text-text-1'
                  : 'text-text-2 hover:bg-surface-hover/[0.04] hover:text-text-1'
              )}
              onClick={() => onSelect(project.id)}
              role="option"
              aria-selected={isSelected}
            >
              <div className={cn("truncate text-[13px] leading-none tracking-tight mb-1", isSelected ? "font-medium" : "font-normal")}>
                {displayName}
              </div>
              <div className={cn(
                "truncate text-[11px] leading-none transition-opacity",
                isSelected ? "opacity-80" : "opacity-50 group-hover:opacity-70"
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
