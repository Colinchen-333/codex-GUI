import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../../test/test-utils'
import { ToastProvider } from '../../../ui/Toast'
import { CommandExecutionCard } from '../CommandExecutionCard'
import { copyTextToClipboard } from '../../../../lib/clipboard'
import type { CommandExecutionItem } from '../../../../stores/thread/types'

const threadMocks = vi.hoisted(() => {
  const respondToApproval = vi.fn(async () => {})
  const sendMessage = vi.fn(async () => {})
  const state = {
    activeThread: { id: 't-1' },
    respondToApproval,
    sendMessage,
  }
  return { respondToApproval, sendMessage, state }
})

vi.mock('../../../../lib/clipboard', () => ({
  copyTextToClipboard: vi.fn(async () => true),
}))

type MockThreadState = typeof threadMocks.state

vi.mock('../../../../stores/thread', () => {
  const useThreadStore = ((selector?: (s: MockThreadState) => unknown) => {
    return selector ? selector(threadMocks.state) : threadMocks.state
  }) as unknown as {
    <T>(selector: (s: MockThreadState) => T): T
    (): MockThreadState
    getState: () => MockThreadState
  }
  useThreadStore.getState = () => threadMocks.state

  return {
    useThreadStore,
    selectFocusedThread: () => ({ thread: threadMocks.state.activeThread }),
  }
})

describe('CommandExecutionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires focus for approval hotkeys', async () => {
    const user = userEvent.setup()
    const item: CommandExecutionItem = {
      id: 'cmd-1',
      type: 'commandExecution',
      status: 'pending',
      createdAt: Date.now(),
      content: {
        callId: 'c-1',
        command: 'echo hi',
        cwd: '/tmp',
        needsApproval: true,
      },
    }

    render(
      <ToastProvider>
        <CommandExecutionCard item={item} />
      </ToastProvider>
    )

    await user.keyboard('y')
    expect(threadMocks.respondToApproval).not.toHaveBeenCalled()

    const panel = screen.getByLabelText('Approval options')
    panel.focus()
    await user.keyboard('y')
    expect(threadMocks.respondToApproval).toHaveBeenCalledWith(
      'cmd-1',
      'accept',
      expect.objectContaining({})
    )
  })

  it('copies command', async () => {
    const user = userEvent.setup()
    const item: CommandExecutionItem = {
      id: 'cmd-2',
      type: 'commandExecution',
      status: 'completed',
      createdAt: Date.now(),
      content: {
        callId: 'c-2',
        command: 'ls -la',
        cwd: '/tmp',
      },
    }

    render(
      <ToastProvider>
        <CommandExecutionCard item={item} />
      </ToastProvider>
    )

    await user.click(screen.getByLabelText('Copy command'))
    expect(copyTextToClipboard).toHaveBeenCalledWith('ls -la')
  })
})
