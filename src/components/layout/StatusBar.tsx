/**
 * StatusBar - Main application status bar
 *
 * Refactored into smaller, memoized components for better performance.
 * Each sub-component subscribes only to the state it needs.
 *
 * Performance optimizations:
 * - Modular components with React.memo
 * - Optimized selectors from thread store
 * - Reduced re-renders through component isolation
 */
import { useEffect, useState, memo } from 'react'
import {
  SnapshotListDialog,
  AboutDialog,
  HelpDialog,
  KeyboardShortcutsDialog,
} from '../LazyComponents'
import { useNavigate } from 'react-router-dom'
import { useProjectsStore } from '../../stores/projects'
import { useAppStore } from '../../stores/app'
import {
  ServerStatusIndicator,
  GitInfoIndicator,
  TurnStatusIndicator,
  ConnectedTokenUsageIndicator,
  AccountInfoSection,
  StatusBarActions,
} from './status-bar'
import { cn } from '../../lib/utils'

type ContextMode = 'local' | 'worktree' | 'cloud'

const ContextModeTabs = memo(function ContextModeTabs() {
  const [activeMode, setActiveMode] = useState<ContextMode>('local')
  
  const modes: { id: ContextMode; label: string }[] = [
    { id: 'local', label: 'Local' },
    { id: 'worktree', label: 'Worktree' },
    { id: 'cloud', label: 'Cloud' },
  ]
  
  return (
    <div className="flex items-center rounded-md bg-surface-hover/[0.08] p-0.5">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setActiveMode(mode.id)}
          className={cn(
            'px-2 py-0.5 text-[10px] font-medium rounded transition-colors',
            activeMode === mode.id
              ? 'bg-surface-solid text-text-1 shadow-sm'
              : 'text-text-3 hover:text-text-2'
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
})

export function StatusBar() {
  const { selectedProjectId, projects } = useProjectsStore()
  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const navigate = useNavigate()
  const {
    snapshotsOpen,
    setSnapshotsOpen,
    aboutOpen,
    setAboutOpen,
    helpOpen,
    setHelpOpen,
    keyboardShortcutsOpen,
    setKeyboardShortcutsOpen,
  } = useAppStore()

  // Listen for ? key to open keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not in an input/textarea and ? is pressed
      if (
        e.key === '?' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName || '')
      ) {
        e.preventDefault()
        // Use getState() to avoid dependency on setKeyboardShortcutsOpen
        void useAppStore.getState().setKeyboardShortcutsOpen(true)
      }
    }

    const globalKey = '__codex_statusbar_keydown__'
    const existing = (window as unknown as Record<string, EventListener | undefined>)[globalKey]
    if (existing) {
      window.removeEventListener('keydown', existing)
    }

    window.addEventListener('keydown', handleKeyDown as EventListener)
    ;(window as unknown as Record<string, EventListener | undefined>)[globalKey] = handleKeyDown as EventListener

    const cleanup = () => {
      window.removeEventListener('keydown', handleKeyDown)
      const current = (window as unknown as Record<string, EventListener | undefined>)[globalKey]
      if (current === handleKeyDown) {
        delete (window as unknown as Record<string, EventListener | undefined>)[globalKey]
      }
    }
    if (import.meta.hot) {
      import.meta.hot.dispose(cleanup)
    }
    return cleanup
  }, [])

  return (
    <>
      <div className="flex h-8 items-center justify-between bg-surface/50 backdrop-blur-md px-4 text-[11px] font-medium tracking-tight text-text-3 border-t border-stroke/10">
        <div className="flex items-center gap-4">
          <ContextModeTabs />
          <ServerStatusIndicator />
          <TurnStatusIndicator />
          <ConnectedTokenUsageIndicator />
        </div>

        <div className="flex items-center gap-3">
          {selectedProject?.path && <GitInfoIndicator projectPath={selectedProject.path} />}
          <AccountInfoSection />
          <StatusBarActions
            onHelpClick={() => setHelpOpen(true)}
            onAboutClick={() => setAboutOpen(true)}
            onSettingsClick={() => navigate('/settings')}
            onSnapshotsClick={() => setSnapshotsOpen(true)}
          />
        </div>
      </div>
      <SnapshotListDialog isOpen={snapshotsOpen} onClose={() => setSnapshotsOpen(false)} />
      <AboutDialog isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
      <HelpDialog isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      <KeyboardShortcutsDialog isOpen={keyboardShortcutsOpen} onClose={() => setKeyboardShortcutsOpen(false)} />
    </>
  )
}
