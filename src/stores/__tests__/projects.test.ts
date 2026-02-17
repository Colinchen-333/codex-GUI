import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProjectsStore } from '../projects'
import type { Project, GitInfo } from '../../lib/api'

// Mock the API module
vi.mock('../../lib/api', () => ({
  projectApi: {
    list: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    update: vi.fn(),
    getGitInfo: vi.fn(),
  },
}))

// Mock the error utils
vi.mock('../../lib/errorUtils', () => ({
  parseError: vi.fn((e: unknown) =>
    e instanceof Error ? e.message : String(e)
  ),
  logError: vi.fn(),
}))

import { projectApi } from '../../lib/api'

const mockedProjectApi = vi.mocked(projectApi)

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    path: '/home/user/project',
    displayName: 'My Project',
    createdAt: 1000,
    lastOpenedAt: null,
    settingsJson: null,
    ...overrides,
  }
}

describe('useProjectsStore', () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    useProjectsStore.setState({
      projects: [],
      selectedProjectId: null,
      gitInfo: {},
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useProjectsStore.getState()
      expect(state.projects).toEqual([])
      expect(state.selectedProjectId).toBeNull()
      expect(state.gitInfo).toEqual({})
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('fetchProjects', () => {
    it('sets isLoading then loads projects', async () => {
      const projects = [makeProject({ id: 'p1' }), makeProject({ id: 'p2' })]
      mockedProjectApi.list.mockResolvedValue(projects)

      await useProjectsStore.getState().fetchProjects()

      const state = useProjectsStore.getState()
      expect(state.projects).toEqual(projects)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('preserves selectedProjectId if project still exists', async () => {
      useProjectsStore.setState({ selectedProjectId: 'p1' })
      mockedProjectApi.list.mockResolvedValue([
        makeProject({ id: 'p1' }),
        makeProject({ id: 'p2' }),
      ])

      await useProjectsStore.getState().fetchProjects()

      expect(useProjectsStore.getState().selectedProjectId).toBe('p1')
    })

    it('clears selectedProjectId if project no longer exists', async () => {
      useProjectsStore.setState({ selectedProjectId: 'deleted-id' })
      mockedProjectApi.list.mockResolvedValue([makeProject({ id: 'p1' })])

      await useProjectsStore.getState().fetchProjects()

      expect(useProjectsStore.getState().selectedProjectId).toBeNull()
    })

    it('sets error on failure', async () => {
      mockedProjectApi.list.mockRejectedValue(new Error('Network error'))

      await useProjectsStore.getState().fetchProjects()

      const state = useProjectsStore.getState()
      expect(state.error).toBe('Network error')
      expect(state.isLoading).toBe(false)
    })
  })

  describe('addProject', () => {
    it('adds project to the beginning of the list', async () => {
      const existing = makeProject({ id: 'old' })
      useProjectsStore.setState({ projects: [existing] })

      const newProject = makeProject({ id: 'new', path: '/new/path' })
      mockedProjectApi.add.mockResolvedValue(newProject)

      const result = await useProjectsStore.getState().addProject('/new/path')

      expect(result).toEqual(newProject)
      const state = useProjectsStore.getState()
      expect(state.projects[0].id).toBe('new')
      expect(state.projects[1].id).toBe('old')
      expect(state.isLoading).toBe(false)
    })

    it('sets error and rethrows on failure', async () => {
      mockedProjectApi.add.mockRejectedValue(new Error('Duplicate'))

      await expect(
        useProjectsStore.getState().addProject('/dup/path')
      ).rejects.toThrow('Duplicate')

      expect(useProjectsStore.getState().error).toBe('Duplicate')
      expect(useProjectsStore.getState().isLoading).toBe(false)
    })
  })

  describe('removeProject', () => {
    it('removes the project from the list', async () => {
      useProjectsStore.setState({
        projects: [makeProject({ id: 'p1' }), makeProject({ id: 'p2' })],
      })
      mockedProjectApi.remove.mockResolvedValue(undefined)

      await useProjectsStore.getState().removeProject('p1')

      const state = useProjectsStore.getState()
      expect(state.projects).toHaveLength(1)
      expect(state.projects[0].id).toBe('p2')
    })

    it('clears selectedProjectId when removing the selected project', async () => {
      useProjectsStore.setState({
        projects: [makeProject({ id: 'p1' })],
        selectedProjectId: 'p1',
      })
      mockedProjectApi.remove.mockResolvedValue(undefined)

      await useProjectsStore.getState().removeProject('p1')

      expect(useProjectsStore.getState().selectedProjectId).toBeNull()
    })

    it('keeps selectedProjectId when removing a different project', async () => {
      useProjectsStore.setState({
        projects: [makeProject({ id: 'p1' }), makeProject({ id: 'p2' })],
        selectedProjectId: 'p1',
      })
      mockedProjectApi.remove.mockResolvedValue(undefined)

      await useProjectsStore.getState().removeProject('p2')

      expect(useProjectsStore.getState().selectedProjectId).toBe('p1')
    })

    it('sets error and rethrows on failure', async () => {
      useProjectsStore.setState({ projects: [makeProject({ id: 'p1' })] })
      mockedProjectApi.remove.mockRejectedValue(new Error('Not found'))

      await expect(
        useProjectsStore.getState().removeProject('p1')
      ).rejects.toThrow('Not found')

      expect(useProjectsStore.getState().error).toBe('Not found')
    })
  })

  describe('updateProject', () => {
    it('replaces the updated project in the list', async () => {
      const original = makeProject({ id: 'p1', displayName: 'Old Name' })
      useProjectsStore.setState({ projects: [original] })

      const updated = makeProject({ id: 'p1', displayName: 'New Name' })
      mockedProjectApi.update.mockResolvedValue(updated)

      await useProjectsStore.getState().updateProject('p1', 'New Name')

      expect(useProjectsStore.getState().projects[0].displayName).toBe('New Name')
    })

    it('sets error and rethrows on failure', async () => {
      useProjectsStore.setState({ projects: [makeProject({ id: 'p1' })] })
      mockedProjectApi.update.mockRejectedValue(new Error('Failed'))

      await expect(
        useProjectsStore.getState().updateProject('p1', 'Name')
      ).rejects.toThrow('Failed')

      expect(useProjectsStore.getState().error).toBe('Failed')
    })
  })

  describe('selectProject', () => {
    it('sets the selectedProjectId', () => {
      useProjectsStore.getState().selectProject('p1')
      expect(useProjectsStore.getState().selectedProjectId).toBe('p1')
    })

    it('clears the selectedProjectId when null', () => {
      useProjectsStore.setState({ selectedProjectId: 'p1' })
      useProjectsStore.getState().selectProject(null)
      expect(useProjectsStore.getState().selectedProjectId).toBeNull()
    })
  })

  describe('fetchGitInfo', () => {
    it('stores git info keyed by projectId', async () => {
      const gitInfo: GitInfo = {
        isGitRepo: true,
        branch: 'main',
        isDirty: false,
        lastCommit: 'abc123',
      }
      mockedProjectApi.getGitInfo.mockResolvedValue(gitInfo)

      await useProjectsStore.getState().fetchGitInfo('p1', '/path')

      expect(useProjectsStore.getState().gitInfo['p1']).toEqual(gitInfo)
    })

    it('does not set error on path validation errors (silent)', async () => {
      mockedProjectApi.getGitInfo.mockRejectedValue(
        new Error('Invalid path: /nonexistent')
      )

      await useProjectsStore.getState().fetchGitInfo('p1', '/nonexistent')

      // Should not set store error for path errors
      expect(useProjectsStore.getState().error).toBeNull()
    })
  })
})
