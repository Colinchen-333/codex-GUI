import { Terminal, Trash2, X, FolderOpen } from 'lucide-react'
import { IconButton } from '../ui/IconButton'

interface TerminalToolbarProps {
  cwd: string
  onClear: () => void
  onClose: () => void
}

export function TerminalToolbar({ cwd, onClear, onClose }: TerminalToolbarProps) {
  const displayCwd = cwd.replace(/^\/Users\/[^/]+/, '~')

  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-b border-token-border bg-token-surface-tertiary px-3">
      <div className="flex items-center gap-2">
        <Terminal size={14} className="text-token-text-tertiary" />
        <span className="text-[12px] font-medium text-token-foreground">Terminal</span>
        <span className="flex items-center gap-1 text-[11px] text-token-text-tertiary">
          <FolderOpen size={11} />
          <span className="mono max-w-[300px] truncate">{displayCwd}</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        <IconButton
          variant="ghost"
          size="sm"
          onClick={onClear}
          aria-label="Clear terminal"
          title="Clear terminal"
        >
          <Trash2 size={13} />
        </IconButton>
        <IconButton
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Close terminal"
          title="Close terminal (Cmd+J)"
        >
          <X size={14} />
        </IconButton>
      </div>
    </div>
  )
}
