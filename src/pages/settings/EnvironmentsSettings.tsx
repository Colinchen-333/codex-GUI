import { memo, useState, useCallback, useEffect } from 'react'
import { Trash2, Plus, Edit2, X, Check, FolderOpen } from 'lucide-react'
import { SettingsSection, SettingsCard, SettingsList, SettingsRow } from '../../components/settings/SettingsLayout'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { IconButton } from '../../components/ui/IconButton'
import { cn } from '../../lib/utils'

const STORAGE_KEY = 'codex:local-environments'

interface EnvVar {
  key: string
  value: string
}

export interface EnvironmentAction {
  id: string
  label: string
  command: string
  icon?: string
}

export interface LocalEnvironment {
  id: string
  label: string
  path: string
  envVars: EnvVar[]
  actions: EnvironmentAction[]
}

function generateId(): string {
  return `env_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function generateActionId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function loadEnvironments(): LocalEnvironment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    // Backfill `actions` for environments saved before this field existed
    return (parsed as LocalEnvironment[]).map((env) => ({
      ...env,
      actions: Array.isArray(env.actions) ? env.actions : [],
    }))
  } catch {
    return []
  }
}

function saveEnvironments(envs: LocalEnvironment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envs))
  } catch {
    // localStorage unavailable (e.g. private browsing quota exceeded)
  }
}

// ── Env-var key-value editor ─────────────────────────────────────────────────

interface EnvVarEditorProps {
  vars: EnvVar[]
  onChange: (vars: EnvVar[]) => void
}

function EnvVarEditor({ vars, onChange }: EnvVarEditorProps) {
  const addRow = () => onChange([...vars, { key: '', value: '' }])

  const updateRow = (index: number, field: 'key' | 'value', text: string) => {
    const next = vars.map((v, i) => (i === index ? { ...v, [field]: text } : v))
    onChange(next)
  }

  const removeRow = (index: number) => {
    onChange(vars.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {vars.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={v.key}
            onChange={(e) => updateRow(i, 'key', e.target.value)}
            placeholder="KEY"
            inputSize="sm"
            className="flex-1 font-mono"
            aria-label={`Environment variable ${i + 1} key`}
          />
          <span className="text-text-3 text-sm">=</span>
          <Input
            value={v.value}
            onChange={(e) => updateRow(i, 'value', e.target.value)}
            placeholder="value"
            inputSize="sm"
            className="flex-1 font-mono"
            aria-label={`Environment variable ${i + 1} value`}
          />
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => removeRow(i)}
            aria-label="Remove variable"
          >
            <X size={14} />
          </IconButton>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className={cn(
          'flex items-center gap-1.5 text-xs text-text-3 hover:text-text-1 transition-colors',
          'rounded-sm px-1 py-0.5 -ml-1'
        )}
      >
        <Plus size={12} />
        Add variable
      </button>
    </div>
  )
}

// ── Action editor ─────────────────────────────────────────────────────────────

const ICON_OPTIONS = ['play', 'terminal', 'test', 'build'] as const
type IconOption = (typeof ICON_OPTIONS)[number]

interface ActionEditorProps {
  actions: EnvironmentAction[]
  onChange: (actions: EnvironmentAction[]) => void
}

function ActionEditor({ actions, onChange }: ActionEditorProps) {
  const addRow = () =>
    onChange([...actions, { id: generateActionId(), label: '', command: '', icon: 'play' }])

  const updateRow = (
    id: string,
    field: keyof Omit<EnvironmentAction, 'id'>,
    value: string
  ) => {
    onChange(actions.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const removeRow = (id: string) => {
    onChange(actions.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-2">
      {actions.map((action, i) => (
        <div key={action.id} className="flex items-center gap-2">
          {/* Icon picker */}
          <select
            value={action.icon ?? 'play'}
            onChange={(e) => updateRow(action.id, 'icon', e.target.value)}
            className={cn(
              'h-7 rounded-md border border-stroke/20 bg-surface text-xs text-text-2',
              'px-1.5 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30'
            )}
            aria-label={`Action ${i + 1} icon`}
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          {/* Label */}
          <Input
            value={action.label}
            onChange={(e) => updateRow(action.id, 'label', e.target.value)}
            placeholder="Run Tests"
            inputSize="sm"
            className="w-32 shrink-0"
            aria-label={`Action ${i + 1} label`}
          />

          {/* Command */}
          <Input
            value={action.command}
            onChange={(e) => updateRow(action.id, 'command', e.target.value)}
            placeholder="npm test"
            inputSize="sm"
            className="flex-1 font-mono text-xs"
            aria-label={`Action ${i + 1} command`}
          />

          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => removeRow(action.id)}
            aria-label={`Remove action ${action.label || i + 1}`}
          >
            <X size={14} />
          </IconButton>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className={cn(
          'flex items-center gap-1.5 text-xs text-text-3 hover:text-text-1 transition-colors',
          'rounded-sm px-1 py-0.5 -ml-1'
        )}
      >
        <Plus size={12} />
        Add action
      </button>
    </div>
  )
}

// ── Environment form (add / edit) ────────────────────────────────────────────

interface EnvFormProps {
  initial?: LocalEnvironment
  onSave: (env: Omit<LocalEnvironment, 'id'>) => void
  onCancel: () => void
}

function EnvironmentForm({ initial, onSave, onCancel }: EnvFormProps) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [path, setPath] = useState(initial?.path ?? '')
  const [envVars, setEnvVars] = useState<EnvVar[]>(initial?.envVars ?? [])
  const [actions, setActions] = useState<EnvironmentAction[]>(initial?.actions ?? [])

  const handleSave = () => {
    const trimmedLabel = label.trim()
    const trimmedPath = path.trim()
    if (!trimmedLabel || !trimmedPath) return
    onSave({ label: trimmedLabel, path: trimmedPath, envVars, actions })
  }

  const isValid = label.trim().length > 0 && path.trim().length > 0

  return (
    <SettingsCard>
      <div className="space-y-4">
        <div className="text-sm font-medium text-text-1">
          {initial ? 'Edit Environment' : 'Add Environment'}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-text-3" htmlFor="env-label">
              Name
            </label>
            <Input
              id="env-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My Project"
              inputSize="sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-text-3" htmlFor="env-path">
              Path
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="env-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/Users/me/project"
                inputSize="sm"
                className="flex-1 font-mono text-xs"
              />
              <IconButton
                variant="outline"
                size="sm"
                aria-label="Browse for directory"
                title="Browse for directory"
                disabled
              >
                <FolderOpen size={14} />
              </IconButton>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs text-text-3">Environment variables</div>
          <EnvVarEditor vars={envVars} onChange={setEnvVars} />
        </div>

        {/* Actions section */}
        <div className="space-y-1.5">
          <div className="space-y-0.5">
            <div className="text-xs text-text-3">Actions</div>
            <div className="text-xs text-text-3/60">
              Quick-run buttons shown in the toolbar when this environment is active.
            </div>
          </div>
          <ActionEditor actions={actions} onChange={setActions} />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!isValid}
            onClick={handleSave}
          >
            <Check size={14} className="mr-1" />
            {initial ? 'Save changes' : 'Add environment'}
          </Button>
        </div>
      </div>
    </SettingsCard>
  )
}

// ── Environment row ───────────────────────────────────────────────────────────

interface EnvRowProps {
  env: LocalEnvironment
  onEdit: () => void
  onRemove: () => void
}

function EnvironmentRow({ env, onEdit, onRemove }: EnvRowProps) {
  const varCount = env.envVars.filter((v) => v.key.trim()).length
  const actionCount = env.actions.filter((a) => a.label.trim() && a.command.trim()).length
  const description = [
    env.path,
    varCount > 0 ? `${varCount} env var${varCount === 1 ? '' : 's'}` : null,
    actionCount > 0 ? `${actionCount} action${actionCount === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <SettingsRow title={env.label} description={description}>
      <div className="flex items-center gap-1">
        <IconButton
          variant="ghost"
          size="sm"
          onClick={onEdit}
          aria-label={`Edit ${env.label}`}
        >
          <Edit2 size={14} />
        </IconButton>
        <IconButton
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={`Remove ${env.label}`}
          className="hover:text-destructive"
        >
          <Trash2 size={14} />
        </IconButton>
      </div>
    </SettingsRow>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export const EnvironmentsSettings = memo(function EnvironmentsSettings() {
  const [environments, setEnvironments] = useState<LocalEnvironment[]>(() => loadEnvironments())
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Persist whenever the list changes
  useEffect(() => {
    saveEnvironments(environments)
  }, [environments])

  const handleAdd = useCallback((data: Omit<LocalEnvironment, 'id'>) => {
    setEnvironments((prev) => [...prev, { id: generateId(), ...data }])
    setIsAdding(false)
  }, [])

  const handleEdit = useCallback((id: string, data: Omit<LocalEnvironment, 'id'>) => {
    setEnvironments((prev) =>
      prev.map((env) => (env.id === id ? { id, ...data } : env))
    )
    setEditingId(null)
  }, [])

  const handleRemove = useCallback((id: string) => {
    setEnvironments((prev) => prev.filter((env) => env.id !== id))
  }, [])

  const startAdd = useCallback(() => {
    setEditingId(null)
    setIsAdding(true)
  }, [])

  const startEdit = useCallback((id: string) => {
    setIsAdding(false)
    setEditingId(id)
  }, [])

  const cancelForm = useCallback(() => {
    setIsAdding(false)
    setEditingId(null)
  }, [])

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Local Environments"
        description="Configure workspace roots with custom environment variables, shell settings, and quick-run action buttons."
      >
        <SettingsCard>
          {environments.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-3">
              No environments configured. Add one to get started.
            </div>
          ) : (
            <SettingsList>
              {environments.map((env) =>
                editingId === env.id ? (
                  // Inline edit form replaces the row
                  <div key={env.id} className="py-3">
                    <EnvironmentForm
                      initial={env}
                      onSave={(data) => handleEdit(env.id, data)}
                      onCancel={cancelForm}
                    />
                  </div>
                ) : (
                  <EnvironmentRow
                    key={env.id}
                    env={env}
                    onEdit={() => startEdit(env.id)}
                    onRemove={() => handleRemove(env.id)}
                  />
                )
              )}
            </SettingsList>
          )}
        </SettingsCard>

        {/* Add form */}
        {isAdding && (
          <EnvironmentForm onSave={handleAdd} onCancel={cancelForm} />
        )}

        {/* Add button — hidden while the add form is open */}
        {!isAdding && !editingId && (
          <div className="flex justify-center pt-1">
            <Button variant="secondary" size="sm" onClick={startAdd}>
              <Plus size={14} className="mr-1.5" />
              Add Environment
            </Button>
          </div>
        )}
      </SettingsSection>
    </div>
  )
})
