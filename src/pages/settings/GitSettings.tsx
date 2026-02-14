import { memo, useState, useEffect } from 'react'
import { configApi } from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Switch } from '../../components/ui/Switch'
import { Select } from '../../components/ui/Select'
import {
  SettingsSection,
  SettingsCard,
  SettingsList,
  SettingsRow,
} from '../../components/settings/SettingsLayout'

const FORCE_PUSH_OPTIONS = [
  { value: 'ask', label: 'Always ask' },
  { value: 'feature', label: 'Allow for feature branches' },
  { value: 'never', label: 'Never' },
]

/**
 * Git settings page
 * Branch naming, commit settings, PR settings
 */
export const GitSettings = memo(function GitSettings() {
  const [branchPrefix, setBranchPrefix] = useState('codex/')
  const [commitTemplate, setCommitTemplate] = useState('{description}')
  const [autoCommitMessages, setAutoCommitMessages] = useState(true)
  const [forcePush, setForcePush] = useState('ask')
  const [prTemplate, setPrTemplate] = useState('')
  const [defaultBaseBranch, setDefaultBaseBranch] = useState('main')
  const [isLoading, setIsLoading] = useState(true)

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await configApi.read()
        const config = response.config
        if (config['git.branchPrefix'] != null) setBranchPrefix(String(config['git.branchPrefix']))
        if (config['git.commitTemplate'] != null) setCommitTemplate(String(config['git.commitTemplate']))
        if (config['git.autoCommitMessages'] != null) setAutoCommitMessages(Boolean(config['git.autoCommitMessages']))
        if (config['git.forcePush'] != null) setForcePush(String(config['git.forcePush']))
        if (config['git.prTemplate'] != null) setPrTemplate(String(config['git.prTemplate']))
        if (config['git.defaultBaseBranch'] != null) setDefaultBaseBranch(String(config['git.defaultBaseBranch']))
      } catch {
        // Config not available, use defaults
      } finally {
        setIsLoading(false)
      }
    }
    void loadConfig()
  }, [])

  const saveConfig = async (key: string, value: string | boolean | null) => {
    try {
      await configApi.write(key, value)
    } catch {
      // Silently fail - config write may not be supported yet
    }
  }

  const handleBranchPrefixChange = (value: string) => {
    setBranchPrefix(value)
    void saveConfig('git.branchPrefix', value)
  }

  const handleCommitTemplateChange = (value: string) => {
    setCommitTemplate(value)
    void saveConfig('git.commitTemplate', value)
  }

  const handleAutoCommitToggle = (checked: boolean) => {
    setAutoCommitMessages(checked)
    void saveConfig('git.autoCommitMessages', checked)
  }

  const handleForcePushChange = (value: string) => {
    setForcePush(value)
    void saveConfig('git.forcePush', value)
  }

  const handlePrTemplateChange = (value: string) => {
    setPrTemplate(value)
    void saveConfig('git.prTemplate', value)
  }

  const handleDefaultBaseBranchChange = (value: string) => {
    setDefaultBaseBranch(value)
    void saveConfig('git.defaultBaseBranch', value)
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-3 py-8">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Loading git settings...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Branch Naming */}
      <SettingsSection
        title="Branch Naming"
        description="Configure how branches are named for new threads."
      >
        <SettingsCard>
          <SettingsList>
            <SettingsRow
              title="Branch name prefix"
              description="Prefix used when creating branches automatically."
              align="start"
            >
              <div className="w-48">
                <Input
                  value={branchPrefix}
                  onChange={(e) => handleBranchPrefixChange(e.target.value)}
                  placeholder="codex/"
                  inputSize="sm"
                />
              </div>
            </SettingsRow>
          </SettingsList>
          <div className="mt-3 rounded-lg bg-surface-hover/[0.06] border border-stroke/10 px-3 py-2">
            <div className="text-[10px] text-text-3 uppercase tracking-wider mb-1">Preview</div>
            <div className="text-xs text-text-2 font-mono">
              {branchPrefix}feature-name
            </div>
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* Commit Settings */}
      <SettingsSection
        title="Commit Settings"
        description="Configure commit message behavior."
      >
        <SettingsCard>
          <SettingsList>
            <SettingsRow
              title="Auto-generate commit messages"
              description="Let AI generate commit messages based on changes."
            >
              <Switch
                checked={autoCommitMessages}
                onChange={handleAutoCommitToggle}
                aria-label="Auto-generate commit messages"
              />
            </SettingsRow>
            <SettingsRow
              title="Force push behavior"
              description="Control when force push is allowed."
            >
              <div className="w-56">
                <Select
                  selectSize="sm"
                  options={FORCE_PUSH_OPTIONS}
                  value={forcePush}
                  onChange={(e) => handleForcePushChange(e.target.value)}
                />
              </div>
            </SettingsRow>
          </SettingsList>
          <div className="mt-4">
            <div className="text-sm font-medium text-text-1 mb-1">Commit message template</div>
            <div className="text-xs text-text-3 mb-2">
              Use {'{'}<span className="text-text-2">description</span>{'}'} as a placeholder for the generated message.
            </div>
            <Textarea
              value={commitTemplate}
              onChange={(e) => handleCommitTemplateChange(e.target.value)}
              placeholder="{description}"
              className="min-h-[80px] font-mono text-xs"
            />
          </div>
        </SettingsCard>
      </SettingsSection>

      {/* PR Settings */}
      <SettingsSection
        title="Pull Request Settings"
        description="Configure pull request defaults."
      >
        <SettingsCard>
          <SettingsList>
            <SettingsRow
              title="Default base branch"
              description="The branch PRs are created against by default."
              align="start"
            >
              <div className="w-36">
                <Input
                  value={defaultBaseBranch}
                  onChange={(e) => handleDefaultBaseBranchChange(e.target.value)}
                  placeholder="main"
                  inputSize="sm"
                />
              </div>
            </SettingsRow>
          </SettingsList>
          <div className="mt-4">
            <div className="text-sm font-medium text-text-1 mb-1">PR description template</div>
            <div className="text-xs text-text-3 mb-2">
              Template used when creating pull requests.
            </div>
            <Textarea
              value={prTemplate}
              onChange={(e) => handlePrTemplateChange(e.target.value)}
              placeholder="## Summary&#10;&#10;## Changes&#10;&#10;## Test Plan"
              className="min-h-[120px] font-mono text-xs"
            />
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
})
