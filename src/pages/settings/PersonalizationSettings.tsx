import { memo, useState, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { configApi } from '../../lib/api'
import { Textarea } from '../../components/ui/Textarea'
import {
  SettingsSection,
  SettingsCard,
} from '../../components/settings/SettingsLayout'

const PERSONALITY_MODES = [
  {
    value: 'friendly',
    label: 'Friendly',
    description: 'Warm, encouraging, and conversational',
  },
  {
    value: 'pragmatic',
    label: 'Pragmatic',
    description: 'Concise, direct, and technical',
  },
  {
    value: 'none',
    label: 'None',
    description: 'No personality adjustments',
  },
] as const

type PersonalityMode = (typeof PERSONALITY_MODES)[number]['value']

const MAX_INSTRUCTIONS_LENGTH = 4000

/**
 * Personalization settings page
 * Personality mode and custom instructions
 */
export const PersonalizationSettings = memo(function PersonalizationSettings() {
  const [personalityMode, setPersonalityMode] = useState<PersonalityMode>('pragmatic')
  const [customInstructions, setCustomInstructions] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await configApi.read()
        const config = response.config
        if (config['personalization.personality'] != null) {
          setPersonalityMode(String(config['personalization.personality']) as PersonalityMode)
        }
        if (config['personalization.customInstructions'] != null) {
          setCustomInstructions(String(config['personalization.customInstructions']))
        }
      } catch {
        // Config API not available yet — use defaults
      } finally {
        setIsLoading(false)
      }
    }
    void loadConfig()
  }, [])

  const saveConfig = async (key: string, value: string | null) => {
    try {
      await configApi.write(key, value)
    } catch {
      // Config write may not be supported yet — setting still applies in memory
    }
  }

  const handlePersonalityChange = (mode: PersonalityMode) => {
    setPersonalityMode(mode)
    void saveConfig('personalization.personality', mode)
  }

  const handleCustomInstructionsChange = (value: string) => {
    if (value.length <= MAX_INSTRUCTIONS_LENGTH) {
      setCustomInstructions(value)
      void saveConfig('personalization.customInstructions', value || null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-3 py-8">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Loading personalization settings...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Personality Mode */}
      <SettingsSection
        title="Personality"
        description="Choose the communication style for the AI agent."
      >
        <SettingsCard>
          <div className="grid grid-cols-3 gap-2">
            {PERSONALITY_MODES.map((mode) => (
              <button
                key={mode.value}
                className={cn(
                  'rounded-lg border border-stroke/20 px-3 py-3 text-left text-xs transition-colors',
                  personalityMode === mode.value
                    ? 'bg-surface-selected/[0.18] border-stroke/40 text-text-1'
                    : 'text-text-3 hover:bg-surface-hover/[0.12] hover:text-text-1'
                )}
                onClick={() => handlePersonalityChange(mode.value)}
              >
                <div className="text-sm font-medium text-text-1 mb-0.5">{mode.label}</div>
                <div className="text-[10px] text-text-3 line-clamp-2">{mode.description}</div>
              </button>
            ))}
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Custom Instructions */}
      <SettingsSection
        title="Custom Instructions"
        description="Additional instructions included in every conversation."
      >
        <SettingsCard>
          <div className="mb-2">
            <div className="text-xs text-text-3">
              These instructions will be included in every conversation. They correspond to the AGENTS.md file in your project.
            </div>
          </div>
          <Textarea
            value={customInstructions}
            onChange={(e) => handleCustomInstructionsChange(e.target.value)}
            placeholder="Enter additional instructions for the AI agent..."
            className="min-h-[160px] font-mono text-xs"
          />
          <div className="mt-2 flex justify-end">
            <span className={cn(
              'text-[10px] tabular-nums',
              customInstructions.length > MAX_INSTRUCTIONS_LENGTH * 0.9
                ? 'text-status-warning'
                : 'text-text-3'
            )}>
              {customInstructions.length} / {MAX_INSTRUCTIONS_LENGTH}
            </span>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
})
