import { memo, useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useTheme } from '../../hooks/useTheme'
import { useSettingsStore } from '../../stores/settings'
import { useModelsStore, modelSupportsReasoning } from '../../stores/models'
import { parseReasoningEffort } from '../../lib/validation'
import { Switch } from '../../components/ui/Switch'
import {
  SettingsSection,
  SettingsCard,
  SettingsList,
  SettingsRow,
} from '../../components/settings/SettingsLayout'
import {
  REASONING_SUMMARY_OPTIONS,
} from '../../stores/settings'

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
] as const

const FONT_SIZE_OPTIONS = [
  { value: 'default', label: 'Default', description: '16px base size' },
  { value: 'compact', label: 'Compact', description: '14px base size' },
] as const

type FontSizeMode = 'default' | 'compact'

const WINDOW_STYLE_OPTIONS = [
  { value: 'solid', label: 'Solid', description: 'Standard window' },
  { value: 'transparent', label: 'Transparent', description: 'macOS only' },
] as const

type WindowStyle = 'solid' | 'transparent'

/**
 * Loading spinner for model list
 */
const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-text-3 py-4">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Loading models...
    </div>
  )
})

/**
 * General settings page
 * Theme, model selection, reasoning, notifications, keep awake
 */
export const GeneralSettings = memo(function GeneralSettings() {
  const { theme, setTheme } = useTheme()
  const { settings, updateSetting } = useSettingsStore()
  const { models, isLoading, error } = useModelsStore()

  // Notification and keep-awake use localStorage since they are local-only prefs
  const notificationsEnabled = localStorage.getItem('codex-notifications') !== 'false'
  const keepAwakeEnabled = localStorage.getItem('codex-keep-awake') === 'true'

  // Font size mode
  const VALID_FONT_SIZES: FontSizeMode[] = ['default', 'compact']
  const [fontSizeMode, setFontSizeMode] = useState<FontSizeMode>(() => {
    const raw = localStorage.getItem('codex-font-size-mode')
    return raw && VALID_FONT_SIZES.includes(raw as FontSizeMode) ? (raw as FontSizeMode) : 'default'
  })

  // Multiline prompt
  const [multilinePrompt, setMultilinePrompt] = useState(
    () => localStorage.getItem('codex-multiline-prompt') === 'true'
  )

  // Window style
  const VALID_WINDOW_STYLES: WindowStyle[] = ['solid', 'transparent']
  const [windowStyle, setWindowStyle] = useState<WindowStyle>(() => {
    const raw = localStorage.getItem('codex-window-style')
    return raw && VALID_WINDOW_STYLES.includes(raw as WindowStyle) ? (raw as WindowStyle) : 'solid'
  })

  useEffect(() => {
    void useModelsStore.getState().fetchModels()
  }, [])

  // Auto-select default model if none is selected
  useEffect(() => {
    if (!settings.model && models.length > 0) {
      const defaultModel = useModelsStore.getState().getDefaultModel()
      if (defaultModel) {
        useSettingsStore.getState().updateSetting('model', defaultModel.model)
      }
    }
  }, [settings.model, models])

  const currentModel =
    useModelsStore.getState().getModelById(settings.model) ||
    useModelsStore.getState().getDefaultModel()
  const supportsReasoning = currentModel
    ? modelSupportsReasoning(currentModel)
    : false
  const reasoningEffortOptions = currentModel?.supportedReasoningEfforts || []

  const handleResetOnboarding = () => {
    localStorage.removeItem('codex-desktop-onboarded')
    window.location.reload()
  }

  const handleRetry = () => {
    void useModelsStore.getState().fetchModels()
  }

  const handleNotificationsToggle = (checked: boolean) => {
    localStorage.setItem('codex-notifications', checked ? 'true' : 'false')
    // Force re-render by triggering a state update
    window.dispatchEvent(new Event('storage'))
  }

  const handleKeepAwakeToggle = (checked: boolean) => {
    localStorage.setItem('codex-keep-awake', checked ? 'true' : 'false')
    window.dispatchEvent(new Event('storage'))
  }

  const handleFontSizeChange = (mode: FontSizeMode) => {
    setFontSizeMode(mode)
    localStorage.setItem('codex-font-size-mode', mode)
    document.documentElement.style.setProperty(
      '--font-size-base',
      mode === 'compact' ? '14px' : '16px'
    )
  }

  const handleMultilinePromptToggle = (checked: boolean) => {
    setMultilinePrompt(checked)
    localStorage.setItem('codex-multiline-prompt', checked ? 'true' : 'false')
    window.dispatchEvent(new Event('storage'))
  }

  const handleWindowStyleChange = (style: WindowStyle) => {
    setWindowStyle(style)
    localStorage.setItem('codex-window-style', style)
  }

  return (
    <div className="space-y-8">
      {/* Appearance */}
      <SettingsSection
        title="Appearance"
        description="Customize the look and feel."
      >
        <SettingsCard>
          <SettingsList>
            <SettingsRow
              title="Theme"
              description="Use light, dark, or match your system."
            >
              <div className="inline-flex items-center rounded-lg border border-stroke/20 bg-surface-hover/[0.08] p-1">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const isActive = theme === option.value
                  return (
                    <button
                      key={option.value}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-surface-solid text-text-1 shadow-[var(--shadow-1)]'
                          : 'text-text-3 hover:text-text-1'
                      )}
                      onClick={() => setTheme(option.value)}
                    >
                      <Icon size={14} />
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </SettingsRow>
            <SettingsRow
              title="Font size"
              description="Adjust the base font size for the interface."
            >
              <div className="inline-flex items-center rounded-lg border border-stroke/20 bg-surface-hover/[0.08] p-1">
                {FONT_SIZE_OPTIONS.map((option) => {
                  const isActive = fontSizeMode === option.value
                  return (
                    <button
                      key={option.value}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-surface-solid text-text-1 shadow-[var(--shadow-1)]'
                          : 'text-text-3 hover:text-text-1'
                      )}
                      onClick={() => handleFontSizeChange(option.value)}
                    >
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </SettingsRow>
            <SettingsRow
              title="Multiline prompt"
              description="Require Cmd+Enter to send messages."
            >
              <Switch
                checked={multilinePrompt}
                onChange={handleMultilinePromptToggle}
                aria-label="Require Cmd+Enter to send"
              />
            </SettingsRow>
            <SettingsRow
              title="Window style"
              description="Window appearance style (macOS only)."
            >
              <div className="inline-flex items-center rounded-lg border border-stroke/20 bg-surface-hover/[0.08] p-1">
                {WINDOW_STYLE_OPTIONS.map((option) => {
                  const isActive = windowStyle === option.value
                  return (
                    <button
                      key={option.value}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-surface-solid text-text-1 shadow-[var(--shadow-1)]'
                          : 'text-text-3 hover:text-text-1'
                      )}
                      onClick={() => handleWindowStyleChange(option.value)}
                    >
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </SettingsRow>
          </SettingsList>
        </SettingsCard>
      </SettingsSection>

      {/* Default Model */}
      <SettingsSection
        title="Model"
        description="Choose your default model and reasoning behavior."
      >
        <SettingsCard>
          <div className="text-sm font-medium text-text-2 mb-3">Default model</div>
          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="text-sm text-destructive py-2">
              Failed to load models: {error}
              <button className="ml-2 text-primary underline" onClick={handleRetry}>
                Retry
              </button>
            </div>
          ) : models.length === 0 ? (
            <div className="text-sm text-text-3 py-2">
              No models available. Make sure Codex CLI is running.
            </div>
          ) : (
            <div className="space-y-2">
              {models.map((model) => {
                const isSelected =
                  settings.model === model.model ||
                  (!settings.model && model.isDefault)
                return (
                  <label
                    key={model.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border border-stroke/20 bg-surface-hover/[0.06] p-3 transition-colors',
                      isSelected
                        ? 'bg-surface-selected/[0.16] border-stroke/40'
                        : 'hover:bg-surface-hover/[0.12]'
                    )}
                  >
                    <input
                      type="radio"
                      name="model"
                      value={model.model}
                      checked={isSelected}
                      onChange={(e) => updateSetting('model', e.target.value)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-1">
                          {model.displayName}
                        </span>
                        {model.isDefault && (
                          <span className="text-[10px] rounded bg-surface-hover/[0.18] px-1.5 py-0.5 text-text-2">
                            Default
                          </span>
                        )}
                        {modelSupportsReasoning(model) && (
                          <span className="text-[10px] rounded bg-surface-hover/[0.18] px-1.5 py-0.5 text-text-2">
                            Reasoning
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-3">
                        {model.description}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </SettingsCard>

        {supportsReasoning && reasoningEffortOptions.length > 0 && (
          <SettingsCard>
            <SettingsList>
              <SettingsRow
                title="Reasoning effort"
                description="Higher effort improves quality but increases response time."
                align="start"
              >
                <div className="grid grid-cols-3 gap-2">
                  {reasoningEffortOptions.map((option) => (
                    <button
                      key={option.reasoningEffort}
                      className={cn(
                        'rounded-lg border border-stroke/20 px-3 py-2 text-left text-xs transition-colors',
                        settings.reasoningEffort === option.reasoningEffort
                          ? 'bg-surface-selected/[0.18] text-text-1'
                          : 'text-text-3 hover:bg-surface-hover/[0.12] hover:text-text-1'
                      )}
                      onClick={() => {
                        const validated = parseReasoningEffort(
                          option.reasoningEffort,
                          settings.reasoningEffort
                        )
                        updateSetting('reasoningEffort', validated)
                      }}
                    >
                      <div className="text-sm font-medium capitalize text-text-1">
                        {option.reasoningEffort.replace('_', ' ')}
                      </div>
                      <div className="text-[10px] text-text-3 line-clamp-2">
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>
              </SettingsRow>
              <SettingsRow
                title="Reasoning summary"
                description="Control how much reasoning is shown in responses."
                align="start"
              >
                <div className="flex gap-2">
                  {REASONING_SUMMARY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={cn(
                        'flex-1 rounded-lg border border-stroke/20 px-3 py-2 text-center text-xs transition-colors',
                        settings.reasoningSummary === option.value
                          ? 'bg-surface-selected/[0.18] text-text-1'
                          : 'text-text-3 hover:bg-surface-hover/[0.12] hover:text-text-1'
                      )}
                      onClick={() => updateSetting('reasoningSummary', option.value)}
                    >
                      <div className="text-sm font-medium">{option.label}</div>
                      <div className="text-[10px] text-text-3">
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>
              </SettingsRow>
            </SettingsList>
          </SettingsCard>
        )}
      </SettingsSection>

      {/* Behavior */}
      <SettingsSection
        title="Behavior"
        description="Notification and system preferences."
      >
        <SettingsCard>
          <SettingsList>
            <SettingsRow
              title="Notifications"
              description="Show a notification when a task completes."
            >
              <Switch
                checked={notificationsEnabled}
                onChange={handleNotificationsToggle}
                aria-label="Enable notifications"
              />
            </SettingsRow>
            <SettingsRow
              title="Keep awake"
              description="Prevent sleep during long-running tasks."
            >
              <Switch
                checked={keepAwakeEnabled}
                onChange={handleKeepAwakeToggle}
                aria-label="Keep system awake"
              />
            </SettingsRow>
            <SettingsRow
              title="Reset onboarding"
              description="Show the welcome flow on next launch."
            >
              <button
                className="rounded-md border border-stroke/30 bg-surface-hover/[0.1] px-3 py-1.5 text-xs font-medium text-text-2 hover:text-text-1"
                onClick={handleResetOnboarding}
              >
                Show onboarding
              </button>
            </SettingsRow>
          </SettingsList>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
})
