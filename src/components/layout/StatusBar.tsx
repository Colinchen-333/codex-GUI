import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GitBranch, ShieldAlert } from 'lucide-react'
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
import { GlobalApprovalsIndicator } from './status-bar/GlobalApprovalsIndicator'
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
        className="h-toolbar-sm flex items-center justify-between border-t border-stroke/20 bg-surface-solid/85 px-3 text-[11px] text-text-3 backdrop-blur-md"
        data-tauri-drag-region
      >
        <div className="no-drag pointer-events-auto flex items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-md border border-stroke/20 bg-surface-solid px-2 text-text-2">
            Local
          </span>

          <span
            className={cn(
              'inline-flex h-6 items-center gap-1 rounded-md border px-2',
              permission.danger
                ? 'border-status-warning/30 bg-status-warning-muted text-status-warning'
                : 'border-stroke/20 bg-surface-solid text-text-2'
            )}
          >
            {permission.danger && <ShieldAlert size={11} />}
            {permission.text}
          </span>

          <span className={cn(
            'inline-flex h-6 items-center gap-1.5 px-1',
            isConnected ? 'text-text-2' : 'text-status-warning'
          )}>
            <span className={cn(
              'h-1.5 w-1.5 rounded-full',
              isReconnecting ? 'bg-status-warning animate-pulse' : isConnected ? 'bg-status-success' : 'bg-status-error'
            )} />
            {engineLabel}
          </span>

          {!isConnected && (
            <button
              type="button"
              onClick={handleRestartEngine}
              disabled={isReconnecting}
              className="inline-flex h-6 items-center rounded-md px-1 text-text-2 transition-colors hover:text-text-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Restart
            </button>
          )}

        </div>

        <div className="flex items-center gap-2">
          {!isConnected && (
            <span className="text-[11px] tracking-[0.14em] text-text-3">AUTH REQUIRED</span>
          )}

          {(branch || selectedProject) && (
            <span className="inline-flex h-6 items-center gap-1 rounded-md border border-stroke/20 bg-surface-solid px-2 text-text-2">
              <GitBranch size={11} />
              {branch || 'main'}
            </span>
          )}

          <GlobalApprovalsIndicator />

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
