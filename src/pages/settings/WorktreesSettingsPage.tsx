import { SettingsSection, SettingsCard, SettingsList, SettingsRow } from '../../components/settings/SettingsLayout'

export function WorktreesSettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Worktrees"
        description="Manage worktree locations and cleanup policies."
      >
        <SettingsCard>
          <SettingsList>
            <SettingsRow
              title="No worktrees configured"
              description="Worktrees will appear here once created."
              align="start"
            >
              <button className="rounded-md border border-stroke/30 bg-surface-solid px-3 py-1.5 text-xs font-semibold text-text-2 hover:bg-surface-hover/[0.1]">
                Add worktree
              </button>
            </SettingsRow>
          </SettingsList>
        </SettingsCard>
      </SettingsSection>
    </div>
  )
}
