import { useState, useMemo, useRef, useEffect } from 'react'
import { FileCode, Terminal } from 'lucide-react'
import { SwarmControlBar } from './SwarmControlBar'
import { SwarmTaskBoard } from './SwarmTaskBoard'
import { SwarmMessageFeed } from './SwarmMessageFeed'
import { SwarmWorkerCards } from './SwarmWorkerCards'
import { SwarmInput } from './SwarmInput'
import { useSwarmStore } from '../../stores/swarm'
import { DiffView, type FileDiff } from '../ui/DiffView'
import { parseGitDiff } from '../../lib/gitDiffUtils'

type RightTab = 'messages' | 'diff' | 'output'

export function SwarmView() {
  const stagingDiff = useSwarmStore((s) => s.stagingDiff)
  const workers = useSwarmStore((s) => s.workers)
  const [rightTab, setRightTab] = useState<RightTab>('messages')

  const fileDiffs = useMemo<FileDiff[]>(() => {
    if (!stagingDiff) return []
    return parseGitDiff(stagingDiff)
  }, [stagingDiff])

  const hasDiff = fileDiffs.length > 0
  const hasActiveWorkers = workers.some((w) => w.status === 'working' || w.status === 'merging')

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <SwarmControlBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Task Board */}
        <div className="w-[340px] min-w-[280px] max-w-[480px] shrink-0 border-r border-stroke/10 overflow-y-auto p-4">
          <SwarmTaskBoard />
        </div>
        {/* Right: Message Feed / Diff Viewer / Output */}
        <div className="flex flex-1 min-w-[300px] flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center border-b border-stroke/10 px-4" role="tablist" aria-label="Swarm details">
            <button
              role="tab"
              aria-selected={rightTab === 'messages'}
              aria-controls="swarm-panel-messages"
              className={`px-3 py-2 text-[13px] font-medium border-b-2 transition-colors ${
                rightTab === 'messages'
                  ? 'border-primary text-text-1'
                  : 'border-transparent text-text-3 hover:text-text-2'
              }`}
              onClick={() => setRightTab('messages')}
            >
              Messages
            </button>
            {hasDiff && (
              <button
                role="tab"
                aria-selected={rightTab === 'diff'}
                aria-controls="swarm-panel-diff"
                className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition-colors ${
                  rightTab === 'diff'
                    ? 'border-primary text-text-1'
                    : 'border-transparent text-text-3 hover:text-text-2'
                }`}
                onClick={() => setRightTab('diff')}
              >
                <FileCode size={14} />
                Changes
                <span className="text-[11px] px-1.5 rounded-full bg-primary/15 text-primary">
                  {fileDiffs.length}
                </span>
              </button>
            )}
            <button
              role="tab"
              aria-selected={rightTab === 'output'}
              aria-controls="swarm-panel-output"
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition-colors ${
                rightTab === 'output'
                  ? 'border-primary text-text-1'
                  : 'border-transparent text-text-3 hover:text-text-2'
              }`}
              onClick={() => setRightTab('output')}
            >
              <Terminal size={14} />
              Output
              {hasActiveWorkers && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          </div>

          {/* Tab content */}
          {rightTab === 'messages' ? (
            <div id="swarm-panel-messages" role="tabpanel" className="flex-1 overflow-y-auto p-4">
              <SwarmMessageFeed />
            </div>
          ) : rightTab === 'diff' && hasDiff ? (
            <div id="swarm-panel-diff" role="tabpanel" className="flex flex-1 flex-col overflow-hidden">
              <SwarmDiffPanel fileDiffs={fileDiffs} />
            </div>
          ) : rightTab === 'output' ? (
            <div id="swarm-panel-output" role="tabpanel" className="flex flex-1 flex-col overflow-hidden">
              <SwarmOutputPanel />
            </div>
          ) : (
            <div id="swarm-panel-messages" role="tabpanel" className="flex-1 overflow-y-auto p-4">
              <SwarmMessageFeed />
            </div>
          )}
        </div>
      </div>

      {/* Worker status strip */}
      <SwarmWorkerCards />

      {/* Input area */}
      <SwarmInput />
    </div>
  )
}

function SwarmDiffPanel({ fileDiffs }: { fileDiffs: FileDiff[] }) {
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set())

  const totalStats = useMemo(() => {
    let additions = 0
    let deletions = 0
    for (const file of fileDiffs) {
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'add') additions += 1
          if (line.type === 'remove') deletions += 1
        }
      }
    }
    return { additions, deletions }
  }, [fileDiffs])

  const toggleCollapse = (path: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Summary header */}
      <div className="mb-3 flex items-center gap-3 text-[13px]">
        <span className="font-medium text-text-1">
          {fileDiffs.length} file{fileDiffs.length !== 1 ? 's' : ''} changed
        </span>
        {totalStats.additions > 0 && (
          <span className="text-status-success">+{totalStats.additions}</span>
        )}
        {totalStats.deletions > 0 && (
          <span className="text-status-error">-{totalStats.deletions}</span>
        )}
      </div>

      {/* File diffs */}
      <div className="flex flex-col gap-3">
        {fileDiffs.map((file) => (
          <DiffView
            key={file.path}
            diff={file}
            collapsed={collapsedFiles.has(file.path)}
            onToggleCollapse={() => toggleCollapse(file.path)}
            showViewToggle={false}
            showSigns={true}
            lineNumberMode="single"
          />
        ))}
      </div>
    </div>
  )
}

const MSG_TYPE_COLORS: Record<string, string> = {
  status: 'text-text-2',
  broadcast: 'text-primary',
  discovery: 'text-status-info',
  error: 'text-status-error',
}

function SwarmOutputPanel() {
  const workers = useSwarmStore((s) => s.workers)
  const messages = useSwarmStore((s) => s.messages)
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | 'all'>('all')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Filter messages by selected worker
  const filteredMessages = useMemo(() => {
    if (selectedWorkerId === 'all') return messages
    const worker = workers.find((w) => w.id === selectedWorkerId)
    if (!worker) return []
    return messages.filter((m) => m.from === worker.name)
  }, [messages, workers, selectedWorkerId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [filteredMessages.length])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Worker selector */}
      <div className="flex items-center gap-2 border-b border-stroke/10 px-4 py-2">
        <label htmlFor="worker-select" className="text-[12px] text-text-3">
          Filter:
        </label>
        <select
          id="worker-select"
          value={selectedWorkerId}
          onChange={(e) => setSelectedWorkerId(e.target.value)}
          className="rounded border border-stroke/20 bg-surface px-2 py-1 text-[12px] text-text-1 focus-visible:border-primary focus-visible:outline-none"
        >
          <option value="all">All Workers</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
              {w.status === 'working' ? ' (active)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Terminal-like output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-background p-4 font-mono text-[12px] leading-relaxed"
      >
        {workers.length === 0 ? (
          <div className="flex h-full items-center justify-center text-text-3">
            No workers running
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-text-3">
            No output yet
          </div>
        ) : (
          <div className="space-y-1">
            {filteredMessages.map((msg) => (
              <div key={msg.id} className="flex gap-2">
                <span className="shrink-0 text-text-3">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="shrink-0 font-semibold text-text-2">
                  [{msg.from}]
                </span>
                <span className={MSG_TYPE_COLORS[msg.type] || 'text-text-2'}>
                  {msg.content}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
