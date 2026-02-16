import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../test/test-utils'
import { PendingApprovalDotButton } from '../PendingApprovalDotButton'

describe('PendingApprovalDotButton', () => {
  it('calls onJump when clicked', async () => {
    const user = userEvent.setup()
    const onJump = vi.fn()

    render(<PendingApprovalDotButton count={2} onJump={onJump} />)
    await user.click(screen.getByLabelText('Jump to pending approval (2)'))
    expect(onJump).toHaveBeenCalledTimes(1)
  })
})

