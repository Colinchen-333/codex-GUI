import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../../test/test-utils'
import { ToastProvider } from '../../../ui/Toast'
import { ReasoningCard } from '../ReasoningCard'
import { copyTextToClipboard } from '../../../../lib/clipboard'
import type { ReasoningItem } from '../../../../stores/thread/types'

vi.mock('../../../../lib/clipboard', () => ({
  copyTextToClipboard: vi.fn(async () => true),
}))

describe('ReasoningCard', () => {
  it('copies summary by default', async () => {
    const user = userEvent.setup()
    const item: ReasoningItem = {
      id: 'r-1',
      type: 'reasoning',
      status: 'completed',
      createdAt: Date.now(),
      content: { summary: ['Step 1', 'Step 2'], isStreaming: false },
    }

    render(
      <ToastProvider>
        <ReasoningCard item={item} />
      </ToastProvider>
    )

    await user.click(screen.getByLabelText('Copy reasoning'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('- Step 1'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('- Step 2'))
  })

  it('copies full thinking when selected', async () => {
    const user = userEvent.setup()
    const item: ReasoningItem = {
      id: 'r-2',
      type: 'reasoning',
      status: 'completed',
      createdAt: Date.now(),
      content: {
        summary: ['Short'],
        fullContent: ['Long A', 'Long B'],
        isStreaming: false,
      },
    }

    render(
      <ToastProvider>
        <ReasoningCard item={item} />
      </ToastProvider>
    )

    await user.click(screen.getByText('Reasoning'))
    await user.click(screen.getByText('Full Thinking'))
    await user.click(screen.getByLabelText('Copy reasoning'))
    expect(copyTextToClipboard).toHaveBeenCalledWith('Long A\nLong B')
  })
})

