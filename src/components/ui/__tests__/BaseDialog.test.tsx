import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BaseDialog } from '../BaseDialog'

describe('BaseDialog', () => {
  it('renders dialog container with codex classes', () => {
    const { container } = render(
      <BaseDialog isOpen={true} onClose={() => {}} title="Test Dialog">
        <div>Content</div>
      </BaseDialog>
    )

    const overlay = container.querySelector('.codex-dialog-overlay')
    const dialog = container.querySelector('.codex-dialog')

    expect(overlay).toBeTruthy()
    expect(dialog).toBeTruthy()
  })
})
