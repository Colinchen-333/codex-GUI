import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../../test/test-utils'
import { ToastProvider } from '../../../ui/Toast'
import { InfoCard } from '../InfoCard'
import { copyTextToClipboard } from '../../../../lib/clipboard'
import type { InfoItem } from '../../../../stores/thread/types'

vi.mock('../../../../lib/clipboard', () => ({
  copyTextToClipboard: vi.fn(async () => true),
}))

describe('InfoCard', () => {
  it('copies title + details', async () => {
    const user = userEvent.setup()
    const item: InfoItem = {
      id: 'info-1',
      type: 'info',
      status: 'completed',
      createdAt: Date.now(),
      content: { title: 'Notice', details: 'Line 1\nLine 2' },
    }

    render(
      <ToastProvider>
        <InfoCard item={item} />
      </ToastProvider>
    )

    await user.click(screen.getByLabelText('Copy info'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('Notice'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('Line 2'))
  })

  it('copies compaction notice', async () => {
    const user = userEvent.setup()
    const item: InfoItem = {
      id: 'compact-1',
      type: 'info',
      status: 'completed',
      createdAt: Date.now(),
      content: { title: 'Context compacted', details: 'Old messages summarized.' },
    }

    render(
      <ToastProvider>
        <InfoCard item={item} />
      </ToastProvider>
    )

    await user.click(screen.getByLabelText('Copy info'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('Context compacted'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('Old messages summarized.'))
  })
})

