import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  GitBranch,
  Hand,
  Search,
  Sparkles,
} from 'lucide-react'
import { BaseDialog } from '../ui/BaseDialog'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'
import { useAutomationsStore, type Automation, type AutomationTrigger } from '../../stores/automations'
import { serverApi, type SkillMetadata } from '../../lib/api'
import { useProjectsStore } from '../../stores/projects'

interface CreateAutomationDialogProps {
  isOpen: boolean
  onClose: () => void
  editingAutomation?: Automation | null
  preselectedSkill?: SkillMetadata | null
}

type TriggerType = AutomationTrigger['type']

const triggerOptions: { type: TriggerType; label: string; description: string; icon: typeof Calendar }[] = [
  { type: 'schedule', label: 'Schedule', description: 'Run on a time-based schedule', icon: Calendar },
  { type: 'file_change', label: 'File Change', description: 'Run when files match a pattern', icon: FileText },
  { type: 'git_event', label: 'Git Event', description: 'Run on push, commit, or PR', icon: GitBranch },
  { type: 'manual', label: 'Manual', description: 'Run on demand only', icon: Hand },
]

const schedulePresets = [
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Daily at 9 AM', cron: '0 9 * * *' },
  { label: 'Weekdays at 9 AM', cron: '0 9 * * 1-5' },
  { label: 'Weekly on Monday', cron: '0 9 * * 1' },
  { label: 'Monthly on 1st', cron: '0 9 1 * *' },
]

const gitEventOptions: { event: 'push' | 'commit' | 'pr'; label: string }[] = [
  { event: 'push', label: 'Push' },
  { event: 'commit', label: 'Commit' },
  { event: 'pr', label: 'Pull Request' },
]

export function CreateAutomationDialog({
  isOpen,
  onClose,
  editingAutomation,
  preselectedSkill,
}: CreateAutomationDialogProps) {
  const { createAutomation, updateAutomation } = useAutomationsStore()
  const { selectedProjectId, projects } = useProjectsStore()
  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  // Step state: 0=select skill, 1=select trigger, 2=configure trigger, 3=name & description
  const [step, setStep] = useState(0)
  const [skills, setSkills] = useState<SkillMetadata[]>([])
  const [skillSearch, setSkillSearch] = useState('')
  const [isLoadingSkills, setIsLoadingSkills] = useState(false)

  // Form state
  const [selectedSkill, setSelectedSkill] = useState<SkillMetadata | null>(null)
  const [triggerType, setTriggerType] = useState<TriggerType>('manual')
  const [scheduleCron, setScheduleCron] = useState('0 9 * * 1-5')
  const [scheduleLabel, setScheduleLabel] = useState('Weekdays at 9 AM')
  const [filePatterns, setFilePatterns] = useState('**/*.ts')
  const [gitEvents, setGitEvents] = useState<Set<'push' | 'commit' | 'pr'>>(new Set(['push']))
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const isEditing = !!editingAutomation

  // Load skills
  const loadSkills = useCallback(async () => {
    if (!selectedProject) return
    setIsLoadingSkills(true)
    try {
      const response = await serverApi.listSkills([selectedProject.path], false, selectedProjectId ?? undefined)
      setSkills(response.data.flatMap((entry) => entry.skills))
    } catch {
      setSkills([])
    } finally {
      setIsLoadingSkills(false)
    }
  }, [selectedProject, selectedProjectId])

  useEffect(() => {
    if (isOpen) void loadSkills()
  }, [isOpen, loadSkills])

  // Reset form when dialog opens
  useEffect(() => {
    if (!isOpen) return

    if (editingAutomation) {
      const skill = skills.find((s) => s.name === editingAutomation.skillName) ?? null
      setSelectedSkill(skill)
      setTriggerType(editingAutomation.trigger.type)
      setName(editingAutomation.name)
      setDescription(editingAutomation.description)
      setStep(3) // Jump to name/description for edits

      if (editingAutomation.trigger.type === 'schedule') {
        setScheduleCron(editingAutomation.trigger.cron)
        setScheduleLabel(editingAutomation.trigger.label)
      } else if (editingAutomation.trigger.type === 'file_change') {
        setFilePatterns(editingAutomation.trigger.patterns.join(', '))
      } else if (editingAutomation.trigger.type === 'git_event') {
        setGitEvents(new Set(editingAutomation.trigger.events))
      }
    } else if (preselectedSkill) {
      setSelectedSkill(preselectedSkill)
      setStep(1) // Skip skill selection
      setTriggerType('manual')
      setName('')
      setDescription('')
    } else {
      setSelectedSkill(null)
      setStep(0)
      setTriggerType('manual')
      setScheduleCron('0 9 * * 1-5')
      setScheduleLabel('Weekdays at 9 AM')
      setFilePatterns('**/*.ts')
      setGitEvents(new Set(['push']))
      setName('')
      setDescription('')
      setSkillSearch('')
    }
  }, [isOpen, editingAutomation, preselectedSkill, skills])

  const filteredSkills = useMemo(() => {
    if (!skillSearch.trim()) return skills
    const q = skillSearch.toLowerCase()
    return skills.filter((s) =>
      s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    )
  }, [skills, skillSearch])

  const buildTrigger = (): AutomationTrigger => {
    switch (triggerType) {
      case 'schedule':
        return { type: 'schedule', cron: scheduleCron, label: scheduleLabel }
      case 'file_change':
        return { type: 'file_change', patterns: filePatterns.split(',').map((p) => p.trim()).filter(Boolean) }
      case 'git_event':
        return { type: 'git_event', events: Array.from(gitEvents) }
      case 'manual':
        return { type: 'manual' }
    }
  }

  const handleSave = () => {
    if (!selectedSkill || !name.trim()) return

    const trigger = buildTrigger()

    if (isEditing && editingAutomation) {
      updateAutomation(editingAutomation.id, {
        name: name.trim(),
        description: description.trim(),
        skillId: selectedSkill.path,
        skillName: selectedSkill.name,
        trigger,
      })
    } else {
      createAutomation({
        name: name.trim(),
        description: description.trim(),
        skillId: selectedSkill.path,
        skillName: selectedSkill.name,
        trigger,
        enabled: true,
      })
    }
    onClose()
  }

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!selectedSkill
      case 1:
        return true
      case 2:
        if (triggerType === 'git_event') return gitEvents.size > 0
        if (triggerType === 'file_change') return filePatterns.trim().length > 0
        return true
      case 3:
        return name.trim().length > 0
      default:
        return false
    }
  }

  const stepTitles = ['Select Skill', 'Select Trigger', 'Configure Trigger', 'Name & Save']

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Automation' : 'New Automation'}
      description={stepTitles[step]}
      maxWidth="lg"
    >
      <div className="p-6">
        {/* Step indicators */}
        <div className="mb-6 flex items-center gap-1">
          {stepTitles.map((title, i) => (
            <div key={title} className="flex items-center gap-1">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-colors',
                  i === step
                    ? 'bg-primary text-primary-foreground'
                    : i < step
                      ? 'bg-primary/20 text-primary'
                      : 'bg-surface-hover/[0.1] text-text-3'
                )}
              >
                {i + 1}
              </div>
              {i < stepTitles.length - 1 && (
                <div className={cn(
                  'h-px w-6',
                  i < step ? 'bg-primary/40' : 'bg-stroke/20'
                )} />
              )}
            </div>
          ))}
          <span className="ml-2 text-xs text-text-3">{stepTitles[step]}</span>
        </div>

        {/* Step 0: Select Skill */}
        {step === 0 && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
              <input
                type="text"
                placeholder="Search skills..."
                className="w-full rounded-md border border-stroke/20 bg-surface-solid py-2 pl-9 pr-3 text-sm text-text-1 placeholder:text-text-3 focus:border-stroke/50 focus:outline-none"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[280px] overflow-y-auto space-y-1">
              {isLoadingSkills && (
                <div className="py-8 text-center text-xs text-text-3">Loading skills...</div>
              )}
              {!isLoadingSkills && filteredSkills.length === 0 && (
                <div className="py-8 text-center text-xs text-text-3">
                  {selectedProject ? 'No skills found.' : 'Select a workspace first.'}
                </div>
              )}
              {filteredSkills.map((skill) => (
                <button
                  key={skill.path}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    selectedSkill?.path === skill.path
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-surface-hover/[0.08] border border-transparent'
                  )}
                  onClick={() => setSelectedSkill(skill)}
                >
                  <Sparkles size={14} className="mt-0.5 shrink-0 text-text-3" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-text-1">{skill.name}</div>
                    <div className="mt-0.5 text-xs text-text-3 line-clamp-1">
                      {skill.shortDescription || skill.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Select Trigger Type */}
        {step === 1 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {triggerOptions.map((opt) => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.type}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                    triggerType === opt.type
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-stroke/20 bg-surface-solid hover:bg-surface-hover/[0.06]'
                  )}
                  onClick={() => setTriggerType(opt.type)}
                >
                  <div className={cn(
                    'rounded-lg p-2',
                    triggerType === opt.type ? 'bg-primary/15 text-primary' : 'bg-surface-hover/[0.1] text-text-3'
                  )}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text-1">{opt.label}</div>
                    <div className="mt-0.5 text-xs text-text-3">{opt.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Step 2: Configure Trigger */}
        {step === 2 && (
          <div className="space-y-4">
            {triggerType === 'schedule' && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-text-2">Schedule</label>
                <div className="flex flex-wrap gap-2">
                  {schedulePresets.map((preset) => (
                    <button
                      key={preset.cron}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        scheduleCron === preset.cron
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-stroke/20 text-text-2 hover:bg-surface-hover/[0.06]'
                      )}
                      onClick={() => {
                        setScheduleCron(preset.cron)
                        setScheduleLabel(preset.label)
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-text-3">Cron expression</label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-stroke/20 bg-surface-solid px-3 py-2 font-mono text-sm text-text-1 focus:outline-none focus:border-stroke/50"
                    value={scheduleCron}
                    onChange={(e) => {
                      setScheduleCron(e.target.value)
                      setScheduleLabel('Custom')
                    }}
                  />
                </div>
              </div>
            )}

            {triggerType === 'file_change' && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-text-2">File patterns</label>
                <p className="text-xs text-text-3">
                  Comma-separated glob patterns to watch for changes.
                </p>
                <input
                  type="text"
                  className="w-full rounded-md border border-stroke/20 bg-surface-solid px-3 py-2 text-sm text-text-1 focus:outline-none focus:border-stroke/50"
                  value={filePatterns}
                  onChange={(e) => setFilePatterns(e.target.value)}
                  placeholder="**/*.ts, **/*.tsx"
                />
              </div>
            )}

            {triggerType === 'git_event' && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-text-2">Git events</label>
                <div className="flex flex-wrap gap-2">
                  {gitEventOptions.map((opt) => {
                    const selected = gitEvents.has(opt.event)
                    return (
                      <button
                        key={opt.event}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                          selected
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-stroke/20 text-text-2 hover:bg-surface-hover/[0.06]'
                        )}
                        onClick={() => {
                          const next = new Set(gitEvents)
                          if (selected) next.delete(opt.event)
                          else next.add(opt.event)
                          setGitEvents(next)
                        }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {triggerType === 'manual' && (
              <div className="rounded-lg border border-stroke/20 bg-surface-solid p-4 text-xs text-text-3">
                This automation will only run when triggered manually. You can run it from the Automations panel.
              </div>
            )}
          </div>
        )}

        {/* Step 3: Name & Description */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-2">Name</label>
              <input
                type="text"
                className="w-full rounded-md border border-stroke/20 bg-surface-solid px-3 py-2 text-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:border-stroke/50"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Daily Code Review"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-2">Description</label>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-stroke/20 bg-surface-solid px-3 py-2 text-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:border-stroke/50"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should this automation do?"
              />
            </div>

            {/* Summary card */}
            <div className="rounded-xl border border-stroke/20 bg-surface/50 p-4 text-xs">
              <div className="font-semibold text-text-2">Summary</div>
              <div className="mt-2 space-y-1 text-text-3">
                {selectedSkill && (
                  <div>Skill: <span className="text-text-2">{selectedSkill.name}</span></div>
                )}
                <div>Trigger: <span className="text-text-2">{triggerOptions.find((t) => t.type === triggerType)?.label}</span></div>
                {triggerType === 'schedule' && (
                  <div>Schedule: <span className="text-text-2">{scheduleLabel}</span></div>
                )}
                {triggerType === 'file_change' && (
                  <div>Patterns: <span className="text-text-2">{filePatterns}</span></div>
                )}
                {triggerType === 'git_event' && (
                  <div>Events: <span className="text-text-2">{Array.from(gitEvents).join(', ')}</span></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {step > 0 && !isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                <ChevronLeft size={14} />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                variant="primary"
                size="sm"
                disabled={!canProceed()}
                onClick={() => setStep(step + 1)}
              >
                Next
                <ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={!canProceed()}
                onClick={handleSave}
              >
                {isEditing ? 'Save Changes' : 'Create'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </BaseDialog>
  )
}
