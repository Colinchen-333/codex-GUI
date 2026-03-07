import { useEffect, useRef, useState, useCallback } from 'react'
import { Wrench, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { serverApi } from '../../lib/api'
import { usePopupNavigation } from '../../hooks/usePopupNavigation'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export interface SkillEntry {
  name: string
  path: string
  description?: string
}

interface SkillMentionPopupProps {
  query: string
  projectCwds: string[]
  projectId?: string
  onSelect: (skill: SkillEntry) => void
  onClose: () => void
  isVisible: boolean
}

export function SkillMentionPopup({
  query,
  projectCwds,
  projectId,
  onSelect,
  onClose,
  isVisible,
}: SkillMentionPopupProps) {
  const [skills, setSkills] = useState<SkillEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const { selectedIndex, setSelectedIndex } = usePopupNavigation({
    items: skills,
    onSelect,
    onClose,
    isVisible,
  })

  const fetchSkills = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await serverApi.listSkills(projectCwds, false, projectId)
      const mapped: SkillEntry[] = (result as Array<{ name: string; path: string; description?: string }>).map((s) => ({
        name: s.name,
        path: s.path,
        description: s.description,
      }))
      setSkills(mapped)
    } catch {
      setSkills([])
    } finally {
      setIsLoading(false)
    }
  }, [projectCwds, projectId])

  useEffect(() => {
    if (isVisible) {
      void fetchSkills()
    }
  }, [isVisible, fetchSkills])

  const filtered = query
    ? skills.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        (s.description?.toLowerCase().includes(query.toLowerCase()) ?? false)
      )
    : skills

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, setSelectedIndex])

  if (!isVisible) return null

  return (
    <div
      ref={listRef}
      className={cn(
        'absolute bottom-full left-0 mb-1 w-72 max-h-48 overflow-y-auto',
        'rounded-xl border border-stroke/20 bg-surface-solid shadow-xl',
        'z-popover',
        !prefersReducedMotion && 'animate-in fade-in slide-in-from-bottom'
      )}
      role="listbox"
      aria-label="Skill suggestions"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-text-3" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-3 py-3 text-xs text-text-3 text-center">
          {query ? 'No matching skills' : 'No skills available'}
        </div>
      ) : (
        filtered.map((skill, index) => (
          <button
            key={skill.name}
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            className={cn(
              'flex items-start gap-2.5 w-full px-3 py-2 text-left text-sm',
              'transition-colors duration-fast cursor-pointer',
              index === selectedIndex
                ? 'bg-surface-hover/[0.08] text-text-1'
                : 'text-text-2 hover:bg-surface-hover/[0.04]'
            )}
            onClick={() => onSelect(skill)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <Wrench size={14} className="text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-medium text-text-1 truncate">{skill.name}</div>
              {skill.description && (
                <div className="text-xs text-text-3 truncate mt-0.5">{skill.description}</div>
              )}
            </div>
          </button>
        ))
      )}
    </div>
  )
}
