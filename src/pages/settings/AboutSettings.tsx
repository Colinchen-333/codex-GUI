import { memo, useEffect, useState } from 'react'
import { serverApi, type ServerStatus } from '../../lib/api'
import { logError } from '../../lib/errorUtils'
import {
  SettingsSection,
  SettingsCard,
  SettingsList,
  SettingsRow,
} from '../../components/settings/SettingsLayout'

/**
 * About settings page
 * App version, engine status, links
 */
export const AboutSettings = memo(function AboutSettings() {
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)

  useEffect(() => {
    serverApi
      .getStatus()
      .then(setServerStatus)
      .catch((error) => {
        logError(error, {
          context: 'AboutSettings',
          source: 'settings',
          details: 'Failed to get server status',
        })
      })
  }, [])

  return (
    <div className="space-y-8">
      <SettingsSection
        title="About"
        description="Application information and links."
      >
        <SettingsCard>
          <div className="text-center py-4">
            <h2 className="text-xl font-semibold text-text-1 mb-1">Codex Desktop</h2>
            <p className="text-sm text-text-3">
              A desktop interface for the Codex AI coding assistant
            </p>
          </div>

          <SettingsList>
            <SettingsRow title="App Version">
              <span className="text-sm font-mono text-text-2">1.0.0</span>
            </SettingsRow>
            <SettingsRow title="Engine Version">
              <span className="text-sm font-mono text-text-2">
                {serverStatus?.version || 'Unknown'}
              </span>
            </SettingsRow>
            <SettingsRow title="Engine Status">
              <span
                className={`text-sm font-medium ${
                  serverStatus?.isRunning
                    ? 'text-status-success'
                    : 'text-status-error'
                }`}
              >
                {serverStatus?.isRunning ? 'Running' : 'Stopped'}
              </span>
            </SettingsRow>
            <SettingsRow title="Platform">
              <span className="text-sm font-mono text-text-2">Tauri + React</span>
            </SettingsRow>
          </SettingsList>
        </SettingsCard>

        <SettingsCard>
          <SettingsList>
            <SettingsRow
              title="Source Code"
              description="View the project on GitHub."
            >
              <a
                href="https://github.com/anthropics/codex"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                GitHub
              </a>
            </SettingsRow>
            <SettingsRow
              title="Documentation"
              description="Read the official documentation."
            >
              <a
                href="https://github.com/anthropics/codex#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Docs
              </a>
            </SettingsRow>
          </SettingsList>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
})
