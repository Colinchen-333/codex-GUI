import { useCallback, useMemo, useState, useEffect } from 'react'
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Terminal,
  Cpu,
  HardDrive,
  Activity,
  Trash2,
} from 'lucide-react'
import { PageScaffold } from '../components/layout/PageScaffold'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'
import { APP_NAME, APP_VERSION } from '../lib/appMeta'
import { serverApi, systemApi, type AppPaths, type LogTailResponse, type ServerStatus } from '../lib/api'
import { copyTextToClipboard } from '../lib/clipboard'
import { logger, type LogEntry } from '../lib/logger'
import { isTauriAvailable } from '../lib/tauri'
import { buildDiagnosticsReportJson } from '../lib/diagnostics'
import { useToast } from '../components/ui/Toast'

type DebugSectionId = 'engine' | 'storage' | 'logs'

type DebugSection = {
  id: DebugSectionId
  title: string
  icon: React.ReactNode
  expanded: boolean
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let value = bytes
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  const rounded = value >= 10 || i === 0 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[i]}`
}

function computeLocalStorageBytes(): number {
  try {
    let bytes = 0
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key) continue
      const value = localStorage.getItem(key) ?? ''
      bytes += key.length + value.length
    }
    return bytes
  } catch {
    return 0
  }
}

function formatLogLine(entry: LogEntry): string {
  const ts = new Date(entry.timestamp).toISOString()
  const prefix = entry.context ? `[${entry.context}] ` : ''
  return `${ts} [${entry.level.toUpperCase()}] ${prefix}${entry.message}`
}

export function DebugPage() {
  const { toast } = useToast()
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [fileLogs, setFileLogs] = useState<LogTailResponse | null>(null)
  const [isLoadingFileLogs, setIsLoadingFileLogs] = useState(false)
  const [appPaths, setAppPaths] = useState<AppPaths>({ appDataDir: null, logDir: null })
  const [storageInfo, setStorageInfo] = useState(() => {
    const bytes = computeLocalStorageBytes()
    return {
      localStorageBytes: bytes,
      localStorageHuman: formatBytes(bytes),
      keys: (() => {
        try {
          return localStorage.length
        } catch {
          return 0
        }
      })(),
    }
  })
  const [sections, setSections] = useState<DebugSection[]>([
    { id: 'engine', title: 'Engine', icon: <Activity size={14} />, expanded: true },
    { id: 'storage', title: 'Storage', icon: <HardDrive size={14} />, expanded: false },
    { id: 'logs', title: 'Logs', icon: <Terminal size={14} />, expanded: true },
  ])

  const runtimeInfo = useMemo(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    return {
      isTauri: isTauriAvailable(),
      mode: import.meta.env.MODE,
      userAgent: ua,
    }
  }, [])

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [status, paths] = await Promise.all([
        serverApi.getStatus(),
        isTauriAvailable() ? systemApi.getAppPaths() : Promise.resolve({ appDataDir: null, logDir: null }),
      ])
      setServerStatus(status)
      setAppPaths(paths)
      setLogs(logger.getLogs().slice(-400))
      const bytes = computeLocalStorageBytes()
      setStorageInfo({
        localStorageBytes: bytes,
        localStorageHuman: formatBytes(bytes),
        keys: (() => {
          try {
            return localStorage.length
          } catch {
            return 0
          }
        })(),
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const toggleSection = (id: DebugSectionId) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s)))
  }

  const handleClearLogs = () => {
    logger.clearLogs()
    setLogs([])
  }

  const copyToClipboard = useCallback(async (text: string, successTitle: string) => {
    try {
      const ok = await copyTextToClipboard(text)
      if (ok) {
        toast.success(successTitle)
      } else {
        toast.error('Copy failed')
      }
    } catch (e) {
      toast.error('Copy failed', { message: String(e) })
    }
  }, [toast])

  const copyReport = useCallback(() => {
    void buildDiagnosticsReportJson({ includeFileLogs: !!fileLogs })
      .then((json) => copyToClipboard(json, 'Copied diagnostics report'))
      .catch((e) => toast.error('Failed to build diagnostics report', { message: String(e) }))
  }, [copyToClipboard, fileLogs, toast])

  const loadFileLogs = useCallback(async () => {
    if (!isTauriAvailable()) return
    setIsLoadingFileLogs(true)
    try {
      const tail = await systemApi.getLogTail(200_000)
      setFileLogs(tail)
      if (!tail.content) {
        toast.info('No log content found', { message: 'The log directory may be empty.' })
      }
    } catch (e) {
      toast.error('Failed to load file logs', { message: String(e) })
    } finally {
      setIsLoadingFileLogs(false)
    }
  }, [toast])

  const engineLabel = serverStatus?.isRunning ? 'Running' : 'Stopped'
  const engineColor = serverStatus?.isRunning ? 'text-status-success' : 'text-status-error'

  return (
    <PageScaffold title="Debug" description="Diagnostics and troubleshooting tools.">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-3">
            {APP_NAME} <span className="font-mono text-text-2">{APP_VERSION}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyReport} className="gap-2">
              Copy Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw size={14} className={cn(isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-stroke/20 bg-surface-solid p-4">
            <div className="text-xs text-text-3">Runtime</div>
            <div className="mt-1 text-sm font-medium text-text-1">
              {runtimeInfo.isTauri ? 'Tauri' : 'Web'} ({runtimeInfo.mode})
            </div>
          </div>
          <div className="rounded-xl border border-stroke/20 bg-surface-solid p-4">
            <div className="text-xs text-text-3">Engine</div>
            <div className={cn('mt-1 text-sm font-medium', engineColor)}>{engineLabel}</div>
          </div>
          <div className="rounded-xl border border-stroke/20 bg-surface-solid p-4">
            <div className="text-xs text-text-3">Engine Version</div>
            <div className="mt-1 text-sm font-medium text-text-1 font-mono truncate">
              {serverStatus?.version || 'Unknown'}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {sections.map((section) => (
            <div
              key={section.id}
              className="rounded-xl border border-stroke/20 bg-surface-solid overflow-hidden"
            >
              <button
                className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-surface-hover/[0.05] transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                {section.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="text-text-3">{section.icon}</span>
                <span className="text-sm font-medium text-text-1">{section.title}</span>
              </button>

              {section.expanded && section.id === 'engine' && (
                <div className="border-t border-stroke/10 px-4 py-3">
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div className="rounded-lg bg-surface-hover/[0.05] p-3">
                      <div className="text-xs text-text-3">Status</div>
                      <div className={cn('mt-1 font-medium', engineColor)}>{engineLabel}</div>
                    </div>
                    <div className="rounded-lg bg-surface-hover/[0.05] p-3">
                      <div className="text-xs text-text-3">Installed CLI</div>
                      <div className="mt-1 font-mono text-text-2 truncate">
                        {serverStatus?.version || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {section.expanded && section.id === 'storage' && (
                <div className="border-t border-stroke/10 px-4 py-3">
                  <div className="space-y-2 text-sm">
                    {appPaths.appDataDir && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-text-3">appDataDir</span>
                        <button
                          type="button"
                          className="font-mono text-xs text-text-2 hover:text-text-1 truncate"
                          onClick={() => void copyToClipboard(appPaths.appDataDir ?? '', 'Copied appDataDir')}
                        >
                          {appPaths.appDataDir}
                        </button>
                      </div>
                    )}
                    {appPaths.logDir && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-text-3">logDir</span>
                        <button
                          type="button"
                          className="font-mono text-xs text-text-2 hover:text-text-1 truncate"
                          onClick={() => void copyToClipboard(appPaths.logDir ?? '', 'Copied logDir')}
                        >
                          {appPaths.logDir}
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-text-3">localStorage</span>
                      <span className="font-mono text-text-2">
                        {storageInfo.localStorageHuman} ({storageInfo.keys} keys)
                      </span>
                    </div>
                    <div className="text-xs text-text-3 break-all">
                      User-Agent: {runtimeInfo.userAgent}
                    </div>
                  </div>
                </div>
              )}

              {section.expanded && section.id === 'logs' && (
                <div className="border-t border-stroke/10 px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-text-3">
                      <Cpu size={14} />
                      <span>{logs.length} entries (in-memory)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void copyToClipboard(logs.map(formatLogLine).join('\n'), 'Copied log snapshot')}
                        className="gap-2"
                        disabled={logs.length === 0}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearLogs}
                        className="gap-2"
                        disabled={logs.length === 0}
                      >
                        <Trash2 size={14} />
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface-hover/[0.05] p-3 font-mono text-xs text-text-3 max-h-[260px] overflow-y-auto space-y-1">
                    {logs.length === 0 ? (
                      <div>No logs captured yet.</div>
                    ) : (
                      logs.map((entry, idx) => (
                        <div key={`${entry.timestamp}-${idx}`}>{formatLogLine(entry)}</div>
                      ))
                    )}
                  </div>

                  {runtimeInfo.isTauri && appPaths.logDir && (
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-text-3">
                          <Terminal size={14} />
                          <span>
                            File logs{fileLogs?.file ? `: ${fileLogs.file.split('/').pop()}` : ''}
                            {fileLogs?.truncated ? ' (truncated)' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void loadFileLogs()}
                            disabled={isLoadingFileLogs}
                          >
                            {isLoadingFileLogs ? 'Loading…' : 'Load'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void copyToClipboard(fileLogs?.content ?? '', 'Copied file log tail')}
                            disabled={!fileLogs?.content}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-lg bg-surface-hover/[0.05] p-3 font-mono text-xs text-text-3 max-h-[260px] overflow-y-auto whitespace-pre-wrap">
                        {fileLogs?.content ? fileLogs.content : 'No file logs loaded.'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PageScaffold>
  )
}
