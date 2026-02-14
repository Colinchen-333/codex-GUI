import { memo } from 'react'
import { cn } from '../../../lib/utils'

export type SidebarTabType = 'projects' | 'sessions'

interface SidebarTabsProps {
  activeTab: SidebarTabType
  onTabChange: (tab: SidebarTabType) => void
}

/**
 * SidebarTabs - Tab switcher for Projects/Sessions views
 *
 * Extracted from Sidebar.tsx for better separation of concerns.
 * Uses memo to prevent unnecessary re-renders when parent state changes.
 */
export const SidebarTabs = memo(function SidebarTabs({
  activeTab,
  onTabChange,
}: SidebarTabsProps) {
  return (
    <div className="flex mb-4 rounded-md bg-surface-hover/[0.06] p-0.5 border border-stroke/10" role="tablist">
      <button
        className={cn(
          'flex-1 rounded-[4px] px-3 py-1 text-[11px] font-medium transition-all duration-200',
          activeTab === 'projects'
            ? 'bg-surface-solid text-text-1 shadow-sm'
            : 'text-text-3 hover:text-text-2'
        )}
        onClick={() => onTabChange('projects')}
        role="tab"
        aria-selected={activeTab === 'projects'}
        aria-controls="projects-panel"
        id="projects-tab"
      >
        Projects
      </button>
      <button
        className={cn(
          'flex-1 rounded-[4px] px-3 py-1 text-[11px] font-medium transition-all duration-200',
          activeTab === 'sessions'
            ? 'bg-surface-solid text-text-1 shadow-sm'
            : 'text-text-3 hover:text-text-2'
        )}
        onClick={() => onTabChange('sessions')}
        role="tab"
        aria-selected={activeTab === 'sessions'}
        aria-controls="sessions-panel"
        id="sessions-tab"
      >
        Sessions
      </button>
    </div>
  )
})
