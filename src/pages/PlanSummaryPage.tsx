import { useMemo } from 'react'
import { CheckCircle2, Circle, Loader2, Maximize2, XCircle, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageScaffold } from '../components/layout/PageScaffold'
import { cn } from '../lib/utils'
import { useThreadStore } from '../stores/thread'
import { selectItemsByType } from '../stores/thread/selectors'
import { parseDiff } from '../components/ui/DiffView'
import type { PlanItem, FileChangeItem } from '../stores/thread/types'

type TaskStatus = 'completed' | 'in_progress' | 'failed' | 'pending'

const FALLBACK_TASKS: Array<{ text: string; status: TaskStatus }> = [
  {
    text: 'Align core routing and page shells to match official layout',
    status: 'completed',
  },
  {
    text: 'Unify input controls, queue list, and status hints styling',
    status: 'completed',
  },
  {
    text: 'Polish diff view cards and file change summary row',
    status: 'completed',
  },
  {
    text: 'Finalize small spacing/typography details and QA',
    status: 'pending',
  },
]

const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={14} className="text-text-3/70" />
    case 'in_progress':
      return <Loader2 size={14} className="text-text-2 animate-spin" />
    case 'failed':
      return <XCircle size={14} className="text-status-error" />
    default:
      return <Circle size={14} className="text-text-3/70" />
  }
}

export function PlanSummaryPage() {
  const planItems = useThreadStore(selectItemsByType('plan')) as PlanItem[]
  const fileChangeItems = useThreadStore(selectItemsByType('fileChange')) as FileChangeItem[]

  const tasks = useMemo(() => {
    const latestPlan = planItems[planItems.length - 1]
    if (!latestPlan) return FALLBACK_TASKS
    return latestPlan.content.steps.map((step) => ({
      text: step.step,
      status: step.status as TaskStatus,
    }))
  }, [planItems])

  const diffSummary = useMemo(() => {
    const latestChange = fileChangeItems[fileChangeItems.length - 1]
    if (!latestChange) {
      return { filesChanged: 0, additions: 0, deletions: 0 }
    }
    let additions = 0
    let deletions = 0
    for (const change of latestChange.content.changes) {
      const hunks = parseDiff(change.diff || '')
      for (const hunk of hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'add') additions += 1
          if (line.type === 'remove') deletions += 1
        }
      }
    }
    return {
      filesChanged: latestChange.content.changes.length,
      additions,
      deletions,
    }
  }, [fileChangeItems])

  const completedCount = tasks.filter((task) => task.status === 'completed').length
  const totalCount = tasks.length

  return (
    <PageScaffold title="Plan Summary" description="Summary of the current plan and progress.">
      <div className="max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-stroke/20 bg-surface-solid shadow-[var(--shadow-1)]">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2 text-sm text-text-2">
              <span className="text-text-3">•</span>
              <span className="font-medium">
                {completedCount} out of {totalCount} tasks completed
              </span>
            </div>
            <div className="text-text-3/80">
              <Maximize2 size={16} />
            </div>
          </div>

          <div className="px-5 pb-4">
            <ol className="space-y-2">
              {tasks.map((task, index) => (
                <li key={task.text} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">{getStatusIcon(task.status)}</div>
                  <span
                    className={cn(
                      'text-sm leading-relaxed text-text-1',
                      task.status === 'completed' && 'line-through text-text-3',
                      task.status === 'in_progress' && 'text-text-1 font-medium',
                      task.status === 'failed' && 'text-status-error',
                      task.status === 'pending' && 'text-text-2'
                    )}
                  >
                    {index + 1}. {task.text}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {diffSummary.filesChanged > 0 && (
            <div className="flex items-center justify-between border-t border-stroke/20 px-5 py-3 text-sm">
              <div className="flex items-center gap-2 text-text-2">
                <span>{diffSummary.filesChanged} files changed</span>
                <span className="text-status-success">+{diffSummary.additions}</span>
                <span className="text-status-error">-{diffSummary.deletions}</span>
              </div>
              <Link
                to="/diff"
                className="inline-flex items-center gap-1 text-text-2 transition-colors hover:text-text-1"
              >
                Review changes
                <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </PageScaffold>
  )
}
