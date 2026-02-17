import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '../Sidebar'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

// Mock external dependencies
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockSelectProject = vi.fn()
const mockAddProject = vi.fn().mockResolvedValue({ id: 'new-proj', path: '/new' })

vi.mock('../../../stores/projects', () => ({
  useProjectsStore: vi.fn((selector) => {
    const state = {
      projects: [
        { id: 'proj-1', path: '/test/project', displayName: 'Test Project', settingsJson: null },
      ],
      selectedProjectId: 'proj-1',
      addProject: mockAddProject,
      selectProject: mockSelectProject,
      gitInfo: {},
      fetchGitInfo: vi.fn(),
    }
    return typeof selector === 'function' ? selector(state) : state
  }),
}))

const mockSelectSession = vi.fn()
const mockFetchSessions = vi.fn().mockResolvedValue([])

vi.mock('../../../stores/sessions', () => ({
  useSessionsStore: vi.fn((selector) => {
    const state = {
      sessions: [
        {
          sessionId: 'session-1',
          title: 'Test Session',
          status: 'idle',
          createdAt: '2025-02-01T00:00:00Z',
          lastAccessedAt: '2025-02-01T00:00:00Z',
          isArchived: false,
          isFavorite: false,
        },
      ],
      selectedSessionId: null,
      isLoading: false,
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      selectSession: mockSelectSession,
      fetchSessions: mockFetchSessions,
    }
    return typeof selector === 'function' ? selector(state) : state
  }),
}))

vi.mock('../../../stores/app', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      sidebarTab: 'sessions',
      setSidebarTab: vi.fn(),
      toggleSidebarCollapsed: vi.fn(),
    }
    return typeof selector === 'function' ? selector(state) : state
  }),
}))

vi.mock('../../../stores/thread', () => ({
  useThreadStore: Object.assign(
    vi.fn((selector) => {
      const state = {
        closeAllThreads: vi.fn(),
        startThread: vi.fn().mockResolvedValue(undefined),
      }
      return typeof selector === 'function' ? selector(state) : state
    }),
    {
      getState: () => ({
        threads: {},
        focusedThreadId: null,
        resumeThread: vi.fn(),
      }),
    }
  ),
  selectFocusedThread: () => null,
}))

vi.mock('../../../stores/automations', () => ({
  useAutomationsStore: vi.fn((selector) => {
    const state = {
      inboxItems: [],
    }
    return typeof selector === 'function' ? selector(state) : state
  }),
}))

vi.mock('../../../stores/settings', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      settings: { model: 'gpt-5.2-codex', sandboxMode: 'none', approvalPolicy: 'on-request' },
    }
    return typeof selector === 'function' ? selector(state) : state
  }),
  mergeProjectSettings: vi.fn((settings) => settings),
  getEffectiveWorkingDirectory: vi.fn((path) => path),
}))

vi.mock('../../ui/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}))

vi.mock('../../ui/IconButton', () => ({
  IconButton: ({ children, onClick, ...props }: React.PropsWithChildren<{ onClick?: () => void }>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}))

vi.mock('../../ui/Dropdown', () => ({
  Dropdown: {
    Root: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    Trigger: ({ children, ...props }: React.PropsWithChildren) => <button {...props}>{children}</button>,
    Content: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    Label: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    Item: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) => (
      <button onClick={onClick}>{children}</button>
    ),
    Separator: () => <hr />,
  },
}))

vi.mock('../sidebar/index', () => ({
  SessionSearch: () => <div data-testid="session-search">Search</div>,
  GroupedSessionList: ({ sessions }: { sessions: unknown[] }) => (
    <div data-testid="session-list">Sessions: {sessions.length}</div>
  ),
  SidebarDialogs: () => null,
  useSidebarDialogs: () => ({
    renameDialogOpen: false,
    projectToRename: null,
    handleConfirmRename: vi.fn(),
    cancelRenameProject: vi.fn(),
    sessionRenameDialogOpen: false,
    sessionToRename: null,
    handleConfirmSessionRename: vi.fn(),
    cancelRenameSession: vi.fn(),
    projectSettingsOpen: false,
    projectSettingsId: null,
    handleOpenProjectSettings: vi.fn(),
    closeProjectSettings: vi.fn(),
    deleteProjectConfirm: null,
    confirmDeleteProject: vi.fn(),
    cancelDeleteProject: vi.fn(),
    deleteSessionConfirm: null,
    confirmDeleteSession: vi.fn(),
    cancelDeleteSession: vi.fn(),
  }),
}))

vi.mock('../sidebar/SwarmToggle', () => ({
  SwarmToggle: () => null,
}))

vi.mock('../../LazyComponents', () => ({
  ImportCodexSessionDialog: () => null,
}))

vi.mock('../../../lib/logger', () => ({
  log: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('../../../lib/appEvents', () => ({
  APP_EVENTS: {
    OPEN_IMPORT_CODEX_SESSIONS: 'open-import-codex-sessions',
    OPEN_PROJECT_SETTINGS: 'open-project-settings',
  },
}))

vi.mock('../../../lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatSessionTime: () => 'Feb 1',
}))

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the sidebar element', () => {
      renderSidebar()
      expect(screen.getByRole('complementary')).toBeInTheDocument()
    })

    it('renders the Workspace heading', () => {
      renderSidebar()
      expect(screen.getByText('Workspace')).toBeInTheDocument()
    })

    it('renders New session button', () => {
      renderSidebar()
      expect(screen.getByText('New session')).toBeInTheDocument()
    })

    it('renders Automations navigation', () => {
      renderSidebar()
      expect(screen.getByText('Automations')).toBeInTheDocument()
    })

    it('renders Inbox navigation', () => {
      renderSidebar()
      expect(screen.getByText('Inbox')).toBeInTheDocument()
    })

    it('renders Skills navigation', () => {
      renderSidebar()
      expect(screen.getByText('Skills')).toBeInTheDocument()
    })

    it('renders Settings at the bottom', () => {
      renderSidebar()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('renders Sessions heading', () => {
      renderSidebar()
      expect(screen.getByText('Sessions')).toBeInTheDocument()
    })

    it('renders session search', () => {
      renderSidebar()
      expect(screen.getByTestId('session-search')).toBeInTheDocument()
    })

    it('renders session list', () => {
      renderSidebar()
      expect(screen.getByTestId('session-list')).toBeInTheDocument()
    })

    it('renders collapse sidebar button', () => {
      renderSidebar()
      expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument()
    })

    it('renders traffic light dots', () => {
      const { container } = renderSidebar()
      expect(container.querySelector('.rounded-full.bg-\\[\\#ff5f57\\]')).toBeInTheDocument()
      expect(container.querySelector('.rounded-full.bg-\\[\\#febc2e\\]')).toBeInTheDocument()
      expect(container.querySelector('.rounded-full.bg-\\[\\#28c840\\]')).toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('navigates to automations on click', () => {
      renderSidebar()
      fireEvent.click(screen.getByText('Automations'))
      expect(mockNavigate).toHaveBeenCalledWith('/inbox?automationMode=create')
    })

    it('navigates to inbox on click', () => {
      renderSidebar()
      fireEvent.click(screen.getByText('Inbox'))
      expect(mockNavigate).toHaveBeenCalledWith('/inbox')
    })

    it('navigates to skills on click', () => {
      renderSidebar()
      fireEvent.click(screen.getByText('Skills'))
      expect(mockNavigate).toHaveBeenCalledWith('/skills')
    })

    it('navigates to settings on click', () => {
      renderSidebar()
      fireEvent.click(screen.getByText('Settings'))
      expect(mockNavigate).toHaveBeenCalledWith('/settings')
    })
  })

  describe('new session', () => {
    it('clicking New session triggers session creation flow', async () => {
      renderSidebar()
      fireEvent.click(screen.getByText('New session'))
      // Should attempt to select null session and start a thread
      // (async flow; we just verify no crash)
    })
  })

  describe('add project', () => {
    it('renders add project folder button', () => {
      renderSidebar()
      expect(screen.getByLabelText('Add project folder')).toBeInTheDocument()
    })
  })

  describe('filter dropdown', () => {
    it('renders filter sessions button', () => {
      renderSidebar()
      expect(screen.getByLabelText('Filter sessions')).toBeInTheDocument()
    })

    it('renders filter options', () => {
      renderSidebar()
      expect(screen.getByText('Pinned only')).toBeInTheDocument()
      expect(screen.getByText('Running only')).toBeInTheDocument()
      expect(screen.getByText('Show archived')).toBeInTheDocument()
      expect(screen.getByText('Clear filters')).toBeInTheDocument()
    })
  })

  describe('session fetching', () => {
    it('fetches sessions when project is selected', () => {
      renderSidebar()
      expect(mockFetchSessions).toHaveBeenCalledWith('proj-1')
    })
  })
})
