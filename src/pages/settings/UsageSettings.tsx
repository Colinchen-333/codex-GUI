import { memo, useEffect, useState } from 'react'
import {
  SettingsSection,
  SettingsCard,
  SettingsList,
  SettingsRow,
} from '../../components/settings/SettingsLayout'
import { useAccountStore } from '../../stores/account'

interface UsageInfo {
  totalTokens: number
  totalRequests: number
  periodStart: string | null
  periodEnd: string | null
}

export const UsageSettings = memo(function UsageSettings() {
  const { account } = useAccountStore()
  const [usage, setUsage] = useState<UsageInfo>({
    totalTokens: 0,
    totalRequests: 0,
    periodStart: null,
    periodEnd: null,
  })

  useEffect(() => {
    if (account) {
      setUsage({
        totalTokens: 0,
        totalRequests: 0,
        periodStart: null,
        periodEnd: null,
      })
    }
  }, [account])

  const formatNumber = (n: number) => n.toLocaleString()

  return (
    <>
      <SettingsSection title="Usage" description="View your usage statistics">
        <SettingsCard>
          <SettingsList>
            <SettingsRow title="Account" description={account?.email || 'Not logged in'}>
              <span className="text-sm text-text-3">
                {account?.plan || 'Free'}
              </span>
            </SettingsRow>
            <SettingsRow title="Total requests">
              <span className="text-sm text-text-2 tabular-nums">
                {formatNumber(usage.totalRequests)}
              </span>
            </SettingsRow>
            <SettingsRow title="Total tokens">
              <span className="text-sm text-text-2 tabular-nums">
                {formatNumber(usage.totalTokens)}
              </span>
            </SettingsRow>
            {usage.periodStart && (
              <SettingsRow title="Billing period">
                <span className="text-sm text-text-3">
                  {usage.periodStart} — {usage.periodEnd}
                </span>
              </SettingsRow>
            )}
          </SettingsList>
        </SettingsCard>

        <div className="mt-4 text-center text-sm text-text-3">
          Detailed usage data will be available when connected to the Codex backend.
        </div>
      </SettingsSection>
    </>
  )
})
