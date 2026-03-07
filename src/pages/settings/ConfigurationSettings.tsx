import { memo } from 'react'
import { useSettingsStore } from '../../stores/settings'
import { Switch } from '../../components/ui/Switch'
import {
  SettingsSection,
  SettingsCard,
  SettingsList,
  SettingsRow,
} from '../../components/settings/SettingsLayout'

const ENTER_BEHAVIOR_OPTIONS = [
  { value: 'enter' as const, label: 'Enter' },
  { value: 'shift-enter' as const, label: 'Shift+Enter' },
]

const AGENT_MODE_OPTIONS = [
  { value: 'auto' as const, label: 'Auto' },
  { value: 'manual' as const, label: 'Manual' },
]

export const ConfigurationSettings = memo(function ConfigurationSettings() {
  const { settings, updateSetting } = useSettingsStore()

  return (
    <>
      <SettingsSection title="Configuration" description="Agent behavior and input preferences">
        <SettingsCard>
          <SettingsList>
            <SettingsRow
              title="Agent mode"
              description="How the agent uses tools"
            >
              <select
                value={settings.agentMode}
                onChange={(e) => updateSetting('agentMode', e.target.value as 'auto' | 'manual')}
                className="rounded-md border border-stroke/30 bg-surface-solid px-3 py-1.5 text-sm text-text-1"
              >
                {AGENT_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </SettingsRow>
            <SettingsRow
              title="Enter behavior"
              description="How the Enter key works in the composer"
            >
              <select
                value={settings.enterBehavior}
                onChange={(e) => updateSetting('enterBehavior', e.target.value as 'enter' | 'shift-enter')}
                className="rounded-md border border-stroke/30 bg-surface-solid px-3 py-1.5 text-sm text-text-1"
              >
                {ENTER_BEHAVIOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </SettingsRow>
            <SettingsRow
              title="Auto context"
              description="Automatically include relevant context in prompts"
            >
              <Switch
                checked={settings.autoContextEnabled}
                onCheckedChange={(v) => updateSetting('autoContextEnabled', v)}
              />
            </SettingsRow>
            <SettingsRow
              title="Fast mode"
              description="Use faster response mode when available"
            >
              <Switch
                checked={settings.fastMode}
                onCheckedChange={(v) => updateSetting('fastMode', v)}
              />
            </SettingsRow>
            <SettingsRow
              title="Plan mode"
              description="Show planning steps before executing"
            >
              <Switch
                checked={settings.planMode}
                onCheckedChange={(v) => updateSetting('planMode', v)}
              />
            </SettingsRow>
            <SettingsRow
              title="Skip full access confirmation"
              description="Don't ask for confirmation when granting full access"
            >
              <Switch
                checked={settings.skipFullAccessConfirm}
                onCheckedChange={(v) => updateSetting('skipFullAccessConfirm', v)}
              />
            </SettingsRow>
          </SettingsList>
        </SettingsCard>
      </SettingsSection>
    </>
  )
})
