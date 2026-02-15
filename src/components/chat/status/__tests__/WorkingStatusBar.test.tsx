import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../../test/test-utils'
import { WorkingStatusBar } from '../WorkingStatusBar'

const mocks = vi.hoisted(() => {
  const setScrollToItemId = vi.fn()
  return { setScrollToItemId }
})

vi.mock('../../../../stores/app', () => ({
  useAppStore: <T,>(selector: (s: { escapePending: boolean; setScrollToItemId: (itemId: string) => void }) => T): T =>
    selector({ escapePending: false, setScrollToItemId: mocks.setScrollToItemId }),
}))

vi.mock('../../../../stores/thread', () => {
  type ThreadSnapshot = {
    thread: { id: string }
    turnStatus: string
    turnTiming: { startedAt: number | null; completedAt: number | null }
    pendingApprovals: Array<{
      itemId: string
      threadId: string
      type: 'command' | 'fileChange'
      data: unknown
      requestId: number
      createdAt: number
    }>
    items: Record<string, unknown>
    itemOrder: string[]
    tokenUsage: {
      inputTokens: number
      cachedInputTokens: number
      outputTokens: number
      totalTokens: number
      modelContextWindow: number | null
    }
  }

  const threads: Record<string, ThreadSnapshot> = {
    't-1': {
      thread: { id: 't-1' },
      turnStatus: 'running',
      turnTiming: { startedAt: Date.now() - 1000, completedAt: null },
      pendingApprovals: [
        {
          itemId: 'item-123',
          threadId: 't-1',
          type: 'command',
          data: {} as unknown,
          requestId: 1,
          createdAt: Date.now(),
        },
      ],
      items: {},
      itemOrder: [],
      tokenUsage: {
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        modelContextWindow: null,
      },
    },
  }

  const state = {
    threads,
    focusedThreadId: 't-1',
  }

  const useThreadStore = (<T,>(selector: (s: unknown) => T): T => selector(state)) as unknown as {
    <T>(selector: (s: unknown) => T): T
    getState: () => typeof state
  }
  useThreadStore.getState = () => state

  const selectFocusedThread = (s: typeof state) => s.threads[s.focusedThreadId] ?? null

  return { useThreadStore, selectFocusedThread }
})

describe('WorkingStatusBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests scroll to the first pending approval', async () => {
    const user = userEvent.setup()
    render(<WorkingStatusBar />)

    await user.click(screen.getByLabelText('Jump to pending approval'))
    expect(mocks.setScrollToItemId).toHaveBeenCalledWith('item-123')
  })
})
