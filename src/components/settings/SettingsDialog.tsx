import { useState, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { serverApi, type AccountInfo } from '../../lib/api'
import { useTheme } from '../../lib/theme'
import { useSettingsStore, type Settings } from '../../stores/settings'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsTab = 'general' | 'model' | 'safety' | 'account'

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const { settings, updateSetting } = useSettingsStore()
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Fetch account info when dialog opens
      serverApi.getAccountInfo().then(setAccountInfo).catch(console.error)
    }
  }, [isOpen])

  const handleSave = () => {
    // Settings are already saved via zustand persist
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-[400px]">
          {/* Sidebar */}
          <div className="w-48 border-r border-border p-2">
            {[
              { id: 'general' as const, label: 'General', icon: '⚙️' },
              { id: 'model' as const, label: 'Model', icon: '🤖' },
              { id: 'safety' as const, label: 'Safety', icon: '🛡️' },
              { id: 'account' as const, label: 'Account', icon: '👤' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm',
                  activeTab === tab.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'model' && (
              <ModelSettings settings={settings} updateSetting={updateSetting} />
            )}
            {activeTab === 'safety' && (
              <SafetySettings settings={settings} updateSetting={updateSetting} />
            )}
            {activeTab === 'account' && (
              <AccountSettings
                accountInfo={accountInfo}
                onRefresh={async () => {
                  const info = await serverApi.getAccountInfo()
                  setAccountInfo(info)
                }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={handleSave}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// General Settings
function GeneralSettings() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">General Settings</h3>

      <div>
        <label className="mb-2 block text-sm font-medium">Theme</label>
        <div className="flex gap-2">
          {[
            { value: 'light' as const, label: 'Light', icon: '☀️' },
            { value: 'dark' as const, label: 'Dark', icon: '🌙' },
            { value: 'system' as const, label: 'System', icon: '💻' },
          ].map((option) => (
            <button
              key={option.value}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
                theme === option.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              )}
              onClick={() => setTheme(option.value)}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Choose your preferred color theme. System will automatically match your OS settings.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Reset Onboarding</label>
        <button
          className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          onClick={() => {
            localStorage.removeItem('codex-desktop-onboarded')
            window.location.reload()
          }}
        >
          Show Onboarding Again
        </button>
        <p className="mt-1 text-xs text-muted-foreground">
          This will show the welcome flow on next launch
        </p>
      </div>
    </div>
  )
}

// Model Settings
function ModelSettings({
  settings,
  updateSetting,
}: {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}) {
  const models = [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model, best for complex tasks' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Faster and more cost-effective' },
    { id: 'o1', name: 'o1', description: 'Advanced reasoning capabilities' },
    { id: 'o3-mini', name: 'o3-mini', description: 'Latest mini model with improved performance' },
  ]

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Model Settings</h3>

      <div>
        <label className="mb-2 block text-sm font-medium">Default Model</label>
        <div className="space-y-2">
          {models.map((model) => (
            <label
              key={model.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border p-3',
                settings.model === model.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <input
                type="radio"
                name="model"
                value={model.id}
                checked={settings.model === model.id}
                onChange={(e) => updateSetting('model', e.target.value)}
                className="h-4 w-4"
              />
              <div>
                <div className="font-medium">{model.name}</div>
                <div className="text-xs text-muted-foreground">{model.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// Safety Settings
function SafetySettings({
  settings,
  updateSetting,
}: {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Safety Settings</h3>

      <div>
        <label className="mb-2 block text-sm font-medium">Sandbox Mode</label>
        <select
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          value={settings.sandboxMode}
          onChange={(e) => updateSetting('sandboxMode', e.target.value as Settings['sandboxMode'])}
        >
          <option value="strict">Strict - Isolated environment only</option>
          <option value="permissive">Permissive - Limited file system access</option>
          <option value="off">Off - Full access (use with caution)</option>
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          Controls how Codex interacts with your file system
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Approval Mode</label>
        <select
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          value={settings.askForApproval}
          onChange={(e) => updateSetting('askForApproval', e.target.value as Settings['askForApproval'])}
        >
          <option value="always">Always ask for approval</option>
          <option value="auto">Auto-approve safe operations</option>
          <option value="never">Never ask (not recommended)</option>
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          When to ask for your confirmation before executing commands
        </p>
      </div>
    </div>
  )
}

// Account Settings
function AccountSettings({
  accountInfo,
  onRefresh,
}: {
  accountInfo: AccountInfo | null
  onRefresh: () => Promise<void>
}) {
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogin = async () => {
    setIsLoggingIn(true)
    try {
      const response = await serverApi.startLogin('chatgpt')
      // Open auth URL in browser if provided
      if (response.authUrl) {
        const { open } = await import('@tauri-apps/plugin-shell')
        await open(response.authUrl)
      }
      // Poll for login completion
      const checkLogin = setInterval(async () => {
        const info = await serverApi.getAccountInfo()
        if (info.account) {
          clearInterval(checkLogin)
          await onRefresh()
          setIsLoggingIn(false)
        }
      }, 2000)
      // Stop polling after 60 seconds
      setTimeout(() => {
        clearInterval(checkLogin)
        setIsLoggingIn(false)
      }, 60000)
    } catch (error) {
      console.error('Login failed:', error)
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await serverApi.logout()
      await onRefresh()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Account</h3>

      {accountInfo?.account ? (
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground">
                {accountInfo.account.email?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <div className="font-medium">{accountInfo.account.email}</div>
                {accountInfo.account.planType && (
                  <div className="text-sm text-muted-foreground">
                    Plan: {accountInfo.account.planType}
                  </div>
                )}
              </div>
            </div>
            <button
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Log Out'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border p-4">
          <p className="mb-4 text-muted-foreground">
            Log in to use Codex with your account.
          </p>
          <button
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            onClick={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? 'Opening browser...' : 'Log In with Browser'}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Or use terminal: <code className="rounded bg-secondary px-1.5 py-0.5">codex login</code>
          </p>
        </div>
      )}

      <div>
        <h4 className="mb-2 text-sm font-medium">Data & Privacy</h4>
        <button
          className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          onClick={() => {
            localStorage.clear()
            window.location.reload()
          }}
        >
          Clear Local Data
        </button>
        <p className="mt-1 text-xs text-muted-foreground">
          This will clear all local settings and data
        </p>
      </div>
    </div>
  )
}
