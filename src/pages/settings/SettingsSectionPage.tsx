import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { GeneralSettings } from './GeneralSettings'
import { SandboxSettings } from './SandboxSettings'
import { McpSettings } from './McpSettings'
import { GitSettings } from './GitSettings'
import { PersonalizationSettings } from './PersonalizationSettings'
import { AccountSettings } from './AccountSettings'
import { WorktreesSettingsPage } from './WorktreesSettingsPage'
import { ShortcutsSettings } from './ShortcutsSettings'
import { AboutSettings } from './AboutSettings'

type SettingsSectionId = 'general' | 'sandbox' | 'mcp' | 'git' | 'personalization' | 'account' | 'worktrees' | 'shortcuts' | 'about'

function normalizeSection(section?: string): SettingsSectionId {
  switch (section) {
    case 'sandbox':
    case 'mcp':
    case 'git':
    case 'personalization':
    case 'account':
    case 'worktrees':
    case 'shortcuts':
    case 'about':
      return section
    // Legacy routes redirect to new pages
    case 'model':
      return 'general'
    case 'safety':
    case 'allowlist':
      return 'sandbox'
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
      case 'sandbox':
        return <SandboxSettings />
      case 'mcp':
        return <McpSettings />
      case 'git':
        return <GitSettings />
      case 'personalization':
        return <PersonalizationSettings />
      case 'account':
        return <AccountSettings />
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
