import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../../test/test-utils'
import { ToastProvider } from '../../../ui/Toast'
import { ReviewCard } from '../ReviewCard'
import { copyTextToClipboard } from '../../../../lib/clipboard'
import type { ReviewItem } from '../../../../stores/thread/types'

vi.mock('../../../../lib/clipboard', () => ({
  copyTextToClipboard: vi.fn(async () => true),
}))

describe('ReviewCard', () => {
  it('copies review markdown', async () => {
    const user = userEvent.setup()
    const item: ReviewItem = {
      id: 'rev-1',
      type: 'review',
      status: 'completed',
      createdAt: Date.now(),
      content: { phase: 'completed', text: '# Review\n\nLooks good.' },
    }

    render(
      <ToastProvider>
        <ReviewCard item={item} />
      </ToastProvider>
    )

    await user.click(screen.getByLabelText('Copy review'))
    expect(copyTextToClipboard).toHaveBeenCalledWith('# Review\n\nLooks good.')
  })
})
