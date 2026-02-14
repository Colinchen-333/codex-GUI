import { memo, useState, useEffect, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { parseSandboxMode, parseApprovalPolicy } from '../../lib/validation'
import { allowlistApi } from '../../lib/api'
import { parseError } from '../../lib/errorUtils'
import {
  useSettingsStore,
  type Settings,
  SANDBOX_MODE_OPTIONS,
  APPROVAL_POLICY_OPTIONS,
} from '../../stores/settings'
import { useProjectsStore } from '../../stores/projects'
import {
  SettingsSection,
  SettingsCard,
  SettingsList,
  SettingsRow,
} from '../../components/settings/SettingsLayout'

/**
 * Command allowlist item
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
        aria-label={`Remove ${command}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
})

/**
 * Sandbox & Safety settings page
 * Sandbox mode, approval policy, command allowlist
 */
export const SandboxSettings = memo(function SandboxSettings() {
  const { settings, updateSetting } = useSettingsStore()
  const { selectedProjectId, projects } = useProjectsStore()

  const [commands, setCommands] = useState<string[]>([])
  const [newCommand, setNewCommand] = useState('')
  const [isLoadingAllowlist, setIsLoadingAllowlist] = useState(false)
  const [allowlistError, setAllowlistError] = useState<string | null>(null)

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  // Fetch allowlist when project changes
  const fetchAllowlist = useCallback(async () => {
    if (!selectedProjectId) return
    setIsLoadingAllowlist(true)
    setAllowlistError(null)
    try {
      const list = await allowlistApi.get(selectedProjectId)
      setCommands(list)
    } catch (err) {
      setAllowlistError(parseError(err))
    } finally {
      setIsLoadingAllowlist(false)
    }
  }, [selectedProjectId])

  useEffect(() => {
    void fetchAllowlist()
  }, [fetchAllowlist])

  const handleAddCommand = useCallback(async () => {
    if (!selectedProjectId || !newCommand.trim()) return
    try {
      await allowlistApi.add(selectedProjectId, newCommand.trim())
      setNewCommand('')
      await fetchAllowlist()
    } catch (err) {
      setAllowlistError(parseError(err))
    }
  }, [selectedProjectId, newCommand, fetchAllowlist])

  const handleRemoveCommand = useCallback(
    async (command: string) => {
      if (!selectedProjectId) return
      try {
        await allowlistApi.remove(selectedProjectId, command)
        await fetchAllowlist()
      } catch (err) {
        setAllowlistError(parseError(err))
      }
    },
    [selectedProjectId, fetchAllowlist]
  )

  return (
    <div className="space-y-8">
      {/* Sandbox Mode */}
      <SettingsSection
        title="Sandbox Mode"
        description="Controls how Codex interacts with your file system."
      >
        <SettingsCard>
          <div className="space-y-2">
            {SANDBOX_MODE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border border-stroke/20 bg-surface-hover/[0.06] p-3 transition-colors',
                  settings.sandboxMode === option.value
                    ? 'bg-surface-selected/[0.18] text-text-1'
                    : 'hover:bg-surface-hover/[0.12]'
                )}
              >
                <input
                  type="radio"
                  name="sandboxMode"
                  value={option.value}
                  checked={settings.sandboxMode === option.value}
                  onChange={(e) => {
                    const validated = parseSandboxMode(
                      e.target.value,
                      settings.sandboxMode
                    )
                    updateSetting('sandboxMode', validated as Settings['sandboxMode'])
                  }}
                  className="mt-0.5 h-4 w-4"
                />
                <div>
                  <div className="text-sm font-medium text-text-1">
                    {option.label}
                  </div>
                  <div className="text-xs text-text-3">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Approval Policy */}
      <SettingsSection
        title="Approval Policy"
        description="When to ask for confirmation before executing changes."
      >
        <SettingsCard>
          <div className="space-y-2">
            {APPROVAL_POLICY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border border-stroke/20 bg-surface-hover/[0.06] p-3 transition-colors',
                  settings.approvalPolicy === option.value
                    ? 'bg-surface-selected/[0.18] text-text-1'
                    : 'hover:bg-surface-hover/[0.12]'
                )}
              >
                <input
                  type="radio"
                  name="approvalPolicy"
                  value={option.value}
                  checked={settings.approvalPolicy === option.value}
                  onChange={(e) => {
                    const validated = parseApprovalPolicy(
                      e.target.value,
                      settings.approvalPolicy
                    )
                    updateSetting('approvalPolicy', validated as Settings['approvalPolicy'])
                  }}
                  className="mt-0.5 h-4 w-4"
                />
                <div>
                  <div className="text-sm font-medium text-text-1">
                    {option.label}
                  </div>
                  <div className="text-xs text-text-3">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Command Allowlist */}
      <SettingsSection
        title="Command Allowlist"
        description="Commands that run without approval prompts."
      >
        {!selectedProjectId ? (
          <SettingsCard>
            <p className="text-sm text-text-3">
              Select a project to manage its command allowlist.
            </p>
          </SettingsCard>
        ) : (
          <>
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
                  description="Patterns like npm * or exact commands."
                  align="start"
                >
                  <div className="w-80 max-w-full">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCommand}
                        onChange={(e) => setNewCommand(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCommand()}
                        placeholder="e.g., npm install, git status"
                        className="flex-1 rounded-lg border border-stroke/30 bg-surface-solid px-3 py-2 text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        onClick={handleAddCommand}
                        disabled={!newCommand.trim()}
                        className="rounded-lg border border-stroke/30 bg-surface-hover/[0.12] px-3 py-2 text-sm font-medium text-text-1 hover:bg-surface-hover/[0.18] disabled:opacity-50 flex items-center gap-1"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>
                    {allowlistError && (
                      <div className="text-xs text-destructive mt-1">{allowlistError}</div>
                    )}
                  </div>
                </SettingsRow>
              </SettingsList>

              {/* Command list */}
              <div className="mt-3">
                {isLoadingAllowlist ? (
                  <div className="text-sm text-text-3 py-2">Loading...</div>
                ) : commands.length === 0 ? (
                  <div className="text-sm text-text-3 py-4 text-center border border-dashed border-stroke/20 rounded-lg bg-surface-hover/[0.06]">
                    No commands in allowlist.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {commands.map((cmd) => (
                      <CommandItem key={cmd} command={cmd} onRemove={handleRemoveCommand} />
                    ))}
                  </div>
                )}
              </div>
            </SettingsCard>

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
          </>
        )}
      </SettingsSection>
    </div>
  )
})
