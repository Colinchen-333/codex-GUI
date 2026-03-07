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

interface LocalEnvironment {
  id: string
  label: string
  path: string
  envVars: EnvVar[]
}

function generateId(): string {
  return `env_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadEnvironments(): LocalEnvironment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as LocalEnvironment[]
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

  const handleSave = () => {
    const trimmedLabel = label.trim()
    const trimmedPath = path.trim()
    if (!trimmedLabel || !trimmedPath) return
    onSave({ label: trimmedLabel, path: trimmedPath, envVars })
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
  const description = [
    env.path,
    varCount > 0 ? `${varCount} env var${varCount === 1 ? '' : 's'}` : null,
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
        description="Configure workspace roots with custom environment variables and shell settings."
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
