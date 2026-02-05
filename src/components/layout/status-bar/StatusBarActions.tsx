/**
 * StatusBarActions - Action buttons component
 *
 * Displays help, about, settings, and other action buttons.
 * Memoized to prevent unnecessary re-renders.
 */
import { memo } from 'react'
import { HelpCircle, Info, Settings, Camera } from 'lucide-react'
import { useThreadStore } from '../../../stores/thread'
import { selectActiveThread } from '../../../stores/thread/selectors'

export interface StatusBarActionsProps {
  onHelpClick: () => void
  onAboutClick: () => void
  onSettingsClick: () => void
  onSnapshotsClick: () => void
}

export const StatusBarActions = memo(function StatusBarActions({
  onHelpClick,
  onAboutClick,
  onSettingsClick,
  onSnapshotsClick,
}: StatusBarActionsProps) {
  const activeThread = useThreadStore(selectActiveThread)
  return (
    <div className="flex items-center gap-1">
      {activeThread && (
        <button
          className="h-7 w-7 flex items-center justify-center rounded-lg text-text-2 transition-colors hover:bg-surface-hover/[0.12] hover:text-text-1"
          onClick={onSnapshotsClick}
          title="Snapshots"
        >
          <Camera size={14} />
        </button>
      )}
      <button
        className="h-7 w-7 flex items-center justify-center rounded-lg text-text-2 transition-colors hover:bg-surface-hover/[0.12] hover:text-text-1"
        onClick={onHelpClick}
        title="Help"
      >
        <HelpCircle size={14} />
      </button>
      <button
        className="h-7 w-7 flex items-center justify-center rounded-lg text-text-2 transition-colors hover:bg-surface-hover/[0.12] hover:text-text-1"
        onClick={onAboutClick}
        title="About"
      >
        <Info size={14} />
      </button>
      <button
        className="h-7 w-7 flex items-center justify-center rounded-lg text-text-2 transition-colors hover:bg-surface-hover/[0.12] hover:text-text-1"
        onClick={onSettingsClick}
        title="Settings"
      >
        <Settings size={14} />
      </button>
    </div>
  )
})
