import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useEffect } from 'react'
import { ToastProvider, useToast } from '../Toast'

function ToastTrigger() {
  const { showToast } = useToast()

  useEffect(() => {
    showToast('Test toast', 'success', 'Message')
  }, [showToast])

  return null
}

describe('Toast', () => {
  it('renders toast-root and alert-root with data-state', () => {
    vi.useFakeTimers()

    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    )

    act(() => {
      vi.runOnlyPendingTimers()
    })

    const alert = screen.getByRole('alert')
    const toastRoot = alert.closest('.toast-root')

    expect(alert).toHaveClass('alert-root')
    expect(toastRoot).toBeTruthy()
    expect(toastRoot).toHaveAttribute('data-state')

    vi.useRealTimers()
  })
})
