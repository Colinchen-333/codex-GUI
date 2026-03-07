import { memo } from 'react'
import { Users, Eye, MessageSquare, Cpu, Crown, X } from 'lucide-react'
import { useCollaborationStore, type CollaborationMode } from '../../stores/collaboration'

interface ModeOption {
  value: CollaborationMode
  label: string
  // Using a union of specific Lucide icon component types
  icon: typeof Eye
}

const MODE_OPTIONS: ModeOption[] = [
  { value: 'watch', label: 'Watch', icon: Eye },
  { value: 'suggest', label: 'Suggest', icon: MessageSquare },
  { value: 'co-pilot', label: 'Co-pilot', icon: Cpu },
  { value: 'full-control', label: 'Full Control', icon: Crown },
]

export const CollaborationBar = memo(function CollaborationBar() {
  const { isFollowing, mode, followers, setMode, stopFollowing } = useCollaborationStore()

  // Hide entirely when there is nothing to show
  if (!isFollowing && followers.length === 0) return null

  return (
    <div
      role="banner"
      aria-label="Collaboration status"
      className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b border-primary/20 shrink-0"
    >
      <Users size={16} className="text-primary flex-shrink-0" aria-hidden="true" />

      {isFollowing ? (
        /* ── Follower view: mode selector + stop button ── */
        <>
          <span className="text-sm text-text-1 select-none">Following thread</span>

          <div className="flex items-center gap-1 ml-auto" role="group" aria-label="Collaboration mode">
            {MODE_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const isActive = mode === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  aria-pressed={isActive}
                  aria-label={opt.label}
                  className={[
                    'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors duration-150',
                    isActive
                      ? 'bg-primary/15 text-primary font-medium'
                      : 'text-text-3 hover:text-text-2 hover:bg-surface-hover/[0.08]',
                  ].join(' ')}
                >
                  <Icon size={12} aria-hidden="true" />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              )
            })}

            <button
              type="button"
              onClick={stopFollowing}
              aria-label="Stop following"
              className="ml-2 p-1 rounded-md hover:bg-surface-hover/[0.08] text-text-3 hover:text-text-2 transition-colors duration-150"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </>
      ) : (
        /* ── Owner view: follower avatars ── */
        <>
          <span className="text-sm text-text-1 select-none">
            {followers.length} follower{followers.length !== 1 ? 's' : ''} connected
          </span>

          <div className="flex items-center gap-1 ml-auto" aria-label="Connected followers">
            {followers.slice(0, 3).map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-semibold select-none"
                title={f.name}
                aria-label={f.name}
              >
                {f.name.charAt(0).toUpperCase()}
              </span>
            ))}
            {followers.length > 3 && (
              <span className="text-xs text-text-3 ml-0.5" aria-label={`and ${followers.length - 3} more`}>
                +{followers.length - 3}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
})
