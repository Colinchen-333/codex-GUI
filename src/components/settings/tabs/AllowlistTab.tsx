import { memo, useState, useEffect, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { allowlistApi } from '../../../lib/api'
import { useProjectsStore } from '../../../stores/projects'
import { parseError } from '../../../lib/errorUtils'
import { SettingsSection, SettingsCard, SettingsList, SettingsRow } from '../SettingsLayout'

/**
 * Empty state when no commands in allowlist
 */
const EmptyState = memo(function EmptyState() {
  return (
    <div className="text-sm text-text-3 py-4 text-center border border-dashed border-stroke/20 rounded-lg bg-surface-hover/[0.06]">
      No commands in allowlist. Add commands above.
    </div>
  )
})

/**
 * Command list item component
 */
const CommandItem = memo(function CommandItem({
  command,
  onRemove,
}: {
  command: string
  onRemove: (cmd: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-stroke/20 bg-surface-hover/[0.06] px-3 py-2">
      <code className="text-sm font-mono truncate flex-1 text-text-1">{command}</code>
      <button
        onClick={() => onRemove(command)}
        className="text-text-3 hover:text-destructive transition-colors p-1"
        title="Remove from allowlist"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
})

/**
 * Add command form component
 */
const AddCommandForm = memo(function AddCommandForm({
  value,
  onChange,
  onAdd,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  onAdd: () => void
  disabled: boolean
}) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        placeholder="e.g., npm install, git status"
        className="flex-1 rounded-lg border border-stroke/30 bg-surface-solid px-3 py-2 text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <button
        onClick={onAdd}
        disabled={disabled}
        className="rounded-lg border border-stroke/30 bg-surface-hover/[0.12] px-4 py-2 text-sm font-medium text-text-1 hover:bg-surface-hover/[0.18] disabled:opacity-50 flex items-center gap-1"
      >
        <Plus size={16} />
        Add
      </button>
    </div>
  )
})

/**
 * Tips section component
 */
const AllowlistTips = memo(function AllowlistTips() {
  return (
    <div className="text-xs text-text-3">
      <strong>Tips:</strong>
      <ul className="list-disc list-inside mt-1 space-y-0.5">
        <li>
          Use <code className="bg-surface-hover/[0.12] px-1 rounded">*</code> as a wildcard
          (e.g., <code className="bg-surface-hover/[0.12] px-1 rounded">npm *</code>)
        </li>
        <li>Each project has its own allowlist</li>
        <li>Commands are matched exactly or by pattern</li>
      </ul>
    </div>
  )
})

/**
 * Allowlist settings tab component
 * Handles command allowlist management per project
 */
export const AllowlistTab = memo(function AllowlistTab() {
  const { selectedProjectId, projects } = useProjectsStore()
  const [commands, setCommands] = useState<string[]>([])
  const [newCommand, setNewCommand] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  // Fetch allowlist when project changes
  const fetchAllowlist = useCallback(async () => {
    if (!selectedProjectId) return
    setIsLoading(true)
    setError(null)
    try {
      const list = await allowlistApi.get(selectedProjectId)
      setCommands(list)
    } catch (err) {
      setError(parseError(err))
    } finally {
      setIsLoading(false)
    }
  }, [selectedProjectId])

  useEffect(() => {
    void fetchAllowlist()
  }, [fetchAllowlist])

  const handleAdd = useCallback(async () => {
    if (!selectedProjectId || !newCommand.trim()) return
    try {
      await allowlistApi.add(selectedProjectId, newCommand.trim())
      setNewCommand('')
      await fetchAllowlist()
    } catch (err) {
      setError(parseError(err))
    }
  }, [selectedProjectId, newCommand, fetchAllowlist])

  const handleRemove = useCallback(
    async (command: string) => {
      if (!selectedProjectId) return
      try {
        await allowlistApi.remove(selectedProjectId, command)
        await fetchAllowlist()
      } catch (err) {
        setError(parseError(err))
      }
    },
    [selectedProjectId, fetchAllowlist]
  )

  // No project selected state
  if (!selectedProjectId) {
    return (
      <div className="space-y-6">
        <SettingsSection
          title="Allowlist"
          description="Approve specific commands without prompting."
        >
          <div className="text-text-3 text-sm">
            Please select a project first to manage its command allowlist.
          </div>
        </SettingsSection>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <SettingsSection
        title="Allowlist"
        description="Approve specific commands without prompting."
      >
        <div className="text-sm text-text-2">
          Project:{' '}
          <span className="font-medium text-text-1">
            {selectedProject?.displayName || selectedProject?.path}
          </span>
        </div>

        <SettingsCard>
          <SettingsList>
            <SettingsRow
              title="Add command"
              description="Commands here run without approval prompts."
              align="start"
            >
              <div className="w-80 max-w-full">
                <AddCommandForm
                  value={newCommand}
                  onChange={setNewCommand}
                  onAdd={handleAdd}
                  disabled={!newCommand.trim()}
                />
                {error && (
                  <div className="text-sm text-destructive">{error}</div>
                )}
              </div>
            </SettingsRow>
            <SettingsRow
              title="Allowlist"
              description="Patterns like npm * or exact commands."
              align="start"
            >
              <div className="w-80 max-w-full">
                {isLoading ? (
                  <div className="text-sm text-text-3">Loading...</div>
                ) : commands.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {commands.map((cmd) => (
                      <CommandItem key={cmd} command={cmd} onRemove={handleRemove} />
                    ))}
                  </div>
                )}
              </div>
            </SettingsRow>
          </SettingsList>
        </SettingsCard>

        <AllowlistTips />
      </SettingsSection>
    </div>
  )
})
