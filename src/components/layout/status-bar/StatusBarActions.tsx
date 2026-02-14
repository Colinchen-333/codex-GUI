/**
 * StatusBarActions - Action buttons component
 *
 * Displays help, about, settings, keep awake, and other action buttons.
 * Memoized to prevent unnecessary re-renders.
 */
import { memo } from 'react'
import { HelpCircle, Info, Settings, Camera, Coffee } from 'lucide-react'
import { useThreadStore } from '../../../stores/thread'
import { selectActiveThread } from '../../../stores/thread/selectors'
import { useKeepAwake } from '../../../hooks/useKeepAwake'
import { cn } from '../../../lib/utils'

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
  const { isActive: keepAwakeActive, isLoading: keepAwakeLoading, toggle: toggleKeepAwake } = useKeepAwake()

  return (
    <div className="flex items-center gap-1">
      <button
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-token-list-hover-background',
          keepAwakeActive
            ? 'text-status-warning'
            : 'text-token-description-foreground hover:text-token-foreground'
        )}
        onClick={() => void toggleKeepAwake()}
        disabled={keepAwakeLoading}
        title={keepAwakeActive ? 'Keep awake: active' : 'Keep awake: inactive'}
        aria-label={keepAwakeActive ? 'Disable keep awake' : 'Enable keep awake'}
      >
        <Coffee size={13} />
      </button>
      {activeThread && (
        <button
          className="flex h-6 w-6 items-center justify-center rounded-md text-token-description-foreground transition-colors hover:bg-token-list-hover-background hover:text-token-foreground"
          onClick={onSnapshotsClick}
          title="Snapshots"
        >
          <Camera size={13} />
        </button>
      )}
      <button
        className="flex h-6 w-6 items-center justify-center rounded-md text-token-description-foreground transition-colors hover:bg-token-list-hover-background hover:text-token-foreground"
        onClick={onHelpClick}
        title="Help"
      >
        <HelpCircle size={13} />
      </button>
      <button
        className="flex h-6 w-6 items-center justify-center rounded-md text-token-description-foreground transition-colors hover:bg-token-list-hover-background hover:text-token-foreground"
        onClick={onAboutClick}
        title="About"
      >
        <Info size={13} />
      </button>
      <button
        className="flex h-6 w-6 items-center justify-center rounded-md text-token-description-foreground transition-colors hover:bg-token-list-hover-background hover:text-token-foreground"
        onClick={onSettingsClick}
        title="Settings"
      >
        <Settings size={13} />
      </button>
    </div>
  )
})
