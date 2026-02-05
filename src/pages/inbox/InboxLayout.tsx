import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Archive,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock,
  Filter,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trash2,
  AlertTriangle,
  Calendar,
  PencilLine,
} from 'lucide-react'
import { BaseDialog } from '../../components/ui/BaseDialog'
import { ContextMenu } from '../../components/ui/ContextMenu'
import { useToast } from '../../components/ui/Toast'
import { cn } from '../../lib/utils'

interface InboxLayoutProps {
  selectedItemId?: string | null
}

type RunStatus = 'success' | 'running' | 'failed'
type RunItem = {
  id: string
  title: string
  description: string
  time: string
  unread: boolean
  status: RunStatus
  archived?: boolean
}

type AutomationStatus = 'active' | 'paused' | 'error'
type AutomationItem = {
  id: string
  name: string
  description: string
  schedule: string
  lastRun: string
  runs: number
  status: AutomationStatus
}

const RECENT_RUNS: RunItem[] = [
  {
    id: 'run-1',
    title: 'Automations quick start',
    description: 'Create your first automation with a guided setup.',
    time: 'Just now',
    unread: true,
    status: 'success',
  },
  {
    id: 'run-2',
    title: 'Workspace sync',
    description: 'Review changes proposed for the workspace.',
    time: '2h ago',
    unread: false,
    status: 'running',
  },
]

const ARCHIVED_RUNS: RunItem[] = [
  {
    id: 'run-archived-1',
    title: 'Nightly status summary',
    description: 'Archived run from last week.',
    time: 'Jan 31',
    unread: false,
    status: 'success',
    archived: true,
  },
]

const UPNEXT_RUNS: RunItem[] = [
  {
    id: 'run-upnext-1',
    title: 'Morning report',
    description: 'Scheduled to run at 9:00 AM.',
    time: 'In 3h',
    unread: false,
    status: 'running',
  },
]

const SAMPLE_AUTOMATIONS: AutomationItem[] = [
  {
    id: 'auto-1',
    name: 'Daily repo summary',
    description: 'Summarize activity and open PRs every weekday.',
    schedule: 'Weekdays · 9:00 AM',
    lastRun: '2h ago',
    runs: 18,
    status: 'active',
  },
  {
    id: 'auto-2',
    name: 'Stale issues sweep',
    description: 'Tag issues with no updates for 30 days.',
    schedule: 'Weekly · Mon 10:00 AM',
    lastRun: '3 days ago',
    runs: 6,
    status: 'paused',
  },
  {
    id: 'auto-3',
    name: 'Release notes draft',
    description: 'Generate release notes after each merge.',
    schedule: 'On push',
    lastRun: 'Yesterday',
    runs: 12,
    status: 'error',
  },
]

const automationStatusStyles: Record<
  AutomationStatus,
  { label: string; className: string; icon: ReactNode }
> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/10 text-emerald-600',
    icon: <Play size={12} />,
  },
  paused: {
    label: 'Paused',
    className: 'bg-amber-500/10 text-amber-600',
    icon: <Pause size={12} />,
  },
  error: {
    label: 'Error',
    className: 'bg-red-500/10 text-red-600',
    icon: <AlertTriangle size={12} />,
  },
}

const runStatusIcon = (status: RunStatus) => {
  if (status === 'running') return <Clock size={12} className="text-text-3" />
  if (status === 'failed') return <AlertTriangle size={12} className="text-red-500" />
  return <CheckCircle2 size={12} className="text-text-3" />
}

const defaultAutomationDraft = {
  name: '',
  schedule: '',
  prompt: '',
  status: 'active' as AutomationStatus,
}

export function InboxLayout({ selectedItemId }: InboxLayoutProps) {
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const automationMode = searchParams.get('automationMode')
  const automationId = searchParams.get('automationId')

  const [activeList, setActiveList] = useState<'recent' | 'archived' | 'upnext' | 'automations'>(
    automationMode === 'create' || automationId ? 'automations' : 'recent'
  )
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [runs, setRuns] = useState(() => ({
    recent: RECENT_RUNS,
    archived: ARCHIVED_RUNS,
    upnext: UPNEXT_RUNS,
  }))
  const [automations, setAutomations] = useState<AutomationItem[]>(() => SAMPLE_AUTOMATIONS)
  const [selectedAutomationId, setSelectedAutomationId] = useState<string | null>(automationId)
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false)
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null)
  const [automationDraft, setAutomationDraft] = useState(defaultAutomationDraft)

  const isAutomationView = activeList === 'automations' || automationMode === 'create' || !!automationId

  useEffect(() => {
    if (automationMode === 'create') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL-driven navigation opens the Automations flow.
      setActiveList('automations')
      setEditingAutomationId(null)
      setAutomationDialogOpen(true)
    }
  }, [automationMode])

  useEffect(() => {
    if (automationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL-driven navigation selects an automation in Automations view.
      setActiveList('automations')
      setSelectedAutomationId(automationId)
    }
  }, [automationId])

  useEffect(() => {
    if (!automationDialogOpen) return
    if (editingAutomationId) {
      const match = automations.find((automation) => automation.id === editingAutomationId)
      if (match) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Draft hydration is derived from selection changes.
        setAutomationDraft({
          name: match.name,
          schedule: match.schedule,
          prompt: match.description,
          status: match.status,
        })
      }
      return
    }
    setAutomationDraft(defaultAutomationDraft)
  }, [automationDialogOpen, editingAutomationId, automations])

  const runItems = useMemo(() => {
    switch (activeList) {
      case 'archived':
        return runs.archived
      case 'upnext':
        return runs.upnext
      default:
        return runs.recent
    }
  }, [activeList, runs])

  const visibleRuns = useMemo(() => {
    if (filter === 'unread') {
      return runItems.filter((item) => item.unread)
    }
    return runItems
  }, [filter, runItems])

  const allRuns = useMemo(
    () => [...runs.recent, ...runs.archived, ...runs.upnext],
    [runs]
  )

  const selectedRun = useMemo(
    () => allRuns.find((item) => item.id === selectedItemId) ?? null,
    [allRuns, selectedItemId]
  )

  const selectedAutomation = useMemo(
    () => automations.find((automation) => automation.id === selectedAutomationId) ?? null,
    [automations, selectedAutomationId]
  )

  const automationStats = useMemo(() => {
    const active = automations.filter((item) => item.status === 'active').length
    const paused = automations.filter((item) => item.status === 'paused').length
    const error = automations.filter((item) => item.status === 'error').length
    return { active, paused, error }
  }, [automations])

  const updateRun = (id: string, updater: (item: RunItem) => RunItem) => {
    setRuns((prev) => ({
      recent: prev.recent.map((item) => (item.id === id ? updater(item) : item)),
      archived: prev.archived.map((item) => (item.id === id ? updater(item) : item)),
      upnext: prev.upnext.map((item) => (item.id === id ? updater(item) : item)),
    }))
  }

  const openAutomationEditor = (id?: string) => {
    setActiveList('automations')
    if (id) {
      setEditingAutomationId(id)
    } else {
      setEditingAutomationId(null)
    }
    setAutomationDialogOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('automationMode')
    next.delete('automationId')
    if (id) {
      next.set('automationId', id)
    } else {
      next.set('automationMode', 'create')
    }
    setSearchParams(next, { replace: true })
  }

  const closeAutomationEditor = () => {
    setAutomationDialogOpen(false)
    setEditingAutomationId(null)
    const next = new URLSearchParams(searchParams)
    next.delete('automationMode')
    next.delete('automationId')
    setSearchParams(next, { replace: true })
  }

  const saveAutomation = () => {
    if (!automationDraft.name.trim()) {
      showToast('Automation name is required', 'error')
      return
    }
    setAutomations((prev) => {
      if (editingAutomationId) {
        return prev.map((automation) =>
          automation.id === editingAutomationId
            ? {
                ...automation,
                name: automationDraft.name,
                schedule: automationDraft.schedule || automation.schedule,
                description: automationDraft.prompt || automation.description,
                status: automationDraft.status,
              }
            : automation
        )
      }
      return [
        {
          id: `auto-${Date.now()}`,
          name: automationDraft.name,
          description: automationDraft.prompt || 'New automation',
          schedule: automationDraft.schedule || 'Manual',
          lastRun: 'Never',
          runs: 0,
          status: automationDraft.status,
        },
        ...prev,
      ]
    })
    showToast(editingAutomationId ? 'Automation updated' : 'Automation created', 'success')
    closeAutomationEditor()
  }

  const setListAndClearAutomation = (next: 'recent' | 'archived' | 'upnext' | 'automations') => {
    setActiveList(next)
    if (next !== 'automations') {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('automationMode')
      nextParams.delete('automationId')
      setSearchParams(nextParams, { replace: true })
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="flex w-[360px] flex-col border-r border-stroke/20 bg-surface/40">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-1">
            <Bell size={16} className="text-text-3" />
            Inbox
          </div>
          <button
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              isAutomationView
                ? 'bg-primary/10 text-primary'
                : 'border border-stroke/30 bg-surface-solid text-text-2 hover:bg-surface-hover/[0.1]'
            )}
            onClick={() => setListAndClearAutomation('automations')}
          >
            <Sparkles size={12} />
            Automations
          </button>
        </div>

        {!isAutomationView && (
          <div className="flex items-center gap-2 px-4 pb-3">
            <button
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                activeList === 'recent'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-surface-solid text-text-2 hover:bg-surface-hover/[0.1]'
              )}
              onClick={() => setListAndClearAutomation('recent')}
            >
              Recent
            </button>
            <button
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                activeList === 'archived'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-surface-solid text-text-2 hover:bg-surface-hover/[0.1]'
              )}
              onClick={() => setListAndClearAutomation('archived')}
            >
              Archived
            </button>
            <button
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                activeList === 'upnext'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-surface-solid text-text-2 hover:bg-surface-hover/[0.1]'
              )}
              onClick={() => setListAndClearAutomation('upnext')}
            >
              Up next
            </button>
            <div className="ml-auto flex items-center gap-1 text-xs text-text-3">
              <Filter size={12} />
              <button
                className={cn(
                  'rounded-md px-2 py-1 transition-colors',
                  filter === 'all' ? 'bg-surface-solid text-text-2' : 'hover:text-text-1'
                )}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={cn(
                  'rounded-md px-2 py-1 transition-colors',
                  filter === 'unread' ? 'bg-surface-solid text-text-2' : 'hover:text-text-1'
                )}
                onClick={() => setFilter('unread')}
              >
                Unread
              </button>
            </div>
          </div>
        )}

        {isAutomationView && (
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-2">
              <Sparkles size={14} className="text-text-3" />
              Automations
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-md border border-stroke/30 bg-surface-solid px-3 py-1.5 text-xs font-semibold text-text-2 transition-colors hover:bg-surface-hover/[0.1]"
              onClick={() => openAutomationEditor()}
            >
              <Plus size={12} />
              New
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {!isAutomationView && (
            <div className="space-y-1">
              {visibleRuns.map((item) => (
                <ContextMenu
                  key={item.id}
                  className="block"
                  items={[
                    {
                      label: item.unread ? 'Mark read' : 'Mark unread',
                      onClick: () => updateRun(item.id, (run) => ({ ...run, unread: !run.unread })),
                    },
                    {
                      label: 'Archive',
                      onClick: () => showToast('Archive action not wired yet', 'info'),
                    },
                  ]}
                >
                  <Link
                    to={`/inbox/${item.id}`}
                    className={cn(
                      'flex w-full flex-col gap-1 rounded-lg px-3 py-2 transition-colors',
                      selectedItemId === item.id
                        ? 'bg-surface-hover/[0.12]'
                        : 'hover:bg-surface-hover/[0.08]'
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-text-1">
                      {item.unread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      <span className="truncate">{item.title}</span>
                    </div>
                    <div className="text-xs text-text-3 line-clamp-2">{item.description}</div>
                    <div className="flex items-center gap-2 text-[10px] text-text-3/70">
                      {runStatusIcon(item.status)}
                      {item.time}
                    </div>
                  </Link>
                </ContextMenu>
              ))}
            </div>
          )}

          {isAutomationView && (
            <div className="space-y-2">
              {automations.map((automation) => {
                const status = automationStatusStyles[automation.status]
                return (
                  <ContextMenu
                    key={automation.id}
                    className="block"
                    items={[
                      {
                        label: automation.status === 'paused' ? 'Resume' : 'Pause',
                        onClick: () =>
                          setAutomations((prev) =>
                            prev.map((item) =>
                              item.id === automation.id
                                ? {
                                    ...item,
                                    status: item.status === 'paused' ? 'active' : 'paused',
                                  }
                                : item
                            )
                          ),
                      },
                      {
                        label: 'Edit',
                        onClick: () => openAutomationEditor(automation.id),
                      },
                      {
                        label: 'Delete',
                        variant: 'danger',
                        onClick: () => {
                          setAutomations((prev) => prev.filter((item) => item.id !== automation.id))
                          showToast('Automation deleted', 'success')
                        },
                      },
                    ]}
                  >
                    <button
                      className={cn(
                        'flex w-full flex-col gap-2 rounded-lg border border-stroke/20 bg-surface-solid p-3 text-left shadow-[var(--shadow-1)] transition-colors',
                        selectedAutomationId === automation.id
                          ? 'bg-surface-hover/[0.16]'
                          : 'hover:bg-surface-hover/[0.08]'
                      )}
                      onClick={() => {
                        setSelectedAutomationId(automation.id)
                        const next = new URLSearchParams(searchParams)
                        next.delete('automationMode')
                        next.set('automationId', automation.id)
                        setSearchParams(next, { replace: true })
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-text-1">{automation.name}</div>
                          <div className="mt-1 text-xs text-text-3">{automation.description}</div>
                        </div>
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', status.className)}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-text-3">
                        <Calendar size={12} />
                        {automation.schedule}
                        <span className="text-text-3/70">•</span>
                        {automation.lastRun}
                      </div>
                    </button>
                  </ContextMenu>
                )
              })}
            </div>
          )}
        </div>
      </aside>

      <section className="flex flex-1 flex-col bg-card">
        {isAutomationView ? (
          <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-text-1">Automations</div>
                <div className="text-xs text-text-3">Manage recurring tasks and approvals.</div>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-md border border-stroke/30 bg-surface-solid px-3 py-1.5 text-xs font-semibold text-text-2 hover:bg-surface-hover/[0.1]"
                onClick={() => openAutomationEditor(selectedAutomation?.id)}
                disabled={!selectedAutomation}
              >
                <PencilLine size={12} />
                Edit
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-stroke/20 bg-surface-solid p-4">
                <div className="text-xs text-text-3">Active</div>
                <div className="mt-2 text-lg font-semibold text-text-1">{automationStats.active}</div>
              </div>
              <div className="rounded-xl border border-stroke/20 bg-surface-solid p-4">
                <div className="text-xs text-text-3">Paused</div>
                <div className="mt-2 text-lg font-semibold text-text-1">{automationStats.paused}</div>
              </div>
              <div className="rounded-xl border border-stroke/20 bg-surface-solid p-4">
                <div className="text-xs text-text-3">Needs attention</div>
                <div className="mt-2 text-lg font-semibold text-text-1">{automationStats.error}</div>
              </div>
            </div>

            {selectedAutomation ? (
              <div className="rounded-xl border border-stroke/20 bg-surface-solid p-5 shadow-[var(--shadow-1)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-text-1">{selectedAutomation.name}</div>
                    <div className="mt-1 text-xs text-text-3">{selectedAutomation.description}</div>
                  </div>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', automationStatusStyles[selectedAutomation.status].className)}>
                    {automationStatusStyles[selectedAutomation.status].icon}
                    {automationStatusStyles[selectedAutomation.status].label}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-xs text-text-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] uppercase text-text-3/70">Schedule</div>
                    <div className="mt-1 text-text-2">{selectedAutomation.schedule}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-text-3/70">Last run</div>
                    <div className="mt-1 text-text-2">{selectedAutomation.lastRun}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-text-3/70">Total runs</div>
                    <div className="mt-1 text-text-2">{selectedAutomation.runs}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-text-3">
                Select an automation to view details.
              </div>
            )}
          </div>
        ) : !selectedItemId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-surface-hover/[0.12] p-3 text-text-2">
              <Archive size={18} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-text-1">No item selected</div>
              <div className="text-xs text-text-3">Select an inbox item to view details.</div>
            </div>
            <div className="mt-4 w-full max-w-sm rounded-xl border border-stroke/20 bg-surface-solid p-4 text-left shadow-[var(--shadow-1)]">
              <div className="text-xs font-semibold text-text-1">Quick Start</div>
              <ul className="mt-2 space-y-2 text-xs text-text-3">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-text-3" />
                  Create an automation to monitor your workspace.
                </li>
                <li className="flex items-center gap-2">
                  <Clock size={12} className="text-text-3" />
                  Review recent runs and approvals here.
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col p-6">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700">
              Worktree restore is available for this run. Restore the workspace state from the latest snapshot.
            </div>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-text-1">{selectedRun?.title ?? 'Inbox item'}</div>
                <div className="text-xs text-text-3">{selectedRun?.description ?? 'Details will appear here.'}</div>
              </div>
              <Link
                to="/diff"
                className="inline-flex items-center gap-1 rounded-md border border-stroke/30 bg-surface-solid px-3 py-1.5 text-xs font-semibold text-text-2 hover:bg-surface-hover/[0.1]"
              >
                Review changes
                <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="mt-4 grid gap-4 text-xs text-text-3 sm:grid-cols-2">
              <div>
                <div className="text-[10px] uppercase text-text-3/70">Status</div>
                <div className="mt-1 flex items-center gap-2 text-text-2">
                  {selectedRun ? runStatusIcon(selectedRun.status) : null}
                  {selectedRun?.status ?? 'success'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-text-3/70">Last updated</div>
                <div className="mt-1 text-text-2">{selectedRun?.time ?? 'Just now'}</div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-stroke/20 bg-surface-solid p-4 text-xs text-text-3">
              Archived run details and approvals will appear here.
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-stroke/20 pt-3 text-xs">
              <button className="inline-flex items-center gap-2 rounded-md border border-stroke/30 bg-surface-solid px-3 py-1.5 font-semibold text-text-2 hover:bg-surface-hover/[0.1]">
                Open thread
              </button>
              {selectedRun?.archived && (
                <button className="inline-flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-semibold text-red-600 hover:bg-red-500/20">
                  <Trash2 size={12} />
                  Delete run
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <BaseDialog
        isOpen={automationDialogOpen}
        onClose={closeAutomationEditor}
        title={editingAutomationId ? 'Edit automation' : 'New automation'}
        description="Manage automation settings"
        maxWidth="lg"
      >
        <div className="space-y-4 p-6 text-sm text-text-1">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-2">Name</label>
            <input
              className="w-full rounded-md border border-stroke/30 bg-surface-solid px-3 py-2 text-sm text-text-1"
              value={automationDraft.name}
              onChange={(e) => setAutomationDraft((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Daily summary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-2">Schedule</label>
            <input
              className="w-full rounded-md border border-stroke/30 bg-surface-solid px-3 py-2 text-sm text-text-1"
              value={automationDraft.schedule}
              onChange={(e) => setAutomationDraft((prev) => ({ ...prev, schedule: e.target.value }))}
              placeholder="Weekdays at 9:00 AM"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-2">Prompt</label>
            <textarea
              className="min-h-[120px] w-full rounded-md border border-stroke/30 bg-surface-solid px-3 py-2 text-sm text-text-1"
              value={automationDraft.prompt}
              onChange={(e) => setAutomationDraft((prev) => ({ ...prev, prompt: e.target.value }))}
              placeholder="Summarize new changes and post a checklist."
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              className={cn(
                'rounded-full px-3 py-1 font-semibold transition-colors',
                automationDraft.status === 'active'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-surface-solid text-text-2 hover:bg-surface-hover/[0.08]'
              )}
              onClick={() => setAutomationDraft((prev) => ({ ...prev, status: 'active' }))}
            >
              Active
            </button>
            <button
              className={cn(
                'rounded-full px-3 py-1 font-semibold transition-colors',
                automationDraft.status === 'paused'
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-surface-solid text-text-2 hover:bg-surface-hover/[0.08]'
              )}
              onClick={() => setAutomationDraft((prev) => ({ ...prev, status: 'paused' }))}
            >
              Paused
            </button>
            <button
              className={cn(
                'rounded-full px-3 py-1 font-semibold transition-colors',
                automationDraft.status === 'error'
                  ? 'bg-red-500/10 text-red-600'
                  : 'bg-surface-solid text-text-2 hover:bg-surface-hover/[0.08]'
              )}
              onClick={() => setAutomationDraft((prev) => ({ ...prev, status: 'error' }))}
            >
              Needs attention
            </button>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              className="rounded-md border border-stroke/30 bg-surface-solid px-3 py-2 text-xs font-semibold text-text-2 hover:bg-surface-hover/[0.1]"
              onClick={closeAutomationEditor}
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={saveAutomation}
            >
              Save
            </button>
          </div>
        </div>
      </BaseDialog>
    </div>
  )
}
