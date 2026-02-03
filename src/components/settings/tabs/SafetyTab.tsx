import { memo } from 'react'
import { cn } from '../../../lib/utils'
import { parseSandboxMode, parseApprovalPolicy } from '../../../lib/validation'
import {
  type Settings,
  SANDBOX_MODE_OPTIONS,
  APPROVAL_POLICY_OPTIONS,
} from '../../../stores/settings'
import { SettingsSection, SettingsCard, SettingsList, SettingsRow } from '../SettingsLayout'

interface SafetyTabProps {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

/**
 * Safety settings tab component
 * Handles sandbox mode and approval policy settings
 */
export const SafetyTab = memo(function SafetyTab({
  settings,
  updateSetting,
}: SafetyTabProps) {
  return (
    <div className="space-y-8">
      <SettingsSection
        title="Safety"
        description="Control sandboxing and approval behaviors."
      >
        <SettingsCard>
          <SettingsList>
            <SettingsRow
              title="Sandbox mode"
              description="Controls how Codex interacts with your file system."
              align="start"
            >
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
                        updateSetting('sandboxMode', validated)
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
            </SettingsRow>
            <SettingsRow
              title="Approval policy"
              description="When to ask for confirmation before executing changes."
              align="start"
            >
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
                        updateSetting('approvalPolicy', validated)
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
            </SettingsRow>
          </SettingsList>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
})
