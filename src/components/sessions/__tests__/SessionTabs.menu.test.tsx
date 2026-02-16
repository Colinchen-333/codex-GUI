import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../test/test-utils'
import { ToastProvider } from '../../ui/Toast'
import { SessionTabs } from '../SessionTabs'

const mocks = vi.hoisted(() => {
  return {
    updateSession: vi.fn(async () => {}),
  }
})

vi.mock('../../../stores/thread', () => {
  const state = {
    threads: {
      t1: {
        thread: { id: 't1', cwd: '/Users/colin/Projects/demo' },
        turnStatus: 'idle',
        pendingApprovals: [],
      },
    },
    focusedThreadId: 't1',
    switchThread: vi.fn(),
    canAddSession: () => false,
    maxSessions: 3,
    isLoading: false,
    interrupt: vi.fn(),
  }

  const useThreadStore = (<T,>(selector: (s: unknown) => T): T => selector(state)) as unknown as {
    <T>(selector: (s: unknown) => T): T
    getState: () => typeof state
  }
  useThreadStore.getState = () => state

  return { useThreadStore }
})

vi.mock('../../../stores/sessions', () => {
  const state = {
    sessions: [
      { sessionId: 't1', title: 'My Session', status: 'idle', tasksJson: null },
    ],
    updateSession: mocks.updateSession,
  }
  const useSessionsStore = (<T,>(selector: (s: unknown) => T): T => selector(state)) as unknown as {
    <T>(selector: (s: unknown) => T): T
    getState: () => typeof state
  }
  useSessionsStore.getState = () => state
  return { useSessionsStore }
})

vi.mock('../../../stores/projects', () => {
  const state = { projects: [] }
  const useProjectsStore = (<T,>(selector: (s: unknown) => T): T => selector(state)) as unknown as {
    <T>(selector: (s: unknown) => T): T
    getState: () => typeof state
  }
  useProjectsStore.getState = () => state
  return { useProjectsStore }
})

describe('SessionTabs session menu', () => {
  it('opens ExportDialog from the session menu', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <SessionTabs
          onToggleRightPanel={() => {}}
          onOpenCommitDialog={() => {}}
          onToggleTerminal={() => {}}
        />
      </ToastProvider>
    )

    await user.click(screen.getByLabelText('Session menu'))
    await user.click(screen.getByRole('menuitem', { name: 'Export session' }))

    expect(await screen.findByText('Export Session')).toBeInTheDocument()
  })
})

