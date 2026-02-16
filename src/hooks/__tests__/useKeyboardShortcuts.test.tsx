import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { useKeyboardShortcuts, type KeyboardShortcut } from '../useKeyboardShortcuts'

function ShortcutsHarness({ shortcuts }: { shortcuts: KeyboardShortcut[] }) {
  useKeyboardShortcuts(shortcuts)
  return null
}

describe('useKeyboardShortcuts', () => {
  afterEach(() => {
    // Ensure listeners are removed between tests via unmount.
    vi.restoreAllMocks()
  })

  it('matches Shift+? when shortcut.shift is true', () => {
    const handler = vi.fn()
    const shortcuts: KeyboardShortcut[] = [
      { key: '?', shift: true, description: 'Help', handler },
    ]

    const { unmount } = render(<ShortcutsHarness shortcuts={shortcuts} />)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true }))
    expect(handler).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('does not match ? without Shift when shortcut.shift is true', () => {
    const handler = vi.fn()
    const shortcuts: KeyboardShortcut[] = [
      { key: '?', shift: true, description: 'Help', handler },
    ]

    const { unmount } = render(<ShortcutsHarness shortcuts={shortcuts} />)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: false }))
    expect(handler).not.toHaveBeenCalled()
    unmount()
  })
})

