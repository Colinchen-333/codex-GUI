import { useMemo } from 'react'
import { CheckCircle2, Circle, Copy, Loader2, XCircle, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageScaffold } from '../components/layout/PageScaffold'
import { cn } from '../lib/utils'
import { copyTextToClipboard } from '../lib/clipboard'
import { useThreadStore } from '../stores/thread'
import { selectItemsByType } from '../stores/thread/selectors'
import { parseDiff } from '../components/ui/DiffView'
import { IconButton } from '../components/ui/IconButton'
import { useToast } from '../components/ui/useToast'
import type { PlanItem, FileChangeItem } from '../stores/thread/types'

type TaskStatus = 'completed' | 'in_progress' | 'failed' | 'pending'

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
  const { toast } = useToast()
  const planSelector = useMemo(() => selectItemsByType('plan'), [])
  const fileChangeSelector = useMemo(() => selectItemsByType('fileChange'), [])
  const planItems = useThreadStore(planSelector) as PlanItem[]
  const fileChangeItems = useThreadStore(fileChangeSelector) as FileChangeItem[]

  const latestPlan = planItems[planItems.length - 1] ?? null

  const tasks = useMemo((): Array<{ text: string; status: TaskStatus }> => {
    if (!latestPlan) return []
    return latestPlan.content.steps.map((step) => ({
      text: step.step,
      status: step.status as TaskStatus,
    }))
  }, [latestPlan])

  const planText = useMemo(() => {
    if (!latestPlan) return ''
    const completedSteps = latestPlan.content.steps.filter((s) => s.status === 'completed').length
    const totalSteps = latestPlan.content.steps.length
    const statusToken = (status: TaskStatus) => {
      if (status === 'completed') return 'x'
      if (status === 'in_progress') return '~'
      if (status === 'failed') return '!'
      return ' '
    }
    const lines = [
      `Plan (${completedSteps}/${totalSteps})`,
      '',
      ...(latestPlan.content.explanation ? [latestPlan.content.explanation, ''] : []),
      ...latestPlan.content.steps.map((s, i) => `- [${statusToken(s.status as TaskStatus)}] ${i + 1}. ${s.step}`),
    ]
    return lines.join('\n')
  }, [latestPlan])

  const handleCopyPlan = async () => {
    const ok = await copyTextToClipboard(planText)
    if (ok) toast.success('Copied plan')
    else toast.error('Copy failed')
  }

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
              {latestPlan ? (
                <span className="font-medium">
                  {completedCount} out of {totalCount} tasks completed
                </span>
              ) : (
                <span className="font-medium">No plan yet</span>
              )}
            </div>
            <IconButton
              size="sm"
              variant="ghost"
              onClick={() => void handleCopyPlan()}
              disabled={!planText}
              title="Copy plan"
              aria-label="Copy plan"
            >
              <Copy size={14} />
            </IconButton>
          </div>

          <div className="px-5 pb-4">
            {tasks.length > 0 ? (
              <ol className="space-y-2">
                {tasks.map((task, index) => (
                  <li key={`${index}-${task.text}`} className="flex items-start gap-3">
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
            ) : (
              <div className="text-sm text-text-3">
                No plan available yet. Start a task in chat to generate one.
              </div>
            )}
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
