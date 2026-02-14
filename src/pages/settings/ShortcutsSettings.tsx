import { memo, useMemo, useState } from 'react'
import {
  SettingsSection,
  SettingsCard,
} from '../../components/settings/SettingsLayout'

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
      { keys: ['\u2318', ','], description: 'Open settings' },
      { keys: ['\u2318', 'K'], description: 'Focus message input' },
      { keys: ['\u2318', 'N'], description: 'New session' },
      { keys: ['Esc'], description: 'Stop generation (double-tap) / Close dialogs' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['\u2318', '1'], description: 'Switch to Projects tab' },
      { keys: ['\u2318', '2'], description: 'Switch to Sessions tab' },
      { keys: ['\u2191', '\u2193'], description: 'Navigate message history (input)' },
    ],
  },
  {
    title: 'Chat Input',
    shortcuts: [
      { keys: ['Enter'], description: 'Send message (input)' },
      { keys: ['Shift', 'Enter'], description: 'New line (input)' },
      { keys: ['/'], description: 'Show slash commands (input)' },
      { keys: ['@'], description: 'Mention file (input)' },
      { keys: ['\u2318', 'V'], description: 'Paste image (input)' },
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

/**
 * Keyboard shortcuts settings page (inline, not dialog)
 */
export const ShortcutsSettings = memo(function ShortcutsSettings() {
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
    <div className="space-y-8">
      <SettingsSection
        title="Keyboard Shortcuts"
        description="Quick reference for keyboard shortcuts."
      >
        <div className="mb-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shortcuts..."
            className="w-full rounded-lg border border-stroke/30 bg-surface-solid px-3 py-2 text-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {filteredGroups.length === 0 && (
          <div className="text-sm text-text-3 py-4 text-center">
            No shortcuts match your search.
          </div>
        )}

        {filteredGroups.map((group) => (
          <SettingsCard key={group.title} className="mb-4">
            <h3 className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-3">
              {group.title}
            </h3>
            <div className="divide-y divide-stroke/10">
              {group.shortcuts.map((shortcut, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm text-text-1">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, j) => (
                      <span key={j} className="flex items-center">
                        <kbd className="min-w-[24px] h-6 px-1.5 inline-flex items-center justify-center rounded-md bg-surface-hover/[0.12] border border-stroke/20 text-xs font-mono font-medium text-text-2">
                          {key}
                        </kbd>
                        {j < shortcut.keys.length - 1 && (
                          <span className="text-text-3 mx-0.5">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SettingsCard>
        ))}
      </SettingsSection>
    </div>
  )
})
