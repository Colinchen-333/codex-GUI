import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../../test/test-utils'
import { GlobalApprovalsIndicator } from '../GlobalApprovalsIndicator'

const mocks = vi.hoisted(() => {
  const switchThread = vi.fn()
  const setScrollToItemId = vi.fn()
  return { switchThread, setScrollToItemId }
})

vi.mock('../../../../stores/app', () => {
  const useAppStore = (<T,>(selector: (s: { setScrollToItemId: (id: string) => void }) => T): T =>
    selector({ setScrollToItemId: mocks.setScrollToItemId })) as unknown as {
    <T>(selector: (s: { setScrollToItemId: (id: string) => void }) => T): T
    getState: () => { setScrollToItemId: (id: string) => void }
  }
  useAppStore.getState = () => ({ setScrollToItemId: mocks.setScrollToItemId })
  return { useAppStore }
})

vi.mock('../../../../stores/thread', () => {
  const state = {
    threads: {
      t1: {
        thread: { id: 't1' },
        pendingApprovals: [
          {
            itemId: 'item-a',
            threadId: 't1',
            type: 'command' as const,
            data: {} as unknown,
            requestId: 1,
            createdAt: 100,
          },
        ],
      },
      t2: {
        thread: { id: 't2' },
        pendingApprovals: [
          {
            itemId: 'item-b',
            threadId: 't2',
            type: 'fileChange' as const,
            data: {} as unknown,
            requestId: 2,
            createdAt: 50,
          },
        ],
      },
    },
    switchThread: mocks.switchThread,
  }

  const useThreadStore = (<T,>(selector: (s: unknown) => T): T => selector(state)) as unknown as {
    <T>(selector: (s: unknown) => T): T
    getState: () => typeof state
  }
  useThreadStore.getState = () => state

  return { useThreadStore }
})

describe('GlobalApprovalsIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('jumps to the earliest pending approval across threads', async () => {
    const user = userEvent.setup()
    render(<GlobalApprovalsIndicator />)

    await user.click(screen.getByLabelText('Jump to next approval'))
    expect(mocks.switchThread).toHaveBeenCalledWith('t2')
    expect(mocks.setScrollToItemId).toHaveBeenCalledWith('item-b')
  })
})

