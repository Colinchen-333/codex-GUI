import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../../test/test-utils'
import { ToastProvider } from '../../../ui/Toast'
import { ErrorCard } from '../ErrorCard'
import { copyTextToClipboard } from '../../../../lib/clipboard'
import type { ErrorItem } from '../../../../stores/thread/types'

vi.mock('../../../../lib/clipboard', () => ({
  copyTextToClipboard: vi.fn(async () => true),
}))

describe('ErrorCard', () => {
  it('copies error text', async () => {
    const user = userEvent.setup()
    const item: ErrorItem = {
      id: 'err-1',
      type: 'error',
      status: 'failed',
      createdAt: Date.now(),
      content: {
        message: 'Something went wrong',
        errorType: 'network',
        httpStatusCode: 500,
        willRetry: true,
      },
    }

    render(
      <ToastProvider>
        <ErrorCard item={item} />
      </ToastProvider>
    )

    await user.click(screen.getByLabelText('Copy error'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('Will retry...'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('Server error (500)'))
  })
})

