import { memo, useCallback } from 'react'
import { Play, Terminal, TestTube, Hammer } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import type { EnvironmentAction } from '../../pages/settings/EnvironmentsSettings'

interface ActionBarProps {
  actions: EnvironmentAction[]
  projectPath: string
}

const ICON_MAP: Record<string, React.ReactNode> = {
  play: <Play size={12} />,
  terminal: <Terminal size={12} />,
  test: <TestTube size={12} />,
  build: <Hammer size={12} />,
}

export const ActionBar = memo(function ActionBar({ actions, projectPath }: ActionBarProps) {
  const handleRun = useCallback(
    async (command: string) => {
      try {
        await invoke('execute_terminal_command', {
          command,
          cwd: projectPath,
        })
      } catch {
        // Terminal command failed — user can observe output in the terminal panel
      }
    },
    [projectPath]
  )

  // Only render valid actions (label + command both required)
  const validActions = actions.filter((a) => a.label.trim() && a.command.trim())
  if (validActions.length === 0) return null

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 border-b border-stroke/10 bg-surface/50"
      role="toolbar"
      aria-label="Environment actions"
    >
      {validActions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => void handleRun(action.command)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-text-2 hover:bg-surface-hover/[0.08] hover:text-text-1 transition-colors duration-fast border border-stroke/10"
          aria-label={`Run: ${action.label}`}
          title={action.command}
        >
          {ICON_MAP[action.icon ?? ''] ?? <Play size={12} />}
          {action.label}
        </button>
      ))}
    </div>
  )
})
