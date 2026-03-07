import { create } from 'zustand'
import { experimentalFeaturesApi } from '../lib/api'
import { logError, parseError } from '../lib/errorUtils'

export interface ExperimentalFeature {
  name: string
  enabled: boolean
  description?: string
}

interface ExperimentalFeaturesState {
  features: ExperimentalFeature[]
  loading: boolean
  error: string | null

  // Actions
  fetchFeatures: () => Promise<void>
  toggleFeature: (name: string, enabled: boolean) => Promise<void>
}

export const useExperimentalFeaturesStore = create<ExperimentalFeaturesState>((set, get) => ({
  features: [],
  loading: false,
  error: null,

  fetchFeatures: async () => {
    const { loading } = get()
    if (loading) return

    set({ loading: true, error: null })
    try {
      const response = await experimentalFeaturesApi.list()
      const features: ExperimentalFeature[] = Array.isArray(response?.data)
        ? response.data
        : []
      set({ features, loading: false })
    } catch (error) {
      logError(error, {
        context: 'fetchFeatures',
        source: 'experimentalFeatures',
        details: 'Failed to fetch experimental features',
      })
      set({ error: parseError(error), loading: false })
    }
  },

  toggleFeature: async (name: string, enabled: boolean) => {
    // Optimistically update local state
    const previousFeatures = get().features
    set((state) => ({
      features: state.features.map((f) =>
        f.name === name ? { ...f, enabled } : f
      ),
    }))

    try {
      await experimentalFeaturesApi.toggle(name, enabled)
    } catch (error) {
      // Revert on error
      logError(error, {
        context: 'toggleFeature',
        source: 'experimentalFeatures',
        details: `Failed to toggle feature "${name}"`,
      })
      set({ features: previousFeatures })
    }
  },
}))
