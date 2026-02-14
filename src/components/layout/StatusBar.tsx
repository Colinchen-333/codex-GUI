import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, GitBranch, ShieldAlert } from 'lucide-react'
import {
  SnapshotListDialog,
  AboutDialog,
  HelpDialog,
  KeyboardShortcutsDialog,
} from '../LazyComponents'
import { useProjectsStore } from '../../stores/projects'
import { useSettingsStore } from '../../stores/settings'
import { useServerConnectionStore } from '../../stores/server-connection'
import { useAppStore } from '../../stores/app'
import { StatusBarActions } from './status-bar'
import { cn } from '../../lib/utils'

function sandboxLabel(mode: string): { text: string; danger: boolean } {
  switch (mode) {
    case 'danger-full-access':
      return { text: 'Full access', danger: true }
    case 'read-only':
      return { text: 'Read only', danger: false }
    default:
      return { text: 'Workspace write', danger: false }
  }
}

export function StatusBar() {
  const navigate = useNavigate()
  const { selectedProjectId, projects, gitInfo } = useProjectsStore()
  const settings = useSettingsStore((state) => state.settings)
  const { isConnected, isReconnecting, startMonitoring, attemptReconnect } = useServerConnectionStore()

  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const branch = selectedProjectId ? gitInfo[selectedProjectId]?.branch : null
  const permission = sandboxLabel(settings.sandboxMode)
  const engineLabel = isReconnecting ? 'Engine reconnecting' : isConnected ? 'Engine online' : 'Engine offline'

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

  useEffect(() => {
    startMonitoring()
  }, [startMonitoring])

  const handleRestartEngine = useCallback(() => {
    void attemptReconnect({ forceRestart: true })
  }, [attemptReconnect])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '?' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName || '')
      ) {
        e.preventDefault()
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
      <div
        className="h-toolbar-sm flex items-center justify-between border-t border-token-border bg-token-surface-primary/85 px-3 text-[11px] text-token-text-tertiary backdrop-blur-md"
        data-tauri-drag-region
      >
        <div className="no-drag pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-6 items-center gap-1 rounded-md border border-token-border bg-token-surface-tertiary px-2 text-token-description-foreground"
          >
            Local
            <ChevronDown size={11} />
          </button>

          <span
            className={cn(
              'inline-flex h-6 items-center gap-1 rounded-md border px-2',
              permission.danger
                ? 'border-orange-500/30 bg-orange-500/10 text-orange-500'
                : 'border-token-border bg-token-surface-tertiary text-token-description-foreground'
            )}
          >
            {permission.danger && <ShieldAlert size={11} />}
            {permission.text}
          </span>

          <span className="inline-flex h-6 items-center px-1 text-token-description-foreground">
            {engineLabel}
          </span>

          <button
            type="button"
            onClick={handleRestartEngine}
            disabled={isReconnecting}
            className="inline-flex h-6 items-center rounded-md px-1 text-token-description-foreground transition-colors hover:text-token-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Restart
          </button>

        </div>

        <div className="flex items-center gap-2">
          {!isConnected && (
            <span className="text-[11px] tracking-[0.14em] text-token-text-tertiary">AUTH REQUIRED</span>
          )}

          {(branch || selectedProject) && (
            <span className="inline-flex h-6 items-center gap-1 rounded-md border border-token-border bg-token-surface-tertiary px-2 text-token-description-foreground">
              <GitBranch size={11} />
              {branch || 'main'}
              <ChevronDown size={11} />
            </span>
          )}

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
