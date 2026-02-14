import { useMemo, useState } from 'react'
import { Keyboard, Search } from 'lucide-react'
import { BaseDialog } from '../ui/BaseDialog'
import { Input } from '../ui/Input'
import { cn } from '../../lib/utils'

interface KeyboardShortcutsDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutGroup {
  title: string
  shortcuts: Array<{
    keys: string[]
    description: string
  }>
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['Cmd', ','], description: 'Open settings' },
      { keys: ['Cmd', 'K'], description: 'Open command palette' },
      { keys: ['Cmd', 'N'], description: 'New session' },
      { keys: ['Cmd', 'J'], description: 'Toggle terminal' },
      { keys: ['Cmd', 'L'], description: 'Clear thread' },
      { keys: ['Cmd', '/'], description: 'Toggle review pane' },
      { keys: ['Esc'], description: 'Stop generation (double-tap) / Close dialogs' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Cmd', '1'], description: 'Switch to Projects tab' },
      { keys: ['Cmd', '2'], description: 'Switch to Sessions tab' },
      { keys: ['Up', 'Down'], description: 'Navigate message history (input)' },
    ],
  },
  {
    title: 'Chat Input',
    shortcuts: [
      { keys: ['Enter'], description: 'Send message (input)' },
      { keys: ['Shift', 'Enter'], description: 'New line (input)' },
      { keys: ['/'], description: 'Show slash commands (input)' },
      { keys: ['@'], description: 'Mention file (input)' },
      { keys: ['Cmd', 'V'], description: 'Paste image (input)' },
    ],
  },
  {
    title: 'Approval Actions',
    shortcuts: [
      { keys: ['Y'], description: 'Accept action' },
      { keys: ['N'], description: 'Decline action' },
      { keys: ['A'], description: 'Accept all for session' },
    ],
  },
]

function Keycap({ children }: { children: string }) {
  return (
    <kbd
      className={cn(
        'min-w-[24px] h-6 px-1.5 inline-flex items-center justify-center',
        'rounded-md border border-stroke/20 bg-surface-hover/[0.06]',
        'text-[11px] font-mono font-medium text-text-1'
      )}
    >
      {children}
    </kbd>
  )
}

export function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return SHORTCUT_GROUPS
    return SHORTCUT_GROUPS.map((group) => {
      const shortcuts = group.shortcuts.filter((shortcut) => {
        const haystack = `${shortcut.description} ${shortcut.keys.join(' ')}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
      if (shortcuts.length === 0) return null
      return { ...group, shortcuts }
    }).filter(Boolean) as ShortcutGroup[]
  }, [normalizedQuery])

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      description="Quick reference for common shortcuts."
      titleIcon={<Keyboard size={16} />}
      maxWidth="lg"
      footer={
        <div className="text-xs text-text-3">
          Press <Keycap>Esc</Keycap> to close.
        </div>
      }
    >
      <div className="p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-3" htmlFor="shortcut-search">
            Search shortcuts
          </label>
          <Input
            id="shortcut-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to filter by key or action"
            icon={<Search size={14} />}
          />
        </div>

        {filteredGroups.length === 0 && (
          <div className="text-sm text-text-3">No shortcuts match your search.</div>
        )}

        {filteredGroups.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs font-semibold text-text-3 mb-3 uppercase tracking-wider">
              {group.title}
            </h3>
            <div className="space-y-2">
              {group.shortcuts.map((shortcut) => (
                <div
                  key={`${group.title}:${shortcut.description}:${shortcut.keys.join('+')}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-stroke/20 bg-surface-solid px-3 py-2"
                >
                  <span className="text-sm text-text-2">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, j) => (
                      <span key={j} className="flex items-center">
                        <Keycap>{key}</Keycap>
                        {j < shortcut.keys.length - 1 && (
                          <span className="text-text-3 mx-1">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </BaseDialog>
  )
}

