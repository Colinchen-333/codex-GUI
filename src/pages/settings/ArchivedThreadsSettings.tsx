import { useState, useEffect, useCallback } from 'react'
import { Archive, RotateCcw, Loader2 } from 'lucide-react'
import { threadApi } from '../../lib/api'
import { Button } from '../../components/ui/Button'

interface ArchivedThread {
  id: string
  preview: string
  createdAt: number
  cwd: string
}

export function ArchivedThreadsSettings() {
  const [threads, setThreads] = useState<ArchivedThread[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unarchiving, setUnarchiving] = useState<Set<string>>(new Set())

  const fetchArchived = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await threadApi.listFiltered({ archived: true, limit: 100 })
      setThreads(
        result.data.map((t) => ({
          id: t.id,
          preview: t.preview || 'Untitled thread',
          createdAt: t.createdAt,
          cwd: t.cwd,
        }))
      )
    } catch {
      setThreads([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchArchived()
  }, [fetchArchived])

  const handleUnarchive = async (threadId: string) => {
    setUnarchiving((prev) => new Set(prev).add(threadId))
    try {
      await threadApi.unarchive(threadId)
      setThreads((prev) => prev.filter((t) => t.id !== threadId))
    } catch {
      // ignore
    } finally {
      setUnarchiving((prev) => {
        const next = new Set(prev)
        next.delete(threadId)
        return next
      })
    }
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts * 1000)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-lg font-semibold text-text-1">Archived Threads</h2>
        <p className="text-sm text-text-3 mt-1">
          Threads you&apos;ve archived. Unarchive to restore them to the sidebar.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-text-3" />
        </div>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-text-3">
          <Archive size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No archived threads</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-hover/[0.04] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-1 truncate">{thread.preview}</p>
                <p className="text-xs text-text-3 mt-0.5">
                  {formatDate(thread.createdAt)} &middot; {thread.cwd.split('/').pop()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleUnarchive(thread.id)}
                disabled={unarchiving.has(thread.id)}
              >
                {unarchiving.has(thread.id) ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RotateCcw size={14} />
                )}
                <span className="ml-1">Unarchive</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
