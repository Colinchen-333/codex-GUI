import { memo } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useTheme } from '../../../hooks/useTheme'
import { SettingsSection, SettingsCard, SettingsList, SettingsRow } from '../SettingsLayout'

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Light', icon: Sun },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Monitor },
] as const

/**
 * General settings tab component
 * Handles theme selection and onboarding reset
 */
export const GeneralTab = memo(function GeneralTab() {
  const { theme, setTheme } = useTheme()

  const handleResetOnboarding = () => {
    localStorage.removeItem('codex-desktop-onboarded')
    window.location.reload()
  }

  return (
    <div className="space-y-8">
      <SettingsSection
        title="General"
        description="Core appearance and behavior settings."
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
