import { useState } from 'react'
import { RefreshCw, ChevronDown, ChevronRight, Terminal, Cpu, HardDrive } from 'lucide-react'
import { PageScaffold } from '../components/layout/PageScaffold'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'

type ProcessInfo = {
  id: string
  name: string
  pid: number
  status: 'running' | 'stopped'
  memory: string
}

type DebugSection = {
  id: string
  title: string
  icon: React.ReactNode
  expanded: boolean
}

const SAMPLE_PROCESSES: ProcessInfo[] = [
  { id: 'p1', name: 'codex-server', pid: 12345, status: 'running', memory: '128 MB' },
  { id: 'p2', name: 'language-server', pid: 12346, status: 'running', memory: '256 MB' },
  { id: 'p3', name: 'file-watcher', pid: 12347, status: 'running', memory: '64 MB' },
]

export function DebugPage() {
  const [processes, setProcesses] = useState<ProcessInfo[]>(SAMPLE_PROCESSES)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sections, setSections] = useState<DebugSection[]>([
    { id: 'processes', title: 'Child Processes', icon: <Cpu size={14} />, expanded: true },
    { id: 'storage', title: 'Storage', icon: <HardDrive size={14} />, expanded: false },
    { id: 'logs', title: 'Logs', icon: <Terminal size={14} />, expanded: false },
  ])

  const [systemInfo] = useState({
    platform: 'darwin',
    arch: 'arm64',
    version: '0.1.0',
    electron: '28.0.0',
    node: '18.18.0',
  })

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setProcesses(SAMPLE_PROCESSES.map((p) => ({ ...p, memory: `${Math.floor(Math.random() * 256) + 64} MB` })))
      setIsRefreshing(false)
    }, 500)
  }

  const toggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s))
    )
  }

  return (
    <PageScaffold title="Debug" description="System diagnostics and debug tools.">
      <div className="space-y-6">
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary">
          Debug Panel — Development diagnostics
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-1">System Info</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw size={14} className={cn(isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-stroke/20 bg-surface-solid p-4">
            <div className="text-xs text-text-3">Platform</div>
            <div className="mt-1 text-sm font-medium text-text-1">{systemInfo.platform} ({systemInfo.arch})</div>
          </div>
          <div className="rounded-xl border border-stroke/20 bg-surface-solid p-4">
            <div className="text-xs text-text-3">Version</div>
            <div className="mt-1 text-sm font-medium text-text-1">{systemInfo.version}</div>
          </div>
          <div className="rounded-xl border border-stroke/20 bg-surface-solid p-4">
            <div className="text-xs text-text-3">Runtime</div>
            <div className="mt-1 text-sm font-medium text-text-1">Electron {systemInfo.electron}</div>
          </div>
        </div>

        <div className="space-y-2">
          {sections.map((section) => (
            <div key={section.id} className="rounded-xl border border-stroke/20 bg-surface-solid overflow-hidden">
              <button
                className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-surface-hover/[0.05] transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                {section.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="text-text-3">{section.icon}</span>
                <span className="text-sm font-medium text-text-1">{section.title}</span>
              </button>

              {section.expanded && section.id === 'processes' && (
                <div className="border-t border-stroke/10 px-4 py-3">
                  {processes.length === 0 ? (
                    <p className="text-sm text-text-3">No active processes.</p>
                  ) : (
                    <div className="space-y-2">
                      {processes.map((proc) => (
                        <div
                          key={proc.id}
                          className="flex items-center justify-between rounded-lg bg-surface-hover/[0.05] px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              'h-2 w-2 rounded-full',
                              proc.status === 'running' ? 'bg-emerald-500' : 'bg-text-3'
                            )} />
                            <div>
                              <div className="text-sm font-medium text-text-1">{proc.name}</div>
                              <div className="text-xs text-text-3">PID: {proc.pid}</div>
                            </div>
                          </div>
                          <div className="text-xs text-text-3">{proc.memory}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {section.expanded && section.id === 'storage' && (
                <div className="border-t border-stroke/10 px-4 py-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-text-3">Cache</span>
                      <span className="text-text-1">24.5 MB</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-3">Logs</span>
                      <span className="text-text-1">8.2 MB</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-3">Sessions</span>
                      <span className="text-text-1">156 KB</span>
                    </div>
                  </div>
                </div>
              )}

              {section.expanded && section.id === 'logs' && (
                <div className="border-t border-stroke/10 px-4 py-3">
                  <div className="rounded-lg bg-surface-hover/[0.05] p-3 font-mono text-xs text-text-3 max-h-[200px] overflow-y-auto">
                    <div>[INFO] Application started</div>
                    <div>[INFO] Connected to language server</div>
                    <div>[INFO] Workspace loaded: codex-GUI</div>
                    <div>[DEBUG] File watcher initialized</div>
                    <div>[INFO] Ready</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </PageScaffold>
  )
}
