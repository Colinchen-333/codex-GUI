import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { serverApi, type AccountInfo } from '../../lib/api'
import { log } from '../../lib/logger'
import { useToast } from '../../components/ui/Toast'
import { useSettingsStore } from '../../stores/settings'
import { useAppStore } from '../../stores/app'
import { GeneralTab, ModelTab, SafetyTab, AccountTab, AllowlistTab } from '../../components/settings/tabs'
import { WorktreesSettingsPage } from './WorktreesSettingsPage'

type SettingsSectionId = 'general' | 'model' | 'safety' | 'allowlist' | 'account' | 'worktrees'

function normalizeSection(section?: string): SettingsSectionId {
  switch (section) {
    case 'model':
    case 'safety':
    case 'allowlist':
    case 'account':
    case 'worktrees':
      return section
    case 'general':
    default:
      return 'general'
  }
}

export function SettingsSectionPage() {
  const { section } = useParams()
  const activeSection = normalizeSection(section)
  const { settings, updateSetting } = useSettingsStore()
  const { setSettingsTab } = useAppStore()
  const { showToast } = useToast()

  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)

  useEffect(() => {
    setSettingsTab(activeSection === 'worktrees' ? 'general' : activeSection)
  }, [activeSection, setSettingsTab])

  const loadAccountInfo = useCallback(async () => {
    try {
      const info = await serverApi.getAccountInfo()
      setAccountInfo(info)
    } catch (error) {
      log.error(`Failed to get account info: ${error}`, 'SettingsPage')
      showToast('Failed to load account information', 'error')
    }
  }, [showToast])

  useEffect(() => {
    if (activeSection === 'account') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch-on-view: Account tab loads its data when shown.
      void loadAccountInfo()
    }
  }, [activeSection, loadAccountInfo])

  const content = useMemo(() => {
    switch (activeSection) {
      case 'model':
        return <ModelTab settings={settings} updateSetting={updateSetting} />
      case 'safety':
        return <SafetyTab settings={settings} updateSetting={updateSetting} />
      case 'allowlist':
        return <AllowlistTab />
      case 'account':
        return <AccountTab accountInfo={accountInfo} onRefresh={loadAccountInfo} />
      case 'worktrees':
        return <WorktreesSettingsPage />
      case 'general':
      default:
        return <GeneralTab />
    }
  }, [activeSection, accountInfo, loadAccountInfo, settings, updateSetting])

  return <div className="space-y-6">{content}</div>
}
