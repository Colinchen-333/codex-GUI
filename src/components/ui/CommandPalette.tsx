import { useEffect, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Settings,
  MessageSquare,
  GitBranch,
  Inbox,
  Sparkles,
  Plus,
  Moon,
  Sun,
  Keyboard,
  HelpCircle,
  FolderOpen,
  Bug,
  Terminal,
  TextCursorInput,
} from 'lucide-react'

import { useTheme } from '../../hooks/useTheme'
import { useAppStore } from '../../stores/app'

interface CommandItem {
  id: string
  label: string
  icon: React.ReactNode
  shortcut?: string[]
  action: () => void
  group: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onNewThread?: () => void
  onOpenSettings?: () => void
  onOpenKeyboardShortcuts?: () => void
  onOpenHelp?: () => void
}

export function CommandPalette({
  isOpen,
  onClose,
  onNewThread,
  onOpenSettings,
  onOpenKeyboardShortcuts,
  onOpenHelp,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const handleAction = useCallback((action: () => void) => {
    action()
    onClose()
    setSearch('')
  }, [onClose])

  const commands: CommandItem[] = [
    {
      id: 'new-thread',
      label: 'New thread',
      icon: <Plus size={16} />,
      shortcut: ['⌘', 'N'],
      action: () => onNewThread?.(),
      group: 'Actions',
    },
    {
      id: 'go-home',
      label: 'Go to Home',
      icon: <MessageSquare size={16} />,
      shortcut: ['⌘', '1'],
      action: () => navigate('/'),
      group: 'Navigation',
    },
    {
      id: 'go-inbox',
      label: 'Go to Inbox',
      icon: <Inbox size={16} />,
      shortcut: ['⌘', '2'],
      action: () => navigate('/inbox'),
      group: 'Navigation',
    },
    {
      id: 'go-skills',
      label: 'Go to Skills',
      icon: <Sparkles size={16} />,
      shortcut: ['⌘', '3'],
      action: () => navigate('/skills'),
      group: 'Navigation',
    },
    {
      id: 'go-diff',
      label: 'Go to Diff',
      icon: <GitBranch size={16} />,
      action: () => navigate('/diff'),
      group: 'Navigation',
    },
    {
      id: 'browse-files',
      label: 'Browse Files',
      icon: <FolderOpen size={16} />,
      action: () => navigate('/file-preview'),
      group: 'Navigation',
    },
    {
      id: 'debug-panel',
      label: 'Debug Panel',
      icon: <Bug size={16} />,
      action: () => navigate('/debug'),
      group: 'Navigation',
    },
    {
      id: 'go-settings',
      label: 'Open Settings',
      icon: <Settings size={16} />,
      shortcut: ['⌘', ','],
      action: () => onOpenSettings?.() ?? navigate('/settings'),
      group: 'Navigation',
    },
    {
      id: 'toggle-theme',
      label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />,
      action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      group: 'Preferences',
    },
    {
      id: 'toggle-terminal',
      label: 'Toggle Terminal',
      icon: <Terminal size={16} />,
      shortcut: ['⌘', 'J'],
      action: () => window.dispatchEvent(new CustomEvent('codex:toggle-terminal')),
      group: 'Actions',
    },
    {
      id: 'clear-thread',
      label: 'Clear Thread',
      icon: <TextCursorInput size={16} />,
      shortcut: ['⌘', 'L'],
      action: () => {
        void import('../../stores/thread').then(({ useThreadStore }) => {
          const { focusedThreadId, clearThread } = useThreadStore.getState()
          if (focusedThreadId) {
            clearThread()
          }
        })
        useAppStore.getState().triggerFocusInput()
      },
      group: 'Actions',
    },
    {
      id: 'toggle-review-pane',
      label: 'Toggle Review Pane',
      icon: <GitBranch size={16} />,
      shortcut: ['⌘', '/'],
      action: () => window.dispatchEvent(new CustomEvent('codex:toggle-review-panel')),
      group: 'Actions',
    },
    {
      id: 'keyboard-shortcuts',
      label: 'Keyboard Shortcuts',
      icon: <Keyboard size={16} />,
      shortcut: ['?'],
      action: () => onOpenKeyboardShortcuts?.(),
      group: 'Help',
    },
    {
      id: 'help',
      label: 'Help & Documentation',
      icon: <HelpCircle size={16} />,
      action: () => onOpenHelp?.(),
      group: 'Help',
    },
  ]

  const groups = [...new Set(commands.map((c) => c.group))]

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="command-menu-dialog fixed inset-0 z-[var(--z-overlay)] flex items-start justify-center pt-[20vh] bg-overlay backdrop-blur-sm codex-dialog-overlay"
      onClick={onClose}
    >
      <Command
        className="codex-dialog w-full max-w-[560px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <div className="flex items-center gap-3 border-b border-stroke/20 px-4">
          <Search size={16} className="text-text-3" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search..."
            className="flex-1 h-12 bg-transparent text-[14px] text-text-1 placeholder:text-text-3"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xs bg-surface-hover/[0.08] text-[11px] text-text-3 font-mono">
            ESC
          </kbd>
        </div>

        <Command.List>
          <Command.Empty>No results found.</Command.Empty>

          {groups.map((group) => (
            <Command.Group key={group} heading={group}>
              {commands
                .filter((c) => c.group === group)
                .map((command) => (
                  <Command.Item
                    key={command.id}
                    value={command.label}
                    onSelect={() => handleAction(command.action)}
                    className="justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-text-3">{command.icon}</span>
                      <span className="text-[13px]">{command.label}</span>
                    </div>
                    {command.shortcut && (
                      <div className="flex items-center gap-1">
                        {command.shortcut.map((key, i) => (
                          <kbd
                            key={i}
                            className="min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-xs bg-surface-hover/[0.08] text-[11px] text-text-3 font-mono"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    )}
                  </Command.Item>
                ))}
            </Command.Group>
          ))}
        </Command.List>

        <div className="flex items-center justify-between border-t border-stroke/20 px-4 py-2 text-[11px] text-text-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-hover/[0.08] font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-hover/[0.08] font-mono">↵</kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-hover/[0.08] font-mono">ESC</kbd>
            Close
          </span>
        </div>
      </Command>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- Intentional: exports hook alongside component
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  }
}
