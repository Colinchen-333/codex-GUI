import { create } from 'zustand'
import { serverApi, type AccountInfo, type RateLimitSnapshot } from '../lib/api'

export interface McpOauthLoginResult {
  name: string
  success: boolean
  error?: string | null
  timestamp: number
}

export interface AccountLoginResult {
  loginId?: string | null
  success: boolean
  error?: string | null
  timestamp: number
}

interface AccountState {
  accountInfo: AccountInfo | null
  rateLimits: RateLimitSnapshot | null
  rateLimitsUpdatedAt: number | null
  lastMcpOauthLogin: McpOauthLoginResult | null
  lastAccountLogin: AccountLoginResult | null

  setAccountInfo: (info: AccountInfo | null) => void
  setRateLimits: (limits: RateLimitSnapshot | null) => void
  refreshAccountInfo: () => Promise<void>
  refreshRateLimits: () => Promise<void>
  recordMcpOauthLogin: (result: Omit<McpOauthLoginResult, 'timestamp'>) => void
  recordAccountLogin: (result: Omit<AccountLoginResult, 'timestamp'>) => void
}

export const useAccountStore = create<AccountState>((set) => ({
  accountInfo: null,
  rateLimits: null,
  rateLimitsUpdatedAt: null,
  lastMcpOauthLogin: null,
  lastAccountLogin: null,

  setAccountInfo: (info) => set({ accountInfo: info }),
  setRateLimits: (limits) =>
    set({ rateLimits: limits, rateLimitsUpdatedAt: limits ? Date.now() : null }),

  refreshAccountInfo: async () => {
    try {
      const info = await serverApi.getAccountInfo()
      set({ accountInfo: info })
    } catch (error) {
      console.error('Failed to fetch account info:', error)
    }
  },

  refreshRateLimits: async () => {
    try {
      const response = await serverApi.getAccountRateLimits()
      set({ rateLimits: response.rateLimits, rateLimitsUpdatedAt: Date.now() })
    } catch (error) {
      console.error('Failed to fetch rate limits:', error)
    }
  },

  recordMcpOauthLogin: (result) =>
    set({ lastMcpOauthLogin: { ...result, timestamp: Date.now() } }),

  recordAccountLogin: (result) =>
    set({ lastAccountLogin: { ...result, timestamp: Date.now() } }),
}))
