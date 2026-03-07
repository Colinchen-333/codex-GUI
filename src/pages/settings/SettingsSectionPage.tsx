import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { GeneralSettings } from './GeneralSettings'
import { ConfigurationSettings } from './ConfigurationSettings'
import { SandboxSettings } from './SandboxSettings'
import { McpSettings } from './McpSettings'
import { GitSettings } from './GitSettings'
import { PersonalizationSettings } from './PersonalizationSettings'
import { AccountSettings } from './AccountSettings'
import { ArchivedThreadsSettings } from './ArchivedThreadsSettings'
import { UsageSettings } from './UsageSettings'
import { WorktreesSettingsPage } from './WorktreesSettingsPage'
import { ShortcutsSettings } from './ShortcutsSettings'
import { AboutSettings } from './AboutSettings'

type SettingsSectionId =
  | 'account' | 'general' | 'configuration' | 'sandbox' | 'git'
  | 'archived-threads' | 'personalization' | 'usage'
  | 'worktrees' | 'mcp' | 'skills' | 'shortcuts' | 'about'

function normalizeSection(section?: string): SettingsSectionId {
  switch (section) {
    case 'account':
    case 'configuration':
    case 'sandbox':
    case 'mcp':
    case 'git':
    case 'personalization':
    case 'archived-threads':
    case 'usage':
    case 'worktrees':
    case 'skills':
    case 'shortcuts':
    case 'about':
      return section
    // Legacy routes
    case 'model':
      return 'general'
    case 'safety':
    case 'allowlist':
      return 'sandbox'
    case 'agent':
      return 'configuration'
    case 'data-controls':
      return 'archived-threads'
    case 'general':
    default:
      return 'general'
  }
}

export function SettingsSectionPage() {
  const { section } = useParams()
  const activeSection = normalizeSection(section)

  const content = useMemo(() => {
    switch (activeSection) {
      case 'account':
        return <AccountSettings />
      case 'configuration':
        return <ConfigurationSettings />
      case 'sandbox':
        return <SandboxSettings />
      case 'mcp':
      case 'skills':
        return <McpSettings />
      case 'git':
        return <GitSettings />
      case 'personalization':
        return <PersonalizationSettings />
      case 'archived-threads':
        return <ArchivedThreadsSettings />
      case 'usage':
        return <UsageSettings />
      case 'worktrees':
        return <WorktreesSettingsPage />
      case 'shortcuts':
        return <ShortcutsSettings />
      case 'about':
        return <AboutSettings />
      case 'general':
      default:
        return <GeneralSettings />
    }
  }, [activeSection])

  return <div className="space-y-6">{content}</div>
}
