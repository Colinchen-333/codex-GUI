import { useEffect, useState, useCallback, useMemo } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Settings,
  MessageSquare,
  GitBranch,
  History,
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
  Code2,
  TextCursorInput,
  AlertTriangle,
  GitCommit,
  Download,
  Info,
  Upload,
  Pencil,
  X,
  Square,
  FileText,
  RefreshCw,
  GitPullRequest,
} from 'lucide-react'

import { useTheme } from '../../hooks/useTheme'
import { useAppStore } from '../../stores/app'
import { useProjectsStore } from '../../stores/projects'
import { useThreadStore, selectFocusedThread } from '../../stores/thread'
import { selectGlobalNextPendingApproval } from '../../stores/thread/selectors'
import { APP_EVENTS, dispatchAppEvent } from '../../lib/appEvents'
import { openInTerminal, openInVSCode, revealInFinder } from '../../lib/hostActions'
import { buildDiagnosticsReportJson } from '../../lib/diagnostics'
import { copyTextToClipboard } from '../../lib/clipboard'
import { isTauriAvailable } from '../../lib/tauri'
import { serverApi, systemApi } from '../../lib/api'
import { useToast } from './useToast'
import { useSessionsStore } from '../../stores/sessions'

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
  const { toast } = useToast()
  const sessions = useSessionsStore((state) => state.sessions)
  const threads = useThreadStore((state) => state.threads)
  const focusedCwd = useThreadStore((state) => selectFocusedThread(state)?.thread.cwd ?? null)

  const sessionTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const session of sessions) {
      if (session.title) map.set(session.sessionId, session.title)
    }
    return map
  }, [sessions])

  const handleClose = useCallback(() => {
    setSearch('')
    onClose()
  }, [onClose])

  const handleAction = useCallback((action: () => void) => {
    action()
    handleClose()
  }, [handleClose])

  const commands: CommandItem[] = [
    {
      id: 'new-thread',
      label: 'New session',
      icon: <Plus size={16} />,
      shortcut: ['⌘', 'N'],
      action: () => onNewThread?.(),
      group: 'Actions',
    },
    {
      id: 'open-project-settings',
      label: 'Project Settings',
      icon: <Settings size={16} />,
      action: () => {
        const { selectedProjectId, projects } = useProjectsStore.getState()
        let projectId = selectedProjectId
        if (focusedCwd) {
          const match = projects.find((p) => focusedCwd.startsWith(p.path))
          if (match) projectId = match.id
        }
        if (!projectId) {
          toast.error('No project selected')
          return
        }
        dispatchAppEvent(APP_EVENTS.OPEN_PROJECT_SETTINGS, { projectId })
      },
      group: 'Actions',
    },
    {
      id: 'import-codex-cli-session',
      label: 'Import Codex CLI Session',
      icon: <Download size={16} />,
      action: () => dispatchAppEvent(APP_EVENTS.OPEN_IMPORT_CODEX_SESSIONS),
      group: 'Actions',
    },
    {
      id: 'export-session',
      label: 'Export Session',
      icon: <Upload size={16} />,
      action: () => dispatchAppEvent(APP_EVENTS.OPEN_EXPORT_SESSION),
      group: 'Actions',
    },
    {
      id: 'rename-session',
      label: 'Rename Session',
      icon: <Pencil size={16} />,
      action: () => dispatchAppEvent(APP_EVENTS.OPEN_RENAME_SESSION),
      group: 'Actions',
    },
    {
      id: 'close-session',
      label: 'Close Session',
      icon: <X size={16} />,
      action: () => dispatchAppEvent(APP_EVENTS.OPEN_CLOSE_SESSION),
      group: 'Actions',
    },
    {
      id: 'stop-session',
      label: 'Stop Session',
      icon: <Square size={16} />,
      action: async () => {
        try {
          await useThreadStore.getState().interrupt()
        } catch {
          toast.error('Failed to stop session')
        }
      },
      group: 'Actions',
    },
    {
      id: 'copy-diagnostics-report',
      label: 'Copy Diagnostics Report',
      icon: <FileText size={16} />,
      action: async () => {
        try {
          const json = await buildDiagnosticsReportJson()
          const ok = await copyTextToClipboard(json)
          if (ok) toast.success('Copied diagnostics report')
          else toast.error('Copy failed')
        } catch (err) {
          toast.error('Failed to build diagnostics report', { message: String(err) })
        }
      },
      group: 'Diagnostics',
    },
    {
      id: 'reveal-logs-folder',
      label: 'Reveal Logs Folder',
      icon: <FolderOpen size={16} />,
      action: async () => {
        if (!isTauriAvailable()) {
          toast.error('Unavailable in web mode')
          return
        }
        try {
          const paths = await systemApi.getAppPaths()
          if (!paths.logDir) {
            toast.error('Log folder not available')
            return
          }
          await revealInFinder(paths.logDir)
        } catch (err) {
          toast.error('Failed to reveal logs folder', { message: String(err) })
        }
      },
      group: 'Diagnostics',
    },
    {
      id: 'restart-engine',
      label: 'Restart Engine',
      icon: <RefreshCw size={16} />,
      action: async () => {
        if (!isTauriAvailable()) {
          toast.error('Unavailable in web mode')
          return
        }
        try {
          await serverApi.restart()
          toast.success('Engine restart requested')
        } catch (err) {
          toast.error('Failed to restart engine', { message: String(err) })
        }
      },
      group: 'Diagnostics',
    },
    {
      id: 'open-commit-dialog',
      label: 'Commit Changes',
      icon: <GitCommit size={16} />,
      action: () => dispatchAppEvent(APP_EVENTS.OPEN_COMMIT_DIALOG),
      group: 'Actions',
    },
    {
      id: 'create-pr',
      label: 'Create Pull Request',
      icon: <GitPullRequest size={16} />,
      action: () => dispatchAppEvent(APP_EVENTS.OPEN_CREATE_PR_DIALOG),
      group: 'Actions',
    },
    {
      id: 'reveal-in-finder',
      label: 'Reveal in Finder',
      icon: <FolderOpen size={16} />,
      action: async () => {
        if (!focusedCwd) {
          toast.error('No active session')
          return
        }
        try {
          await revealInFinder(focusedCwd)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to reveal in Finder')
        }
      },
      group: 'Actions',
    },
    {
      id: 'open-in-terminal',
      label: 'Open in Terminal',
      icon: <Terminal size={16} />,
      action: async () => {
        if (!focusedCwd) {
          toast.error('No active session')
          return
        }
        try {
          await openInTerminal(focusedCwd)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to open in Terminal')
        }
      },
      group: 'Actions',
    },
    {
      id: 'open-in-vscode',
      label: 'Open in VS Code',
      icon: <Code2 size={16} />,
      action: async () => {
        if (!focusedCwd) {
          toast.error('No active session')
          return
        }
        try {
          await openInVSCode(focusedCwd)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to open in VS Code')
        }
      },
      group: 'Actions',
    },
    {
      id: 'open-snapshots',
      label: 'Open Snapshots',
      icon: <History size={16} />,
      action: () => useAppStore.getState().setSnapshotsOpen(true),
      group: 'Navigation',
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
      action: () => dispatchAppEvent(APP_EVENTS.TOGGLE_TERMINAL),
      group: 'Actions',
    },
    {
      id: 'clear-thread',
      label: 'Clear Session',
      icon: <TextCursorInput size={16} />,
      shortcut: ['⌘', 'L'],
      action: () => {
        const { focusedThreadId, clearThread } = useThreadStore.getState()
        if (focusedThreadId) {
          clearThread()
        }
        useAppStore.getState().triggerFocusInput()
      },
      group: 'Actions',
    },
    {
      id: 'toggle-review-pane',
      label: 'Toggle Review Pane',
      icon: <GitBranch size={16} />,
      shortcut: ['⌘', '/'],
      action: () => dispatchAppEvent(APP_EVENTS.TOGGLE_REVIEW_PANEL),
      group: 'Actions',
    },
    {
      id: 'jump-next-approval',
      label: 'Jump to Next Approval',
      icon: <AlertTriangle size={16} />,
      shortcut: ['⌘', '⇧', 'A'],
      action: () => {
        const next = selectGlobalNextPendingApproval(useThreadStore.getState())
        if (!next) {
          toast.info('No pending approvals')
          return
        }
        useThreadStore.getState().switchThread(next.threadId)
        useAppStore.getState().setScrollToItemId(next.itemId)
      },
      group: 'Approvals',
    },
    ...Object.values(threads).slice(0, 12).map((threadState) => {
      const threadId = threadState.thread.id
      const title = sessionTitleById.get(threadId) || threadState.thread.cwd?.split('/').pop() || threadId.slice(0, 8)
      return {
        id: `switch-session:${threadId}`,
        label: `Switch to: ${title}`,
        icon: <MessageSquare size={16} />,
        action: () => useThreadStore.getState().switchThread(threadId),
        group: 'Sessions',
      }
    }),
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
    {
      id: 'about',
      label: 'About',
      icon: <Info size={16} />,
      action: () => useAppStore.getState().setAboutOpen(true),
      group: 'Help',
    },
  ]

  const groups = [...new Set(commands.map((c) => c.group))]

  if (!isOpen) return null

  return (
    <div
      className="command-menu-dialog fixed inset-0 z-[var(--z-overlay)] flex items-start justify-center pt-[20vh] bg-overlay backdrop-blur-sm codex-dialog-overlay"
      onClick={handleClose}
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
        e.stopPropagation()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        e.stopPropagation()
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
