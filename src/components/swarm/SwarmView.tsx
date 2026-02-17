import { useState, useMemo } from 'react'
import { FileCode } from 'lucide-react'
import { SwarmControlBar } from './SwarmControlBar'
import { SwarmTaskBoard } from './SwarmTaskBoard'
import { SwarmMessageFeed } from './SwarmMessageFeed'
import { SwarmWorkerCards } from './SwarmWorkerCards'
import { SwarmInput } from './SwarmInput'
import { useSwarmStore } from '../../stores/swarm'
import { DiffView, type FileDiff } from '../ui/DiffView'
import { parseGitDiff } from '../../lib/gitDiffUtils'

type RightTab = 'messages' | 'diff'

export function SwarmView() {
  const stagingDiff = useSwarmStore((s) => s.stagingDiff)
  const [rightTab, setRightTab] = useState<RightTab>('messages')

  const fileDiffs = useMemo<FileDiff[]>(() => {
    if (!stagingDiff) return []
    return parseGitDiff(stagingDiff)
  }, [stagingDiff])

  const hasDiff = fileDiffs.length > 0

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <SwarmControlBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Task Board */}
        <div className="w-[340px] min-w-[280px] max-w-[480px] shrink-0 border-r border-stroke/10 overflow-y-auto p-4">
          <SwarmTaskBoard />
        </div>
        {/* Right: Message Feed / Diff Viewer */}
        <div className="flex flex-1 min-w-[300px] flex-col overflow-hidden">
          {/* Tab bar - only show when diff is available */}
          {hasDiff && (
            <div className="flex items-center border-b border-stroke/10 px-4">
              <button
                className={`px-3 py-2 text-[13px] font-medium border-b-2 transition-colors ${
                  rightTab === 'messages'
                    ? 'border-primary text-text-1'
                    : 'border-transparent text-text-3 hover:text-text-2'
                }`}
                onClick={() => setRightTab('messages')}
              >
                Messages
              </button>
              <button
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
            </div>
          )}

          {/* Tab content */}
          {rightTab === 'messages' || !hasDiff ? (
            <div className="flex-1 overflow-y-auto p-4">
              <SwarmMessageFeed />
            </div>
          ) : (
            <SwarmDiffPanel fileDiffs={fileDiffs} />
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
