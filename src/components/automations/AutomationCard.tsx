import {
  Calendar,
  Clock,
  FileText,
  GitBranch,
  Hand,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Switch } from '../ui/Switch'
import { IconButton } from '../ui/IconButton'
import { Badge } from '../ui/Badge'
import { cn } from '../../lib/utils'
import type { Automation, AutomationTrigger } from '../../stores/automations'
import { useState, useRef, useEffect } from 'react'

interface AutomationCardProps {
  automation: Automation
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

function getTriggerLabel(trigger: AutomationTrigger): string {
  switch (trigger.type) {
    case 'schedule':
      return trigger.label
    case 'file_change':
      return `File: ${trigger.patterns.join(', ')}`
    case 'git_event':
      return `Git: ${trigger.events.join(', ')}`
    case 'manual':
      return 'Manual'
  }
}

function getTriggerIcon(trigger: AutomationTrigger) {
  switch (trigger.type) {
    case 'schedule':
      return <Calendar size={12} />
    case 'file_change':
      return <FileText size={12} />
    case 'git_event':
      return <GitBranch size={12} />
    case 'manual':
      return <Hand size={12} />
  }
}

function formatLastRun(timestamp: number | null): string {
  if (!timestamp) return 'Never'
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function AutomationCard({ automation, onToggle, onEdit, onDelete }: AutomationCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <div
      className={cn(
        'group rounded-xl border border-stroke/20 bg-surface-solid p-4 shadow-[var(--shadow-1)] transition-colors',
        !automation.enabled && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-text-1">
              {automation.name}
            </span>
            <Badge variant="secondary" size="sm">
              {automation.skillName}
            </Badge>
          </div>
          {automation.description && (
            <p className="mt-1 text-xs text-text-3 line-clamp-2">
              {automation.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={automation.enabled}
            onChange={() => onToggle(automation.id)}
            size="sm"
            aria-label={`${automation.enabled ? 'Disable' : 'Enable'} ${automation.name}`}
          />
          <div className="relative" ref={menuRef}>
            <IconButton
              size="sm"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="More actions"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal size={14} />
            </IconButton>
            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-stroke/20 bg-surface-solid py-1 shadow-[var(--shadow-2)]">
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-text-2 hover:bg-surface-hover/[0.08]"
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit(automation.id)
                  }}
                >
                  <Pencil size={12} />
                  Edit
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-status-error hover:bg-status-error-muted"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(automation.id)
                  }}
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[10px] text-text-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover/[0.08] px-2 py-0.5">
          {getTriggerIcon(automation.trigger)}
          {getTriggerLabel(automation.trigger)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={10} />
          {formatLastRun(automation.lastRunAt)}
        </span>
        {automation.runCount > 0 && (
          <span>{automation.runCount} runs</span>
        )}
      </div>
    </div>
  )
}
