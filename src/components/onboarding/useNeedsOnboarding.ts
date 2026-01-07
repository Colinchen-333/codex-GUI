import { useMemo } from 'react'
import { useProjectsStore } from '../../stores/projects'

const ONBOARDING_KEY = 'codex-desktop-onboarded'

export function useNeedsOnboarding(): boolean {
  const projects = useProjectsStore((state) => state.projects)

  return useMemo(() => {
    // Check if user has completed onboarding
    const hasOnboarded = localStorage.getItem(ONBOARDING_KEY) === 'true'

    // User needs onboarding if they haven't completed it yet
    // and don't have any projects (new user)
    return !hasOnboarded && projects.length === 0
  }, [projects.length])
}
