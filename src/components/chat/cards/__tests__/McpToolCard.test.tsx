import { describe, it, expect } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../../test/test-utils'
import { ToastProvider } from '../../../ui/Toast'
import { McpToolCard } from '../McpToolCard'
import type { McpToolItem } from '../../../../stores/thread/types'

describe('McpToolCard', () => {
  it('toggles via keyboard on the header', async () => {
    const user = userEvent.setup()
    const item: McpToolItem = {
      id: 'mcp-1',
      type: 'mcpTool',
      status: 'completed',
      createdAt: Date.now(),
      content: {
        callId: 'call-1',
        server: 'test-server',
        tool: 'test-tool',
        arguments: { q: 1 },
        result: 'ok',
        isRunning: false,
      },
    }

    render(
      <ToastProvider>
        <McpToolCard item={item} />
      </ToastProvider>
    )

    expect(screen.queryByText('Arguments')).not.toBeInTheDocument()
    const header = screen.getByLabelText('Toggle tool details: test-server/test-tool')
    header.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Arguments')).toBeInTheDocument()
  })
})

