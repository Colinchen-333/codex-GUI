/**
 * PlanCard - Shows turn plan with step progress
 */
import { useMemo } from 'react'
import { Circle, CheckCircle2, XCircle, Loader2, Maximize2, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../../../lib/utils'
import { useThreadStore } from '../../../stores/thread'
import { selectItemsByType } from '../../../stores/thread/selectors'
import { parseDiff } from '../../ui/DiffView'
import type { FileChangeItem, PlanStep } from '../../../stores/thread'
import type { MessageItemProps, PlanContentType } from '../types'

export function PlanCard({ item }: MessageItemProps) {
  const content = item.content as PlanContentType
  const fileChangeItems = useThreadStore(selectItemsByType('fileChange')) as FileChangeItem[]

  // Get step status icon
  const getStepIcon = (status: PlanStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={14} className="text-text-3/70" />
      case 'in_progress':
        return <Loader2 size={14} className="text-text-2 animate-spin" />
      case 'failed':
        return <XCircle size={14} className="text-red-500" />
      default:
        return <Circle size={14} className="text-text-3/70" />
    }
  }

  // Calculate progress
  const completedSteps = content.steps.filter((s) => s.status === 'completed').length
  const totalSteps = content.steps.length

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

  return (
    <div className="flex justify-start pr-12 animate-in slide-in-from-bottom-2 duration-150">
      <div
        className={cn(
          'w-full max-w-[880px] overflow-hidden rounded-2xl border bg-surface-solid shadow-[var(--shadow-1)]',
          'border-stroke/15'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2 text-[13px] text-text-2">
            <span className="text-text-3">•</span>
            <span className="font-medium">
              {completedSteps} out of {totalSteps} tasks completed
            </span>
          </div>
          <div className="text-text-3/80">
            <Maximize2 size={16} />
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-4 space-y-3">
          {content.explanation && (
            <p className="text-sm text-text-3">{content.explanation}</p>
          )}

          <ol className="space-y-2">
            {content.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">{getStepIcon(step.status)}</div>
                <span
                  className={cn(
                    'text-sm leading-relaxed text-text-1',
                    step.status === 'completed' && 'line-through text-text-3',
                    step.status === 'in_progress' && 'text-text-1 font-medium',
                    step.status === 'failed' && 'text-red-700 dark:text-red-300',
                    step.status === 'pending' && 'text-text-2'
                  )}
                >
                  {index + 1}. {step.step}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {diffSummary.filesChanged > 0 && (
          <div className="flex items-center justify-between border-t border-stroke/10 px-5 py-2.5 text-[13px]">
            <div className="flex items-center gap-2 text-text-2">
              <span>{diffSummary.filesChanged} files changed</span>
              <span className="text-emerald-600">+{diffSummary.additions}</span>
              <span className="text-red-500">-{diffSummary.deletions}</span>
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
  )
}
