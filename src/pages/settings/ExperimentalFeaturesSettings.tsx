import { useEffect } from 'react'
import { FlaskConical, Loader2 } from 'lucide-react'
import { useExperimentalFeaturesStore } from '../../stores/experimentalFeatures'
import { Switch } from '../../components/ui/Switch'

export function ExperimentalFeaturesSettings() {
  const { features, loading, error, fetchFeatures, toggleFeature } =
    useExperimentalFeaturesStore()

  useEffect(() => {
    void fetchFeatures()
  }, [fetchFeatures])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-lg font-semibold text-text-1">Experimental Features</h2>
        <p className="text-sm text-text-3 mt-1">
          These features are experimental and may change or be removed in future releases.
          Feature availability is determined by the Codex app server.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-text-3" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-8 text-status-error">
          <p className="text-sm">Failed to load experimental features.</p>
          <p className="text-xs text-text-3 mt-1">{error}</p>
        </div>
      ) : features.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-text-3">
          <FlaskConical size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No experimental features available</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {features.map((feature) => (
            <div
              key={feature.name}
              className="flex items-center justify-between gap-4 rounded-lg px-3 py-3 hover:bg-surface-hover/[0.04] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-1">{feature.name}</p>
                {feature.description && (
                  <p className="text-xs text-text-3 mt-0.5">{feature.description}</p>
                )}
              </div>
              <Switch
                checked={feature.enabled}
                onChange={(checked) => void toggleFeature(feature.name, checked)}
                aria-label={`Toggle ${feature.name}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
