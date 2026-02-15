import { APP_NAME, APP_VERSION } from './appMeta'
import { serverApi, systemApi, type AppPaths, type LogTailResponse, type ServerStatus } from './api'
import { logger, type LogEntry } from './logger'
import { isTauriAvailable } from './tauri'

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

export type DiagnosticsReport = {
  app: { name: string; version: string; mode: string }
  engine: ServerStatus | null
  runtime: { isTauri: boolean; userAgent: string }
  paths: AppPaths
  storage: { localStorageBytes: number; localStorageHuman: string; keys: number }
  logs: string[]
  fileLogs: { file: string | null; truncated: boolean } | null
  capturedAt: string
}

export async function buildDiagnosticsReport(options?: {
  includeFileLogs?: boolean
  maxFileLogBytes?: number
}): Promise<DiagnosticsReport> {
  const includeFileLogs = options?.includeFileLogs ?? false
  const maxFileLogBytes = options?.maxFileLogBytes ?? 200_000

  const [engine, paths, fileLogs] = await Promise.all([
    serverApi.getStatus().catch(() => null),
    isTauriAvailable()
      ? systemApi.getAppPaths().catch(() => ({ appDataDir: null, logDir: null }))
      : Promise.resolve({ appDataDir: null, logDir: null }),
    includeFileLogs && isTauriAvailable()
      ? systemApi.getLogTail(maxFileLogBytes).catch<LogTailResponse>(() => ({ file: null, content: '', truncated: false }))
      : Promise.resolve(null),
  ])

  const storageBytes = computeLocalStorageBytes()
  const storageKeys = (() => {
    try {
      return localStorage.length
    } catch {
      return 0
    }
  })()

  return {
    app: { name: APP_NAME, version: APP_VERSION, mode: import.meta.env.MODE },
    engine,
    runtime: {
      isTauri: isTauriAvailable(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    },
    paths,
    storage: {
      localStorageBytes: storageBytes,
      localStorageHuman: formatBytes(storageBytes),
      keys: storageKeys,
    },
    logs: logger.getLogs().slice(-400).map(formatLogLine),
    fileLogs: fileLogs ? { file: fileLogs.file, truncated: fileLogs.truncated } : null,
    capturedAt: new Date().toISOString(),
  }
}

export async function buildDiagnosticsReportJson(options?: {
  includeFileLogs?: boolean
  maxFileLogBytes?: number
}): Promise<string> {
  const report = await buildDiagnosticsReport(options)
  return JSON.stringify(report, null, 2)
}

