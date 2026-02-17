import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../../test/test-utils'
import { TurnStatusIndicator } from '../TurnStatusIndicator'

const mocks = vi.hoisted(() => {
  const setScrollToItemId = vi.fn()
  return { setScrollToItemId }
})

vi.mock('../../../../stores/app', () => ({
  useAppStore: <T,>(selector: (s: { setScrollToItemId: (itemId: string) => void }) => T): T =>
    selector({ setScrollToItemId: mocks.setScrollToItemId }),
}))

vi.mock('../../../../stores/thread', () => {
  const state = {
    turnStatus: 'running',
    turnTiming: { startedAt: Date.now() - 1000, completedAt: null as number | null },
    pendingApprovals: [
      {
        itemId: 'item-123',
        threadId: 't-1',
        type: 'command' as const,
        data: {} as unknown,
        requestId: 1,
        createdAt: Date.now(),
      },
    ],
    tokenUsage: {
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      modelContextWindow: null as number | null,
    },
  }

  const useThreadStore = (<T,>(selector: (s: typeof state) => T): T => selector(state)) as unknown as {
    <T>(selector: (s: typeof state) => T): T
    getState: () => typeof state
  }
  useThreadStore.getState = () => state

  return { useThreadStore }
})

vi.mock('../../../../stores/thread/selectors', () => ({
  selectTurnStatus: (s: { turnStatus: string }) => s.turnStatus,
  selectTurnTiming: (s: { turnTiming: unknown }) => s.turnTiming,
  selectPendingApprovals: (s: { pendingApprovals: unknown }) => s.pendingApprovals,
  selectTokenUsage: (s: { tokenUsage: unknown }) => s.tokenUsage,
}))

describe('TurnStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests scroll to the first pending approval', async () => {
    const user = userEvent.setup()
    render(<TurnStatusIndicator />)

    await user.click(screen.getByLabelText('Jump to pending approval'))
    expect(mocks.setScrollToItemId).toHaveBeenCalledWith('item-123')
  })
})
