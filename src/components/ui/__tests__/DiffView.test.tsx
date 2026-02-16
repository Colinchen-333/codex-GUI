import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { render } from '../../../test/test-utils'
import { DiffView, type FileDiff } from '../DiffView'

describe('DiffView', () => {
  it('toggles collapse via keyboard on the header', async () => {
    const user = userEvent.setup()
    const onToggleCollapse = vi.fn()
    const diff: FileDiff = {
      path: 'src/foo.ts',
      kind: 'modify',
      oldPath: undefined,
      hunks: [],
      raw: '',
    }

    render(<DiffView diff={diff} collapsed onToggleCollapse={onToggleCollapse} />)

    const header = screen.getByLabelText('Toggle diff: src/foo.ts')
    header.focus()
    await user.keyboard('{Enter}')
    expect(onToggleCollapse).toHaveBeenCalledTimes(1)
  })
})

