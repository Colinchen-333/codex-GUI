import { useEffect, useState, useCallback, memo } from 'react'
import {
  Settings as SettingsIcon,
  Cpu,
  Shield,
  ListChecks,
  User,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { serverApi, type AccountInfo } from '../../lib/api'
import { log } from '../../lib/logger'
import { useSettingsStore } from '../../stores/settings'
import { useAppStore } from '../../stores/app'
import { useToast } from '../ui/Toast'
import {
  GeneralTab,
  ModelTab,
  SafetyTab,
  AccountTab,
  AllowlistTab,
} from './tabs'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Tab configuration for the settings sidebar
 */
const SETTINGS_TABS = [
  { id: 'general' as const, label: 'General', icon: SettingsIcon },
  { id: 'model' as const, label: 'Model', icon: Cpu },
  { id: 'safety' as const, label: 'Safety', icon: Shield },
  { id: 'allowlist' as const, label: 'Allowlist', icon: ListChecks },
  { id: 'account' as const, label: 'Account', icon: User },
] as const

type SettingsTabId = (typeof SETTINGS_TABS)[number]['id']

/**
 * Sidebar tab button component
 */
const TabButton = memo(function TabButton({
  id,
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  id: SettingsTabId
  label: string
  icon: typeof SettingsIcon
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      key={id}
      className={cn(
        'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all',
        isActive
          ? 'bg-surface-hover/[0.16] text-text-1'
          : 'text-text-3 hover:bg-surface-hover/[0.12] hover:text-text-1'
      )}
      onClick={onClick}
    >
      <Icon
        size={18}
        className={cn(
          'flex-shrink-0 transition-colors',
          isActive
            ? 'text-text-1'
            : 'text-text-3 group-hover:text-text-1'
        )}
      />
      <span className="flex-1">{label}</span>
      {isActive && (
        <ChevronRight size={14} className="flex-shrink-0 text-text-2" />
      )}
    </button>
  )
})

/**
 * Settings dialog sidebar component
 */
const SettingsSidebar = memo(function SettingsSidebar({
  activeTab,
  onTabChange,
  onClose,
}: {
  activeTab: SettingsTabId
  onTabChange: (tab: SettingsTabId) => void
  onClose: () => void
}) {
  return (
    <div className="w-56 bg-surface-solid/80 p-4 border-r border-stroke/20 flex flex-col gap-1">
      <button
        className="mb-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-text-3 hover:text-text-1 hover:bg-surface-hover/[0.12]"
        onClick={onClose}
      >
        <ChevronLeft size={14} />
        Back to app
      </button>
      <div className="mb-2 px-2 py-1">
        <h2 className="text-base font-semibold tracking-tight text-text-1">Settings</h2>
      </div>

      {SETTINGS_TABS.map((tab) => (
        <TabButton
          key={tab.id}
          id={tab.id}
          label={tab.label}
          icon={tab.icon}
          isActive={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
        />
      ))}
    </div>
  )
})

/**
 * Settings dialog content area component
 */
const SettingsContent = memo(function SettingsContent({
  activeTab,
  accountInfo,
  onRefreshAccount,
}: {
  activeTab: SettingsTabId
  accountInfo: AccountInfo | null
  onRefreshAccount: () => Promise<void>
}) {
  const { settings, updateSetting } = useSettingsStore()

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-3xl">
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'model' && (
          <ModelTab settings={settings} updateSetting={updateSetting} />
        )}
        {activeTab === 'safety' && (
          <SafetyTab settings={settings} updateSetting={updateSetting} />
        )}
        {activeTab === 'allowlist' && <AllowlistTab />}
        {activeTab === 'account' && (
          <AccountTab accountInfo={accountInfo} onRefresh={onRefreshAccount} />
        )}
      </div>
    </div>
  )
})

/**
 * Main settings dialog component
 * Provides a tabbed interface for configuring application settings
 */
export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { settingsTab: activeTab, setSettingsTab } = useAppStore()
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
  const { showToast } = useToast()

  // Fetch account info when dialog opens
  useEffect(() => {
    if (isOpen) {
      serverApi
        .getAccountInfo()
        .then(setAccountInfo)
        .catch((error) => {
          log.error(`Failed to get account info: ${error}`, 'SettingsDialog')
          showToast('Failed to load account information', 'error')
        })
    }
  }, [isOpen, showToast])

  const handleRefreshAccount = useCallback(async () => {
    try {
      const info = await serverApi.getAccountInfo()
      setAccountInfo(info)
    } catch (error) {
      log.error(`Failed to refresh account info: ${error}`, 'SettingsDialog')
      showToast('Failed to refresh account information', 'error')
      throw error
    }
  }, [showToast])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-8">
      <div className="flex h-[620px] w-full max-w-5xl overflow-hidden rounded-[22px] bg-surface-solid shadow-[var(--shadow-2)] border border-stroke/20 animate-in zoom-in-95 duration-300">
        {/* Sidebar */}
        <SettingsSidebar
          activeTab={activeTab}
          onTabChange={setSettingsTab}
          onClose={onClose}
        />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <SettingsContent
            activeTab={activeTab}
            accountInfo={accountInfo}
            onRefreshAccount={handleRefreshAccount}
          />

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-stroke/20 bg-surface-solid/60 px-6 py-4">
            <button
              className="rounded-lg px-5 py-2 text-sm font-medium text-text-2 hover:bg-surface-hover/[0.12] transition-colors"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
