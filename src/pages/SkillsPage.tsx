import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, Sparkles, ExternalLink, Copy, Zap } from 'lucide-react'
import { PageScaffold } from '../components/layout/PageScaffold'
import { BaseDialog } from '../components/ui/BaseDialog'
import { CreateAutomationDialog } from '../components/automations'
import { useToast } from '../components/ui/Toast'
import { parseError } from '../lib/errorUtils'
import { serverApi, type SkillMetadata } from '../lib/api'
import { useProjectsStore } from '../stores/projects'

function buildPromptExample(skill: SkillMetadata) {
  return `Use $${skill.name} to help with ${skill.shortDescription || skill.description.toLowerCase()}.`
}

export function SkillsPage() {
  const { selectedProjectId, projects } = useProjectsStore()
  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const { showToast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [skills, setSkills] = useState<SkillMetadata[]>([])
  const [errors, setErrors] = useState<string | null>(null)
  const [previewSkill, setPreviewSkill] = useState<SkillMetadata | null>(null)
  const [automateSkill, setAutomateSkill] = useState<SkillMetadata | null>(null)

  const loadSkills = useCallback(async (forceReload = false) => {
    if (!selectedProject) {
      setSkills([])
      setErrors(null)
      return
    }
    setIsLoading(true)
    setErrors(null)
    try {
      const response = await serverApi.listSkills([selectedProject.path], forceReload, selectedProjectId ?? undefined)
      const nextSkills = response.data.flatMap((entry) => entry.skills)
      const errorMessages = response.data.flatMap((entry) => entry.errors.map((e) => `${entry.cwd}: ${e.message}`))
      setSkills(nextSkills)
      setErrors(errorMessages.length > 0 ? errorMessages.join('\n') : null)
    } catch (error) {
      setErrors(parseError(error))
      setSkills([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedProject, selectedProjectId])

  useEffect(() => {
    void loadSkills()
  }, [loadSkills])

  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return skills
    const query = searchQuery.trim().toLowerCase()
    return skills.filter((skill) =>
      [skill.name, skill.description, skill.shortDescription, skill.path, skill.scope]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    )
  }, [skills, searchQuery])

  const emptyState = !isLoading && skills.length === 0
  const filteredEmptyState = !isLoading && skills.length > 0 && filteredSkills.length === 0

  return (
    <PageScaffold title="Skills" description="Browse installed and recommended skills.">
      <div className="skills-page-surface">
        <div className="skills-page-container py-6">
          <div className="inbox-toolbar">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
              <input
                type="text"
                placeholder="Search skills..."
                className="w-full rounded-md border border-stroke/20 bg-surface-solid py-2 pl-9 pr-3 text-sm text-text-1 placeholder:text-text-3 focus:border-stroke/50 focus:outline-none focus:ring-2 focus:ring-primary/10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search skills"
              />
            </div>
            <div className="inbox-toolbar__actions">
              <button
                className="inline-flex items-center gap-2 rounded-md border border-stroke/30 bg-surface-solid px-3 py-2 text-xs font-semibold text-text-2 transition-colors hover:bg-surface-hover/[0.1]"
                onClick={() => void loadSkills(true)}
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-1">Installed</h2>
              <span className="text-xs text-text-3">{skills.length} skills</span>
            </div>

            {isLoading && (
              <div className="rounded-lg border border-stroke/20 bg-surface-solid p-4 text-sm text-text-3">
                Loading skills...
              </div>
            )}

            {errors && (
              <div className="rounded-lg border border-status-error/30 bg-status-error-muted p-4 text-xs text-status-error">
                {errors}
              </div>
            )}

            {emptyState && (
              <div className="rounded-lg border border-dashed border-stroke/30 bg-surface-solid p-6 text-sm text-text-3">
                {selectedProject ? 'No skills found in this workspace.' : 'Select a workspace to view skills.'}
              </div>
            )}

            {filteredEmptyState && (
              <div className="rounded-lg border border-dashed border-stroke/30 bg-surface-solid p-6 text-sm text-text-3">
                No skills match your search.
              </div>
            )}

            {!isLoading && filteredSkills.length > 0 && (
              <div className="skills-grid">
                {filteredSkills.map((skill) => (
                  <div
                    key={skill.path}
                    className="group rounded-2xl border border-stroke/20 bg-surface-solid p-4 shadow-[var(--shadow-1)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-text-1">{skill.name}</div>
                        <div className="mt-1 text-xs text-text-3 line-clamp-2">
                          {skill.shortDescription || skill.description}
                        </div>
                      </div>
                      <button
                        className="text-text-3 hover:text-text-1"
                        onClick={() => setPreviewSkill(skill)}
                        aria-label="Preview skill"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-text-3">
                      <span className="rounded-full bg-surface-hover/[0.1] px-2 py-0.5">{skill.scope}</span>
                      <span className="truncate">{skill.path}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        className="rounded-md border border-stroke/30 bg-surface-solid px-3 py-1.5 text-[11px] font-semibold text-text-2 transition-colors hover:bg-surface-hover/[0.1]"
                        onClick={() => setPreviewSkill(skill)}
                      >
                        Preview
                      </button>
                      <button
                        className="rounded-md border border-stroke/30 bg-surface-solid px-3 py-1.5 text-[11px] font-semibold text-text-2 transition-colors hover:bg-surface-hover/[0.1]"
                        onClick={() => {
                          void navigator.clipboard?.writeText(`$${skill.name}`)
                          showToast('Skill mention copied', 'success')
                        }}
                      >
                        Copy mention
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
                        onClick={() => setAutomateSkill(skill)}
                      >
                        <Zap size={11} />
                        Automate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-1">
              <Sparkles size={16} className="text-text-3" />
              Recommended
            </div>
            <div className="rounded-lg border border-dashed border-stroke/30 bg-surface-solid p-6 text-sm text-text-3">
              Recommendations are available when a workspace is connected.
            </div>
          </section>
        </div>
      </div>

      <BaseDialog
        isOpen={!!previewSkill}
        onClose={() => setPreviewSkill(null)}
        title={previewSkill?.name ?? 'Skill Preview'}
        description="Skill preview"
        maxWidth="lg"
      >
        <div className="space-y-4 p-6 text-sm text-text-2">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-text-1">Description</div>
            <p className="text-sm text-text-2">
              {previewSkill?.description || 'No description available.'}
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-text-1">Sample prompt</div>
            <div className="rounded-lg border border-stroke/20 bg-surface/30 p-3 text-xs text-text-2">
              {previewSkill ? buildPromptExample(previewSkill) : ''}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-md bg-surface-hover/[0.1] px-3 py-2 text-xs font-semibold text-text-1 hover:bg-surface-hover/[0.2]"
              onClick={() => {
                if (!previewSkill) return
                void navigator.clipboard?.writeText(buildPromptExample(previewSkill))
                showToast('Prompt copied', 'success')
              }}
            >
              <Copy size={12} />
              Copy prompt
            </button>
          </div>
        </div>
      </BaseDialog>

      <CreateAutomationDialog
        isOpen={!!automateSkill}
        onClose={() => setAutomateSkill(null)}
        preselectedSkill={automateSkill}
      />
    </PageScaffold>
  )
}
