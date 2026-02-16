import { useMemo, useRef, useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { open } from '@tauri-apps/plugin-dialog'
import { useKeyboardShortcuts, type KeyboardShortcut } from '../hooks/useKeyboardShortcuts'
import { useAppStore } from '../stores/app'
import { useProjectsStore } from '../stores/projects'
import { useThreadStore } from '../stores/thread/index'
import { useSessionsStore } from '../stores/sessions'
import { useToast } from './ui/Toast'
import { useUndoRedo } from '../hooks/useUndoRedo'
import { useUndoRedoStore } from '../stores/undoRedo'
import { logError } from '../lib/errorUtils'
import { selectGlobalNextPendingApproval } from '../stores/thread/selectors'
import { APP_EVENTS, dispatchAppEvent } from '../lib/appEvents'

// Double-escape timeout (like CLI)
const DOUBLE_ESCAPE_TIMEOUT_MS = 1500

export function KeyboardShortcuts() {
  // Store functions are called via getState() to avoid dependency issues
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { undo, redo, canUndo, canRedo } = useUndoRedo()
  const escapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const focusedThreadId = useThreadStore((state) => state.focusedThreadId)

  // Update current thread in undo store
  useEffect(() => {
    const { setCurrentThread } = useUndoRedoStore.getState()
    setCurrentThread(focusedThreadId)
  }, [focusedThreadId])

  // Cleanup escape timer on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (escapeTimerRef.current) {
        clearTimeout(escapeTimerRef.current)
        escapeTimerRef.current = null
      }
    }
  }, [])

  // Handle double-escape like CLI
  const handleEscape = useCallback(() => {
    const { turnStatus, interrupt } = useThreadStore.getState()
    const currentEscapePending = useAppStore.getState().escapePending

    // If AI is running, require double-escape
    if (turnStatus === 'running') {
      if (currentEscapePending) {
        // Second escape - actually interrupt
        if (escapeTimerRef.current) {
          clearTimeout(escapeTimerRef.current)
          escapeTimerRef.current = null
        }
        useAppStore.getState().setEscapePending(false)
        void interrupt()
      } else {
        // First escape - show pending state
        useAppStore.getState().setEscapePending(true)
        escapeTimerRef.current = setTimeout(() => {
          useAppStore.getState().setEscapePending(false)
          escapeTimerRef.current = null
        }, DOUBLE_ESCAPE_TIMEOUT_MS)
      }
    } else {
      // Not running - close dialogs / leave settings
      if (location.pathname.startsWith('/settings')) {
        void navigate(-1)
      }
      useAppStore.getState().setKeyboardShortcutsOpen(false)
    }
  }, [location.pathname, navigate]) // uses router for navigation

  // Navigate to next session
  const navigateToNextSession = useCallback((direction: 'next' | 'prev' | 'first' | 'last') => {
    const threads = useThreadStore.getState().threads
    const focusedThreadId = useThreadStore.getState().focusedThreadId
    const threadEntries = Object.entries(threads)

    if (threadEntries.length === 0) {
      return
    }

    const threadIds = threadEntries.map(([id]) => id)
    const currentIndex = focusedThreadId ? threadIds.indexOf(focusedThreadId) : -1

    let targetIndex: number

    switch (direction) {
      case 'next':
        targetIndex = currentIndex + 1
        if (targetIndex >= threadIds.length) {
          targetIndex = 0 // Wrap to first
        }
        break
      case 'prev':
        targetIndex = currentIndex - 1
        if (targetIndex < 0) {
          targetIndex = threadIds.length - 1 // Wrap to last
        }
        break
      case 'first':
        targetIndex = 0
        break
      case 'last':
        targetIndex = threadIds.length - 1
        break
      default:
        return
    }

    const targetThreadId = threadIds[targetIndex]
    if (targetThreadId && targetThreadId !== focusedThreadId) {
      const session = useSessionsStore.getState().sessions.find(s => s.sessionId === targetThreadId)
      const sessionName = session?.title || session?.firstMessage?.slice(0, 30) || `Session ${targetThreadId.slice(0, 8)}`

      useThreadStore.getState().switchThread(targetThreadId)
      showToast(`Switched to ${sessionName.length > 30 ? sessionName.slice(0, 30) + '...' : sessionName}`, 'info')
    }
  }, [showToast])

  const jumpToNextApproval = useCallback(() => {
    const next = selectGlobalNextPendingApproval(useThreadStore.getState())
    if (!next) {
      showToast('No pending approvals', 'info')
      return
    }
    useThreadStore.getState().switchThread(next.threadId)
    useAppStore.getState().setScrollToItemId(next.itemId)
    showToast('Jumped to next approval', 'info')
  }, [showToast])

  const shortcuts: KeyboardShortcut[] = useMemo(
    () => [
      // Open settings (Cmd/Ctrl + ,)
      {
        key: ',',
        meta: true,
        description: 'Open settings',
        handler: () => navigate('/settings'),
      },
      // Note: Cmd/Ctrl + K is reserved for the Command Palette (handled by useCommandPalette).
      // Focus input (Cmd/Ctrl + Shift + K)
      {
        key: 'k',
        meta: true,
        shift: true,
        description: 'Focus input',
        handler: () => useAppStore.getState().triggerFocusInput(),
      },
      // Switch to Projects tab (Cmd/Ctrl + 1)
      {
        key: '1',
        meta: true,
        description: 'Switch to Projects tab',
        handler: () => useAppStore.getState().setSidebarTab('projects'),
      },
      // Switch to Sessions tab (Cmd/Ctrl + 2)
      {
        key: '2',
        meta: true,
        description: 'Switch to Sessions tab',
        handler: () => useAppStore.getState().setSidebarTab('sessions'),
      },
      // Open project (Cmd/Ctrl + O)
      {
        key: 'o',
        meta: true,
        description: 'Open project',
        handler: async () => {
          try {
            const selected = await open({
              directory: true,
              multiple: false,
              title: 'Select Project Folder',
            })
            if (selected && typeof selected === 'string') {
              await useProjectsStore.getState().addProject(selected)
              showToast('Project added successfully', 'success')
            }
          } catch (error) {
            logError(error, {
              context: 'KeyboardShortcuts',
              source: 'shortcuts',
              details: 'Failed to add project'
            })
            showToast('Failed to add project', 'error')
          }
        },
      },
      // Escape - Double-press to interrupt AI (like CLI)
      {
        key: 'Escape',
        description: 'Stop generation (double-press) / Close dialogs',
        handler: handleEscape,
      },
      // New session (Cmd/Ctrl + N)
      {
        key: 'n',
        meta: true,
        description: 'New session',
        handler: () => {
          const projectId = useProjectsStore.getState().selectedProjectId
          if (!projectId) {
            showToast('Please select a project first', 'error')
            return
          }
          if (!useThreadStore.getState().canAddSession()) {
            showToast('Maximum sessions reached. Close one and retry.', 'error')
            return
          }
          dispatchAppEvent(APP_EVENTS.OPEN_NEW_SESSION_DIALOG)
        },
      },
      // Toggle terminal (Cmd/Ctrl + J)
      {
        key: 'j',
        meta: true,
        description: 'Toggle terminal',
        handler: () => {
          dispatchAppEvent(APP_EVENTS.TOGGLE_TERMINAL)
        },
      },
      // Toggle sidebar (Cmd/Ctrl + B) - aligns with common editor behavior
      {
        key: 'b',
        meta: true,
        description: 'Toggle sidebar',
        handler: () => {
          useAppStore.getState().toggleSidebarCollapsed()
        },
      },
      // Clear session (Cmd/Ctrl + L)
      {
        key: 'l',
        meta: true,
        description: 'Clear session',
        handler: () => {
          const { focusedThreadId, clearThread } = useThreadStore.getState()
          if (focusedThreadId) {
            clearThread()
            showToast('Session cleared', 'info')
          }
          useAppStore.getState().triggerFocusInput()
        },
      },
      // Toggle review pane (Cmd/Ctrl + /)
      {
        key: '/',
        meta: true,
        description: 'Toggle review pane',
        handler: () => {
          dispatchAppEvent(APP_EVENTS.TOGGLE_REVIEW_PANEL)
        },
      },
      // Jump to next approval (Cmd/Ctrl + Shift + A)
      {
        key: 'a',
        meta: true,
        shift: true,
        description: 'Jump to next approval',
        handler: jumpToNextApproval,
      },
      // Go to Diff (Cmd/Ctrl + Shift + D)
      {
        key: 'd',
        meta: true,
        shift: true,
        description: 'Go to Diff',
        handler: () => navigate('/diff'),
      },
      // Browse Files (Cmd/Ctrl + Shift + F)
      {
        key: 'f',
        meta: true,
        shift: true,
        description: 'Browse files',
        handler: () => navigate('/file-preview'),
      },
      // Help - Show keyboard shortcuts
      {
        key: '?',
        shift: true,
        description: 'Show keyboard shortcuts',
        handler: () => useAppStore.getState().setKeyboardShortcutsOpen(true),
      },
      // Navigate to next session (Cmd/Ctrl + ])
      {
        key: ']',
        meta: true,
        description: 'Next session',
        handler: () => navigateToNextSession('next'),
      },
      // Navigate to previous session (Cmd/Ctrl + [)
      {
        key: '[',
        meta: true,
        description: 'Previous session',
        handler: () => navigateToNextSession('prev'),
      },
      // Navigate to first session (Cmd/Ctrl + Shift + [)
      {
        key: '[',
        meta: true,
        shift: true,
        description: 'First session',
        handler: () => navigateToNextSession('first'),
      },
      // Navigate to last session (Cmd/Ctrl + Shift + ])
      {
        key: ']',
        meta: true,
        shift: true,
        description: 'Last session',
        handler: () => navigateToNextSession('last'),
      },
      // Undo (Cmd/Ctrl + Z)
      {
        key: 'z',
        meta: true,
        description: 'Undo',
        handler: () => {
          if (canUndo()) {
            undo()
          }
        },
      },
      // Redo (Cmd/Ctrl + Shift + Z)
      {
        key: 'z',
        meta: true,
        shift: true,
        description: 'Redo',
        handler: () => {
          if (canRedo()) {
            redo()
          }
        },
      },
    ],
    [showToast, handleEscape, navigateToNextSession, jumpToNextApproval, undo, redo, canUndo, canRedo, navigate] // Only dependencies that aren't store functions
  )

  useKeyboardShortcuts(shortcuts)

  return null
}
