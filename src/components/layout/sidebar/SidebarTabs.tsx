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
    <div className="flex mb-4 rounded-md bg-surface-hover/[0.06] p-1 border border-stroke/10" role="tablist">
      <button
        className={cn(
          'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
          activeTab === 'projects'
            ? 'bg-surface-solid text-text-1 shadow-[var(--shadow-1)]'
            : 'text-text-3 hover:text-text-1'
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
          'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
          activeTab === 'sessions'
            ? 'bg-surface-solid text-text-1 shadow-[var(--shadow-1)]'
            : 'text-text-3 hover:text-text-1'
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
