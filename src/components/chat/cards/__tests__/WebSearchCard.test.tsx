import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../../test/test-utils'
import { ToastProvider } from '../../../ui/Toast'
import { WebSearchCard } from '../WebSearchCard'
import { copyTextToClipboard } from '../../../../lib/clipboard'
import type { WebSearchItem } from '../../../../stores/thread/types'

vi.mock('../../../../lib/clipboard', () => ({
  copyTextToClipboard: vi.fn(async () => true),
}))

describe('WebSearchCard', () => {
  it('copies query + results', async () => {
    const user = userEvent.setup()
    const item: WebSearchItem = {
      id: 'ws-1',
      type: 'webSearch',
      status: 'completed',
      createdAt: Date.now(),
      content: {
        query: 'what is codex',
        isSearching: false,
        results: [
          { title: 'Result A', url: 'https://example.com/a', snippet: 'Snippet A' },
          { title: 'Result B', url: 'https://example.com/b', snippet: 'Snippet B' },
        ],
      },
    }

    render(
      <ToastProvider>
        <WebSearchCard item={item} />
      </ToastProvider>
    )

    await user.click(screen.getByLabelText('Copy web search'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('Query: what is codex'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('1. Result A'))
    expect(copyTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('https://example.com/b'))
  })
})

