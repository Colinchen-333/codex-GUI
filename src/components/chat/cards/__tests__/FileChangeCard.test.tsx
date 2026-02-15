import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../../test/test-utils'
import { ToastProvider } from '../../../ui/Toast'
import { FileChangeCard } from '../FileChangeCard'
import { useFileChangeApproval } from '../../../../hooks/useFileChangeApproval'
import { copyTextToClipboard } from '../../../../lib/clipboard'
import type { FileChangeItem } from '../../../../stores/thread/types'
import type { UseFileChangeApprovalReturn } from '../../../../hooks/useFileChangeApproval'

vi.mock('../../../../hooks/useFileChangeApproval', () => ({
  useFileChangeApproval: vi.fn(),
}))

vi.mock('../../../../lib/clipboard', () => ({
  copyTextToClipboard: vi.fn(async () => true),
}))

function renderCard() {
  const item: FileChangeItem = {
    id: 'item-1',
    type: 'fileChange',
    status: 'pending',
    createdAt: Date.now(),
    content: {
      needsApproval: true,
      reason: 'Test reason',
      changes: [
        {
          path: 'src/foo.ts',
          kind: 'modify',
          diff: [
            'diff --git a/src/foo.ts b/src/foo.ts',
            'index 0000000..1111111 100644',
            '--- a/src/foo.ts',
            '+++ b/src/foo.ts',
            '@@ -1 +1 @@',
            '-old',
            '+new',
          ].join('\n'),
        },
      ],
    },
  }

  return render(
    <ToastProvider>
      <FileChangeCard item={item} />
    </ToastProvider>
  )
}

describe('FileChangeCard', () => {
  const handleApplyChanges = vi.fn(async () => {})
  const handleDecline = vi.fn(async () => {})
  const handleRevert = vi.fn(async () => {})

  beforeEach(() => {
    vi.clearAllMocks()
    const mocked: UseFileChangeApprovalReturn = {
      isApplying: false,
      isReverting: false,
      isDeclining: false,
      handleApplyChanges,
      handleRevert,
      handleDecline,
      handleManualRollback: vi.fn(),
    }
    vi.mocked(useFileChangeApproval).mockReturnValue(mocked)
  })

  it('requires focus for approval hotkeys', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.keyboard('y')
    expect(handleApplyChanges).not.toHaveBeenCalled()

    const approvalPanel = screen.getByLabelText('File change approval options')
    approvalPanel.focus()
    await user.keyboard('y')
    expect(handleApplyChanges).toHaveBeenCalledWith('accept')
  })

  it('supports y/a/n hotkeys when focused', async () => {
    const user = userEvent.setup()
    renderCard()

    const approvalPanel = screen.getByLabelText('File change approval options')
    approvalPanel.focus()

    await user.keyboard('a')
    expect(handleApplyChanges).toHaveBeenCalledWith('acceptForSession')

    await user.keyboard('n')
    expect(handleDecline).toHaveBeenCalled()
  })

  it('copies summary and patch', async () => {
    const user = userEvent.setup()
    renderCard()

    await user.click(screen.getByLabelText('Copy summary'))
    expect(copyTextToClipboard).toHaveBeenCalledWith('MODIFY src/foo.ts')

    await user.click(screen.getByLabelText('Copy patch'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(
      expect.stringContaining('diff --git a/src/foo.ts b/src/foo.ts')
    )
  })
})
