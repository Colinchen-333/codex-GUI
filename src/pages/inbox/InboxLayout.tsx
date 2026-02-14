import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Archive,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock,
  Filter,
  AlertTriangle,
  CheckCheck,
  Trash2,
  Zap,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ContextMenu } from '../../components/ui/ContextMenu'
import { AutomationList, CreateAutomationDialog } from '../../components/automations'
import { useAutomationsStore, type Automation, type InboxItemStatus } from '../../stores/automations'
import { cn } from '../../lib/utils'

interface InboxLayoutProps {
  selectedItemId?: string | null
}

const statusIcon = (status: InboxItemStatus) => {
  if (status === 'error') return <AlertTriangle size={12} className="text-status-error" />
  if (status === 'warning') return <AlertTriangle size={12} className="text-status-warning" />
  return <CheckCircle2 size={12} className="text-status-success" />
}

function formatInboxTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export function InboxLayout({ selectedItemId }: InboxLayoutProps) {
  const [searchParams] = useSearchParams()
  const automationMode = searchParams.get('automationMode')

  const {
    automations,
    inboxItems,
    markAsRead,
    markAllAsRead,
    clearRead,
  } = useAutomationsStore()

  const [activeView, setActiveView] = useState<'inbox' | 'automations'>(
    automationMode === 'create' ? 'automations' : 'inbox'
  )
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread'>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(automationMode === 'create')
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null)

  const unreadCount = useMemo(
    () => inboxItems.filter((item) => !item.isRead).length,
    [inboxItems]
  )

  const visibleInboxItems = useMemo(() => {
    const sorted = [...inboxItems].sort((a, b) => b.createdAt - a.createdAt)
    if (inboxFilter === 'unread') return sorted.filter((item) => !item.isRead)
    return sorted
  }, [inboxItems, inboxFilter])

  const selectedInboxItem = useMemo(
    () => inboxItems.find((item) => item.id === selectedItemId) ?? null,
    [inboxItems, selectedItemId]
  )

  const handleEditAutomation = (id: string) => {
    const automation = automations.find((a) => a.id === id)
    if (automation) {
      setEditingAutomation(automation)
      setCreateDialogOpen(true)
    }
  }

  const handleCloseDialog = () => {
    setCreateDialogOpen(false)
    setEditingAutomation(null)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar panel */}
      <aside className="flex w-[360px] flex-col border-r border-stroke/20 bg-surface">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-1">
            <Bell size={16} className="text-text-3" />
            Inbox
            {unreadCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                activeView === 'inbox'
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-2 hover:bg-surface-hover/[0.08]'
              )}
              onClick={() => setActiveView('inbox')}
            >
              Inbox
            </button>
            <button
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                activeView === 'automations'
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-2 hover:bg-surface-hover/[0.08]'
              )}
              onClick={() => setActiveView('automations')}
            >
              <Zap size={12} />
              Automations
            </button>
          </div>
        </div>

        {/* Inbox toolbar */}
        {activeView === 'inbox' && (
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-1 text-xs text-text-3">
              <Filter size={12} />
              <button
                className={cn(
                  'rounded-md px-2 py-1 transition-colors',
                  inboxFilter === 'all' ? 'bg-surface-solid text-text-2' : 'hover:text-text-1'
                )}
                onClick={() => setInboxFilter('all')}
              >
                All
              </button>
              <button
                className={cn(
                  'rounded-md px-2 py-1 transition-colors',
                  inboxFilter === 'unread' ? 'bg-surface-solid text-text-2' : 'hover:text-text-1'
                )}
                onClick={() => setInboxFilter('unread')}
              >
                Unread
              </button>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  <CheckCheck size={12} />
                  Mark all read
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={clearRead}>
                <Trash2 size={12} />
                Clear read
              </Button>
            </div>
          </div>
        )}

        {/* List content */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {activeView === 'inbox' && (
            visibleInboxItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="rounded-full bg-surface-hover/[0.12] p-3">
                  <Bell size={18} className="text-text-3" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-text-1">
                    {inboxFilter === 'unread' ? 'All caught up' : 'No notifications yet'}
                  </div>
                  <div className="text-xs text-text-3">
                    {inboxFilter === 'unread'
                      ? 'All inbox items have been read.'
                      : 'Automation results will appear here.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {visibleInboxItems.map((item) => (
                  <ContextMenu
                    key={item.id}
                    className="block"
                    items={[
                      {
                        label: item.isRead ? 'Mark unread' : 'Mark read',
                        onClick: () => markAsRead(item.id),
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
                      onClick={() => {
                        if (!item.isRead) markAsRead(item.id)
                      }}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-text-1">
                        {!item.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                        <span className="truncate">{item.automationName}</span>
                        {statusIcon(item.status)}
                      </div>
                      <div className="text-xs text-text-3 line-clamp-2">{item.summary}</div>
                      <div className="text-[10px] text-text-3/70">
                        {formatInboxTime(item.createdAt)}
                      </div>
                    </Link>
                  </ContextMenu>
                ))}
              </div>
            )
          )}

          {activeView === 'automations' && (
            <div className="px-2 py-2">
              <AutomationList
                onCreateNew={() => {
                  setEditingAutomation(null)
                  setCreateDialogOpen(true)
                }}
                onEdit={handleEditAutomation}
              />
            </div>
          )}
        </div>
      </aside>

      {/* Detail panel */}
      <section className="flex flex-1 flex-col bg-card">
        {activeView === 'automations' ? (
          <div className="flex flex-1 flex-col gap-6 p-6">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-text-1">
                <Zap size={18} />
                Automations
              </div>
              <div className="text-xs text-text-3">Manage recurring tasks and approvals.</div>
            </div>

            {/* Stats cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-stroke/20 bg-surface-solid p-4">
                <div className="text-xs text-text-3">Enabled</div>
                <div className="mt-2 text-lg font-semibold text-text-1">
                  {automations.filter((a) => a.enabled).length}
                </div>
              </div>
              <div className="rounded-xl border border-stroke/20 bg-surface-solid p-4">
                <div className="text-xs text-text-3">Disabled</div>
                <div className="mt-2 text-lg font-semibold text-text-1">
                  {automations.filter((a) => !a.enabled).length}
                </div>
              </div>
              <div className="rounded-xl border border-stroke/20 bg-surface-solid p-4">
                <div className="text-xs text-text-3">Total runs</div>
                <div className="mt-2 text-lg font-semibold text-text-1">
                  {automations.reduce((sum, a) => sum + a.runCount, 0)}
                </div>
              </div>
            </div>

            {automations.length === 0 && (
              <div className="flex flex-1 items-center justify-center text-sm text-text-3">
                Create your first automation to get started.
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-text-1">
                  {selectedInboxItem?.automationName ?? 'Inbox item'}
                  {selectedInboxItem && statusIcon(selectedInboxItem.status)}
                </div>
                <div className="text-xs text-text-3">
                  {selectedInboxItem?.summary ?? 'Details will appear here.'}
                </div>
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
                  {selectedInboxItem && statusIcon(selectedInboxItem.status)}
                  {selectedInboxItem?.status ?? 'success'}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-text-3/70">Time</div>
                <div className="mt-1 text-text-2">
                  {selectedInboxItem ? formatInboxTime(selectedInboxItem.createdAt) : 'Just now'}
                </div>
              </div>
            </div>

            {selectedInboxItem?.details && (
              <div className="mt-6 rounded-xl border border-stroke/20 bg-surface-solid p-4 text-xs text-text-2 whitespace-pre-wrap">
                {selectedInboxItem.details}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Create / Edit Automation Dialog */}
      <CreateAutomationDialog
        isOpen={createDialogOpen}
        onClose={handleCloseDialog}
        editingAutomation={editingAutomation}
      />
    </div>
  )
}
