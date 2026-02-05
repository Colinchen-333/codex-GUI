import { SettingsSection, SettingsCard } from '../../components/settings/SettingsLayout'

export function SettingsLicensesPage() {
  return (
    <SettingsSection
      title="Open Source Licenses"
      description="Third-party license disclosures."
    >
      <SettingsCard>
        <p className="text-sm text-text-3">License disclosures will appear here.</p>
      </SettingsCard>
    </SettingsSection>
  )
}
