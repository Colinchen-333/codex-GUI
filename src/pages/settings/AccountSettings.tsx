import { memo, useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  serverApi,
  type AccountInfo,
  type RateLimitSnapshot,
} from '../../lib/api'
import { log } from '../../lib/logger'
import { useToast } from '../../components/ui/Toast'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import {
  SettingsSection,
  SettingsCard,
  SettingsList,
  SettingsRow,
} from '../../components/settings/SettingsLayout'

// ---- Sub-components ----

/**
 * API key login form
 */
const ApiKeyLoginForm = memo(function ApiKeyLoginForm({
  isLoggingIn,
  onLogin,
  onCancel,
}: {
  isLoggingIn: boolean
  onLogin: (apiKey: string) => Promise<void>
  onCancel: () => void
}) {
  const [apiKey, setApiKey] = useState('')
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      setApiKeyError('Please enter an API key')
      return
    }
    setApiKeyError(null)
    try {
      await onLogin(apiKey.trim())
    } catch {
      setApiKeyError('Invalid API key or login failed')
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="Enter your API key"
        className="w-full rounded-lg border border-stroke/30 bg-surface-solid px-3 py-2.5 text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
        autoFocus
      />
      {apiKeyError && <p className="text-xs text-destructive">{apiKeyError}</p>}
      <div className="flex gap-2">
        <button
          className="flex-1 rounded-lg bg-surface-hover/[0.18] px-4 py-2.5 text-sm font-medium text-text-1 hover:bg-surface-hover/[0.24] disabled:opacity-50"
          onClick={handleSubmit}
          disabled={isLoggingIn || !apiKey.trim()}
        >
          {isLoggingIn ? 'Verifying...' : 'Login with API Key'}
        </button>
        <button
          className="rounded-lg border border-stroke/30 bg-surface-hover/[0.1] px-4 py-2.5 text-sm font-medium text-text-2 hover:text-text-1"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  )
})

/**
 * Rate limit usage bar
 */
const UsageBar = memo(function UsageBar({
  label,
  usedPercent,
  resetsAt,
}: {
  label: string
  usedPercent: number
  resetsAt?: number | null
}) {
  const barColor =
    usedPercent >= 90
      ? 'bg-status-error'
      : usedPercent >= 70
        ? 'bg-status-warning'
        : 'bg-primary'

  const resetTime = resetsAt
    ? new Date(resetsAt * 1000).toLocaleTimeString()
    : null

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-2">{label}</span>
        <span className="text-text-3 tabular-nums">{Math.round(usedPercent)}% used</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover/[0.15]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(usedPercent, 100)}%` }}
        />
      </div>
      {resetTime && (
        <div className="text-[10px] text-text-3">
          Resets at {resetTime}
        </div>
      )}
    </div>
  )
})

/**
 * Logged-in user view with account info
 */
const LoggedInView = memo(function LoggedInView({
  accountInfo,
  isLoggingOut,
  onLogout,
}: {
  accountInfo: AccountInfo
  isLoggingOut: boolean
  onLogout: () => void
}) {
  return (
    <div className="rounded-lg border border-stroke/20 bg-surface-hover/[0.06] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-selected/[0.2] text-lg text-text-1">
            {accountInfo.account?.email?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-medium text-text-1">{accountInfo.account?.email}</div>
            {accountInfo.account?.planType && (
              <div className="text-sm text-text-3">
                Plan: {accountInfo.account.planType}
              </div>
            )}
          </div>
        </div>
        <button
          className="rounded-lg border border-stroke/30 bg-surface-hover/[0.1] px-4 py-2 text-sm font-medium text-text-2 hover:text-text-1 disabled:opacity-50"
          onClick={onLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Logging out...' : 'Log Out'}
        </button>
      </div>
    </div>
  )
})

/**
 * Login view with browser OAuth and API key options
 */
const LoginView = memo(function LoginView({
  isLoggingIn,
  showApiKeyInput,
  onBrowserLogin,
  onApiKeyLogin,
  onShowApiKeyInput,
  onHideApiKeyInput,
}: {
  isLoggingIn: boolean
  showApiKeyInput: boolean
  onBrowserLogin: () => void
  onApiKeyLogin: (apiKey: string) => Promise<void>
  onShowApiKeyInput: () => void
  onHideApiKeyInput: () => void
}) {
  return (
    <div className="rounded-lg border border-stroke/20 bg-surface-hover/[0.06] p-4 space-y-4">
      <p className="text-text-3">
        Log in to use Codex with your account.
      </p>

      <button
        className="w-full rounded-lg bg-surface-hover/[0.18] px-4 py-3 text-sm font-medium text-text-1 hover:bg-surface-hover/[0.24] disabled:opacity-50"
        onClick={onBrowserLogin}
        disabled={isLoggingIn}
      >
        {isLoggingIn && !showApiKeyInput
          ? 'Opening browser...'
          : 'Log In with Browser'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-stroke/20" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-surface-solid px-2 text-text-3">Or</span>
        </div>
      </div>

      {showApiKeyInput ? (
        <ApiKeyLoginForm
          isLoggingIn={isLoggingIn}
          onLogin={onApiKeyLogin}
          onCancel={onHideApiKeyInput}
        />
      ) : (
        <button
          className="w-full rounded-lg border border-stroke/30 bg-surface-solid px-4 py-3 text-sm font-medium text-text-1 hover:bg-surface-hover/[0.12] transition-colors"
          onClick={onShowApiKeyInput}
          disabled={isLoggingIn}
        >
          Use API Key
        </button>
      )}

      <p className="text-center text-xs text-text-3">
        Or use terminal:{' '}
        <code className="rounded bg-surface-hover/[0.12] px-1.5 py-0.5">codex login</code>
      </p>
    </div>
  )
})

// ---- Main Component ----

/**
 * Account settings page
 * Login/logout, account info, rate limits, usage stats
 */
export const AccountSettings = memo(function AccountSettings() {
  const { showToast } = useToast()

  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
  const [rateLimits, setRateLimits] = useState<RateLimitSnapshot | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false)
  const [isLoadingRateLimits, setIsLoadingRateLimits] = useState(false)

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
        pollTimeoutRef.current = null
      }
    }
  }, [])

  const loadAccountInfo = useCallback(async () => {
    try {
      const info = await serverApi.getAccountInfo()
      if (isMountedRef.current) setAccountInfo(info)
    } catch (error) {
      log.error(`Failed to get account info: ${error}`, 'AccountSettings')
      showToast('Failed to load account information', 'error')
    }
  }, [showToast])

  const loadRateLimits = useCallback(async () => {
    setIsLoadingRateLimits(true)
    try {
      const response = await serverApi.getAccountRateLimits()
      if (isMountedRef.current) setRateLimits(response.rateLimits)
    } catch (error) {
      log.error(`Failed to get rate limits: ${error}`, 'AccountSettings')
    } finally {
      if (isMountedRef.current) setIsLoadingRateLimits(false)
    }
  }, [])

  useEffect(() => {
    void loadAccountInfo()
    void loadRateLimits()
  }, [loadAccountInfo, loadRateLimits])

  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
  }, [])

  const handleBrowserLogin = useCallback(async () => {
    if (!isMountedRef.current) return
    clearPolling()
    setIsLoggingIn(true)
    try {
      const response = await serverApi.startLogin('chatgpt')
      if (response.authUrl) {
        const { open } = await import('@tauri-apps/plugin-shell')
        await open(response.authUrl)
      }
      pollIntervalRef.current = setInterval(async () => {
        if (!isMountedRef.current) {
          clearPolling()
          return
        }
        try {
          const info = await serverApi.getAccountInfo()
          if (!isMountedRef.current) return
          if (info.account) {
            clearPolling()
            setAccountInfo(info)
            void loadRateLimits()
            setIsLoggingIn(false)
          }
        } catch (pollError) {
          log.error(`Polling error: ${pollError}`, 'AccountSettings')
        }
      }, 2000)
      pollTimeoutRef.current = setTimeout(() => {
        clearPolling()
        if (isMountedRef.current) setIsLoggingIn(false)
      }, 60000)
    } catch (error) {
      log.error(`Login failed: ${error}`, 'AccountSettings')
      if (isMountedRef.current) setIsLoggingIn(false)
    }
  }, [clearPolling, loadRateLimits])

  const handleApiKeyLogin = useCallback(
    async (apiKey: string) => {
      setIsLoggingIn(true)
      try {
        await serverApi.startLogin('apiKey', apiKey)
        await loadAccountInfo()
        void loadRateLimits()
        setShowApiKeyInput(false)
      } catch (error) {
        log.error(`API key login failed: ${error}`, 'AccountSettings')
        throw error
      } finally {
        setIsLoggingIn(false)
      }
    },
    [loadAccountInfo, loadRateLimits]
  )

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true)
    try {
      await serverApi.logout()
      setAccountInfo(null)
      setRateLimits(null)
    } catch (error) {
      log.error(`Logout failed: ${error}`, 'AccountSettings')
    } finally {
      setIsLoggingOut(false)
    }
  }, [])

  const handleClearData = useCallback(() => {
    localStorage.clear()
    window.location.reload()
  }, [])

  const isLoggedIn = !!accountInfo?.account

  return (
    <div className="space-y-8">
      {/* Account Identity */}
      <SettingsSection title="Account" description="Manage your login and account details.">
        <SettingsCard>
          {isLoggedIn ? (
            <LoggedInView
              accountInfo={accountInfo!}
              isLoggingOut={isLoggingOut}
              onLogout={handleLogout}
            />
          ) : (
            <LoginView
              isLoggingIn={isLoggingIn}
              showApiKeyInput={showApiKeyInput}
              onBrowserLogin={handleBrowserLogin}
              onApiKeyLogin={handleApiKeyLogin}
              onShowApiKeyInput={() => setShowApiKeyInput(true)}
              onHideApiKeyInput={() => setShowApiKeyInput(false)}
            />
          )}
        </SettingsCard>
      </SettingsSection>

      {/* Usage & Rate Limits (only when logged in) */}
      {isLoggedIn && (
        <SettingsSection
          title="Usage"
          description="API rate limits and credit balance."
        >
          <SettingsCard>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-text-2">Rate Limits</div>
              <button
                className="flex items-center gap-1 text-xs text-text-3 hover:text-text-1 transition-colors"
                onClick={() => void loadRateLimits()}
                disabled={isLoadingRateLimits}
                aria-label="Refresh rate limits"
              >
                <RefreshCw
                  size={12}
                  className={isLoadingRateLimits ? 'animate-spin' : ''}
                />
                Refresh
              </button>
            </div>

            {isLoadingRateLimits && !rateLimits ? (
              <div className="flex items-center gap-2 text-sm text-text-3 py-4">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Loading usage data...
              </div>
            ) : rateLimits ? (
              <div className="space-y-4">
                {rateLimits.primary && (
                  <UsageBar
                    label="Primary"
                    usedPercent={rateLimits.primary.usedPercent}
                    resetsAt={rateLimits.primary.resetsAt}
                  />
                )}
                {rateLimits.secondary && (
                  <UsageBar
                    label="Secondary"
                    usedPercent={rateLimits.secondary.usedPercent}
                    resetsAt={rateLimits.secondary.resetsAt}
                  />
                )}

                {rateLimits.credits && (
                  <div className="pt-2 border-t border-stroke/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-2">Credits</span>
                      <span className="text-text-1 font-medium">
                        {rateLimits.credits.unlimited
                          ? 'Unlimited'
                          : rateLimits.credits.balance ?? (rateLimits.credits.hasCredits ? 'Available' : 'None')}
                      </span>
                    </div>
                  </div>
                )}

                {rateLimits.planType && (
                  <div className="pt-2 border-t border-stroke/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-2">Plan</span>
                      <span className="text-text-1 font-medium capitalize">
                        {rateLimits.planType}
                      </span>
                    </div>
                  </div>
                )}

                {!rateLimits.primary && !rateLimits.secondary && !rateLimits.credits && (
                  <div className="text-sm text-text-3 py-2">
                    No rate limit data available.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-text-3 py-2">
                Unable to load rate limit data.
              </div>
            )}
          </SettingsCard>
        </SettingsSection>
      )}

      {/* Data Management */}
      <SettingsSection
        title="Data"
        description="Manage local application data."
      >
        <SettingsCard>
          <SettingsList>
            <SettingsRow
              title="Clear local data"
              description="Removes local settings and cached data. This will reload the app."
            >
              <button
                className="rounded-md border border-stroke/30 bg-surface-hover/[0.1] px-3 py-1.5 text-xs font-medium text-text-2 hover:text-text-1"
                onClick={() => setShowClearDataConfirm(true)}
              >
                Clear data
              </button>
            </SettingsRow>
          </SettingsList>
        </SettingsCard>
      </SettingsSection>

      <ConfirmDialog
        isOpen={showClearDataConfirm}
        title="Clear Local Data"
        message="Are you sure you want to clear all local settings and data? This action cannot be undone and will reload the application."
        confirmText="Clear Data"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleClearData}
        onCancel={() => setShowClearDataConfirm(false)}
      />
    </div>
  )
})
