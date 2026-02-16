/**
 * ImportCodexSessionDialog - Import sessions from Codex CLI (~/.codex/sessions/)
 */
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import {
  Clock,
  Download,
  FileText,
  FolderOpen,
  GitBranch,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { codexImportApi, type CodexSessionSummary } from '../../lib/api'
import { useToast } from '../ui/Toast'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useDialogKeyboardShortcut } from '../../hooks/useDialogKeyboardShortcut'
import { logError } from '../../lib/errorUtils'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { clearCache } from '../../lib/apiCache'
import { BaseDialog } from '../ui/BaseDialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { IconButton } from '../ui/IconButton'
import { Badge } from '../ui/Badge'

interface ImportCodexSessionDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (session: CodexSessionSummary) => void
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      if (hours > 0) return `${hours}h ${minutes}m ago`
      if (minutes > 0) return `${minutes}m ago`
      return 'Just now'
    }

    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000)
      return `${days}d ago`
    }

    return date.toLocaleDateString()
  } catch {
    return timestamp
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function ImportCodexSessionDialog({ isOpen, onClose, onImport }: ImportCodexSessionDialogProps) {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<CodexSessionSummary[]>([])
  const [filteredSessions, setFilteredSessions] = useState<CodexSessionSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSession, setSelectedSession] = useState<CodexSessionSummary | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; session: CodexSessionSummary | null }>({
    isOpen: false,
    session: null,
  })

  const searchInputRef = useRef<HTMLInputElement>(null)

  useDialogKeyboardShortcut({
    isOpen,
    onConfirm: () => {
      if (!selectedSession) return
      onImport(selectedSession)
      onClose()
    },
    onCancel: onClose,
    requireModifierKey: false,
    inputRef: searchInputRef,
  })

  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await codexImportApi.listSessions()
      setSessions(data)
      setFilteredSessions(data)
    } catch (error) {
      logError(error, {
        context: 'ImportCodexSessionDialog',
        source: 'dialogs',
        details: 'Failed to load Codex CLI sessions',
      })
      toast.error('Failed to load Codex CLI sessions')
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSelectedSession(null)
      return
    }
    void loadSessions()
    const rafId = window.requestAnimationFrame(() => searchInputRef.current?.focus())
    return () => window.cancelAnimationFrame(rafId)
  }, [isOpen, loadSessions])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = sessions.filter((s) => {
      return (
        s.projectName.toLowerCase().includes(query) ||
        s.cwd.toLowerCase().includes(query) ||
        s.firstMessage?.toLowerCase().includes(query) ||
        s.gitBranch?.toLowerCase().includes(query)
      )
    })
    setFilteredSessions(filtered)
  }, [searchQuery, sessions])

  const groupedSessions = useMemo(() => {
    const groups: Record<string, CodexSessionSummary[]> = {}
    for (const session of filteredSessions) {
      const key = session.cwd
      ;(groups[key] ||= []).push(session)
    }
    return groups
  }, [filteredSessions])

  const handleRefresh = useCallback(() => {
    clearCache('codex_cli_sessions')
    void loadSessions()
  }, [loadSessions])

  const handleDeleteClick = (session: CodexSessionSummary, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDelete({ isOpen: true, session })
  }

  const handleDeleteConfirm = async () => {
    const session = confirmDelete.session
    if (!session) return

    setConfirmDelete({ isOpen: false, session: null })
    try {
      await codexImportApi.deleteSession(session.id)
      toast.success('Session deleted')
      setSessions((prev) => prev.filter((s) => s.id !== session.id))
      setFilteredSessions((prev) => prev.filter((s) => s.id !== session.id))
      if (selectedSession?.id === session.id) setSelectedSession(null)
    } catch (error) {
      logError(error, {
        context: 'ImportCodexSessionDialog',
        source: 'dialogs',
        details: 'Failed to delete session',
      })
      toast.error('Failed to delete session')
    }
  }

  const handleImport = () => {
    if (!selectedSession) return
    onImport(selectedSession)
    onClose()
  }

  const errorFallback = (
    <BaseDialog
      isOpen={true}
      onClose={onClose}
      title="Import unavailable"
      description="Something went wrong while loading Codex CLI sessions."
      titleIcon={<Download size={16} />}
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="p-6 text-sm text-text-3">Something went wrong while loading Codex CLI sessions.</div>
    </BaseDialog>
  )

  return (
    <ErrorBoundary fallback={errorFallback}>
      <BaseDialog
        isOpen={isOpen}
        onClose={onClose}
        title="Import Codex CLI Session"
        description="Browse and import sessions from your local Codex CLI history."
        titleIcon={<Download size={16} />}
        maxWidth="xl"
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            <div className="text-xs text-text-3">
              {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''} found
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleImport} disabled={!selectedSession}>
                Import
              </Button>
            </div>
          </div>
        }
      >
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Search by project, path, message, or branch…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search size={14} />}
              />
            </div>
            <IconButton
              variant="outline"
              size="md"
              onClick={handleRefresh}
              disabled={isLoading}
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </IconButton>
          </div>

          <div className="max-h-[420px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center gap-2 text-sm text-text-3">
                <RefreshCw size={16} className="animate-spin" />
                Loading sessions from <span className="font-mono">~/.codex/sessions/</span>…
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-sm text-text-3">
                <FileText size={32} className="mb-3 opacity-60" />
                {sessions.length === 0 ? (
                  <>
                    <p className="text-text-2 font-medium">No Codex CLI sessions found</p>
                    <p className="text-xs mt-1">
                      Sessions are stored in <span className="font-mono">~/.codex/sessions/</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-text-2 font-medium">No sessions match your search</p>
                    <p className="text-xs mt-1">Try a different query</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedSessions).map(([cwd, projectSessions]) => (
                  <div key={cwd} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-text-3">
                      <FolderOpen size={12} />
                      <span className="truncate">{cwd}</span>
                      <Badge variant="secondary">
                        {projectSessions.length} session{projectSessions.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {projectSessions.map((session) => {
                      const selected = selectedSession?.id === session.id
                      return (
                        <div
                          key={session.id}
                          className={cn(
                            'group flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                            selected
                              ? 'border-primary/50 bg-primary/10'
                              : 'border-stroke/20 bg-surface-solid hover:bg-surface-hover/[0.06]'
                          )}
                          onClick={() => setSelectedSession(session)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-1 truncate">
                              {session.firstMessage || 'No message preview'}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-text-3">
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {formatTimestamp(session.timestamp)}
                              </span>
                              {session.gitBranch && (
                                <span className="flex items-center gap-1">
                                  <GitBranch size={10} />
                                  {session.gitBranch}
                                </span>
                              )}
                              <span>{session.messageCount} messages</span>
                              <span>{formatFileSize(session.fileSize)}</span>
                            </div>
                          </div>

                          <IconButton
                            variant="ghost"
                            size="sm"
                            className="text-text-3/70 hover:text-status-error"
                            onClick={(e) => handleDeleteClick(session, e)}
                            aria-label="Delete session"
                            title="Delete session"
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <ConfirmDialog
          isOpen={confirmDelete.isOpen}
          title="Delete session"
          message="This will permanently delete the session file from disk. This cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={() => setConfirmDelete({ isOpen: false, session: null })}
        />
      </BaseDialog>
    </ErrorBoundary>
  )
}
