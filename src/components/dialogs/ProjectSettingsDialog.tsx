import { useEffect, useState, useRef } from 'react'
import { Loader2, Settings } from 'lucide-react'
import { projectApi } from '../../lib/api'
import { useProjectsStore } from '../../stores/projects'
import { useModelsStore } from '../../stores/models'
import {
  SANDBOX_MODE_OPTIONS,
  APPROVAL_POLICY_OPTIONS,
} from '../../stores/settings'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { logError } from '../../lib/errorUtils'
import { useToast } from '../ui/Toast'
import { useDialogKeyboardShortcut } from '../../hooks/useDialogKeyboardShortcut'
import { BaseDialog } from '../ui/BaseDialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface ProjectSettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId: string | null
}

interface ProjectSettings {
  cwd?: string
  envVars?: Record<string, string>
  model?: string
  sandboxMode?: string
  askForApproval?: string
}

export function ProjectSettingsDialog({
  isOpen,
  onClose,
  projectId,
}: ProjectSettingsDialogProps) {
  const { projects } = useProjectsStore()
  // fetchProjects, fetchModels are called via getState() to avoid dependency issues
  const { models } = useModelsStore()
  const { showToast } = useToast()
  const [settings, setSettings] = useState<ProjectSettings>({})
  const [isSaving, setIsSaving] = useState(false)
  const [newEnvKey, setNewEnvKey] = useState('')
  const [newEnvValue, setNewEnvValue] = useState('')
  const [clearSettingConfirm, setClearSettingConfirm] = useState<{
    isOpen: boolean
    settingKey: keyof ProjectSettings | null
    settingName: string
  }>({ isOpen: false, settingKey: null, settingName: '' })
  const saveButtonRef = useRef<HTMLButtonElement>(null)

  const project = projects.find((p) => p.id === projectId)

  // Use keyboard shortcut hook for Cmd+Enter (or Ctrl+Enter on Windows/Linux)
  useDialogKeyboardShortcut({
    isOpen,
    onConfirm: () => {
      if (!isSaving) {
        saveButtonRef.current?.click()
      }
    },
    requireModifierKey: true, // Require Cmd/Ctrl key since there are inputs
  })

  // Load settings from project
  useEffect(() => {
    if (!project) return
    try {
      const parsed = project.settingsJson
        ? JSON.parse(project.settingsJson)
        : {}
      setSettings(parsed)
    } catch {
      // Invalid JSON in settingsJson; fall back to defaults
      setSettings({})
    }
  }, [project])

  // Fetch models on mount
  useEffect(() => {
    if (isOpen) {
      void useModelsStore.getState().fetchModels()
    }
  }, [isOpen]) // No fetchModels dependency - called via getState()

  const handleSave = async () => {
    if (!projectId) return
    setIsSaving(true)
    try {
      await projectApi.update(projectId, undefined, settings as Record<string, unknown>)
      await useProjectsStore.getState().fetchProjects()
      showToast('Project settings saved successfully', 'success')
      onClose()
    } catch (error) {
      logError(error, {
        context: 'ProjectSettingsDialog',
        source: 'dialogs',
        details: 'Failed to save project settings'
      })
      showToast('Failed to save project settings', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddEnvVar = () => {
    if (!newEnvKey.trim()) return
    setSettings((prev) => ({
      ...prev,
      envVars: {
        ...(prev.envVars || {}),
        [newEnvKey.trim()]: newEnvValue,
      },
    }))
    setNewEnvKey('')
    setNewEnvValue('')
  }

  const handleRemoveEnvVar = (key: string) => {
    setSettings((prev) => {
      const newEnvVars = { ...(prev.envVars || {}) }
      delete newEnvVars[key]
      return { ...prev, envVars: newEnvVars }
    })
  }

  const clearSetting = <K extends keyof ProjectSettings>(key: K, name: string) => {
    setClearSettingConfirm({
      isOpen: true,
      settingKey: key,
      settingName: name,
    })
  }

  const confirmClearSetting = () => {
    if (clearSettingConfirm.settingKey) {
      setSettings((prev) => {
        const next = { ...prev }
        delete next[clearSettingConfirm.settingKey!]
        return next
      })
      setClearSettingConfirm({ isOpen: false, settingKey: null, settingName: '' })
    }
  }

  if (!project) return null

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Project Settings"
      description={`Project-specific overrides for ${project.displayName || project.path}.`}
      titleIcon={<Settings size={16} />}
      maxWidth="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            ref={saveButtonRef}
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="p-6 space-y-6">
          {/* Model Override */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-1">Model</label>
              {settings.model && (
                <button
                  className="text-xs text-text-3 hover:text-text-1"
                  onClick={() => clearSetting('model', 'Model')}
                >
                  Reset to Global
                </button>
              )}
            </div>
            <select
              value={settings.model || ''}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  model: e.target.value || undefined,
                }))
              }
              className="w-full rounded-lg border border-stroke/30 bg-surface-solid px-3 py-2 text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Inherit from global settings</option>
              {models.map((model) => (
                <option key={model.id} value={model.model}>
                  {model.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Sandbox Mode Override */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-1">Sandbox Mode</label>
              {settings.sandboxMode && (
                <button
                  className="text-xs text-text-3 hover:text-text-1"
                  onClick={() => clearSetting('sandboxMode', 'Sandbox Mode')}
                >
                  Reset to Global
                </button>
              )}
            </div>
            <select
              value={settings.sandboxMode || ''}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  sandboxMode: e.target.value || undefined,
                }))
              }
              className="w-full rounded-lg border border-stroke/30 bg-surface-solid px-3 py-2 text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Inherit from global settings</option>
              {SANDBOX_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Approval Policy Override */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-1">Approval Policy</label>
              {settings.askForApproval && (
                <button
                  className="text-xs text-text-3 hover:text-text-1"
                  onClick={() => clearSetting('askForApproval', 'Approval Policy')}
                >
                  Reset to Global
                </button>
              )}
            </div>
            <select
              value={settings.askForApproval || ''}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  askForApproval: e.target.value || undefined,
                }))
              }
              className="w-full rounded-lg border border-stroke/30 bg-surface-solid px-3 py-2 text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Inherit from global settings</option>
              {APPROVAL_POLICY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Working Directory Override */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-1">Working Directory</label>
              {settings.cwd && (
                <button
                  className="text-xs text-text-3 hover:text-text-1"
                  onClick={() => clearSetting('cwd', 'Working Directory')}
                >
                  Reset to Global
                </button>
              )}
            </div>
            <Input
              type="text"
              value={settings.cwd || ''}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  cwd: e.target.value || undefined,
                }))
              }
              placeholder={project.path}
            />
            <p className="text-xs text-text-3 mt-1">
              Leave empty to use project root
            </p>
          </div>

          {/* Environment Variables */}
          <div>
            <label className="text-sm font-medium text-text-1 block mb-2">
              Environment Variables
            </label>
            <div className="space-y-2 mb-2">
              {Object.entries(settings.envVars || {}).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-lg border border-stroke/20 bg-surface-hover/[0.06] px-3 py-2"
                >
                  <code className="text-sm font-mono text-text-1">{key}</code>
                  <span className="text-text-3">=</span>
                  <code className="text-sm font-mono flex-1 truncate text-text-2">{value}</code>
                  <button
                    onClick={() => handleRemoveEnvVar(key)}
                    className="text-text-3 hover:text-destructive text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                value={newEnvKey}
                onChange={(e) => setNewEnvKey(e.target.value)}
                placeholder="KEY"
                className="w-32 font-mono"
              />
              <Input
                type="text"
                value={newEnvValue}
                onChange={(e) => setNewEnvValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEnvVar()}
                placeholder="value"
              />
              <Button
                onClick={handleAddEnvVar}
                disabled={!newEnvKey.trim()}
                variant="secondary"
              >
                Add
              </Button>
            </div>
          </div>
      </div>

      {/* Clear Setting Confirmation Dialog */}
      <ConfirmDialog
        isOpen={clearSettingConfirm.isOpen}
        title="Clear Setting"
        message={`Are you sure you want to clear the "${clearSettingConfirm.settingName}" setting and use the default value?`}
        confirmText="Clear"
        cancelText="Cancel"
        variant="warning"
        onConfirm={confirmClearSetting}
        onCancel={() => setClearSettingConfirm({ isOpen: false, settingKey: null, settingName: '' })}
      />
    </BaseDialog>
  )
}
