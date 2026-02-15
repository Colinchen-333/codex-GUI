import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../../test/test-utils'
import { ToastProvider } from '../../../ui/Toast'
import { PlanCard } from '../PlanCard'
import { copyTextToClipboard } from '../../../../lib/clipboard'
import type { PlanItem } from '../../../../stores/thread/types'

vi.mock('../../../../lib/clipboard', () => ({
  copyTextToClipboard: vi.fn(async () => true),
}))

describe('PlanCard', () => {
  it('copies plan text', async () => {
    const user = userEvent.setup()
    const item: PlanItem = {
      id: 'plan-1',
      type: 'plan',
      status: 'completed',
      createdAt: Date.now(),
      content: {
        explanation: 'Do the work in small steps.',
        isActive: true,
        steps: [
          { step: 'First task', status: 'completed' },
          { step: 'Second task', status: 'pending' },
        ],
      },
    }

    render(
      <ToastProvider>
        <PlanCard item={item} />
      </ToastProvider>
    )

    await user.click(screen.getByLabelText('Copy plan'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('Plan (1/2)'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('- [x] 1. First task'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('- [ ] 2. Second task'))
  })
})

