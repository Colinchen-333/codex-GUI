import { memo, useEffect } from 'react'
import { cn } from '../../../lib/utils'
import { parseReasoningEffort } from '../../../lib/validation'
import {
  useSettingsStore,
  type Settings,
  REASONING_SUMMARY_OPTIONS,
} from '../../../stores/settings'
import { useModelsStore, modelSupportsReasoning } from '../../../stores/models'
import { SettingsSection, SettingsCard, SettingsList, SettingsRow } from '../SettingsLayout'

interface ModelTabProps {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

/**
 * Loading spinner component
 */
const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      Loading models...
    </div>
  )
})

/**
 * Model settings tab component
 * Handles model selection and reasoning settings
 */
export const ModelTab = memo(function ModelTab({
  settings,
  updateSetting,
}: ModelTabProps) {
  const { models, isLoading, error } = useModelsStore()

  // Fetch models on mount
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

  const handleRetry = () => {
    void useModelsStore.getState().fetchModels()
  }

  return (
    <div className="space-y-8">
      <SettingsSection
        title="Model"
        description="Choose your default model and reasoning behavior."
      >
        <SettingsCard>
          <div className="text-sm font-medium text-text-2">Default model</div>
          <div className="mt-3">
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
          </div>
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
    </div>
  )
})
