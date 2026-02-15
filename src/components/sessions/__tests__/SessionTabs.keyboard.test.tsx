import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../test/test-utils'
import { ToastProvider } from '../../ui/Toast'
import { SessionTabs } from '../SessionTabs'

const mocks = vi.hoisted(() => {
  const switchThread = vi.fn()
  return { switchThread }
})

vi.mock('../../../stores/thread', () => {
  const state = {
    threads: {
      t1: {
        thread: { id: 't1', cwd: '/Users/colin/Projects/alpha' },
        turnStatus: 'idle',
        pendingApprovals: [],
      },
      t2: {
        thread: { id: 't2', cwd: '/Users/colin/Projects/beta' },
        turnStatus: 'idle',
        pendingApprovals: [],
      },
    },
    focusedThreadId: 't1',
    switchThread: mocks.switchThread,
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
      { sessionId: 't1', title: 'Alpha', status: 'idle', tasksJson: null },
      { sessionId: 't2', title: 'Beta', status: 'idle', tasksJson: null },
    ],
    updateSession: vi.fn(async () => {}),
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

describe('SessionTabs keyboard navigation', () => {
  it('switches to the next session on ArrowRight', async () => {
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

    const alphaTab = screen.getByRole('tab', { name: 'Alpha' })
    alphaTab.focus()
    await user.keyboard('{ArrowRight}')

    expect(mocks.switchThread).toHaveBeenCalledWith('t2')
  })
})

