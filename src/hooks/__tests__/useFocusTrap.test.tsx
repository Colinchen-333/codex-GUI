import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, renderHook } from '@testing-library/react'
import { useState, useRef } from 'react'
import { useFocusTrap, type InitialFocusTarget } from '../useFocusTrap'

interface TestComponentProps {
  initiallyActive?: boolean
  onEscape?: () => void
  initialFocus?: InitialFocusTarget
  restoreFocus?: boolean
  autoFocus?: boolean
}

function TestComponent({
  initiallyActive = false,
  onEscape,
  initialFocus,
  restoreFocus,
  autoFocus,
}: TestComponentProps) {
  const [isActive, setIsActive] = useState(initiallyActive)
  const containerRef = useFocusTrap<HTMLDivElement>({
    isActive,
    onEscape,
    initialFocus,
    restoreFocus,
    autoFocus,
  })

  return (
    <div>
      <button data-testid="toggle" onClick={() => setIsActive(!isActive)}>
        Toggle
      </button>
      <button data-testid="outside">Outside</button>
      <div ref={containerRef} data-testid="container" tabIndex={-1}>
        <button data-testid="btn1">First</button>
        <input data-testid="input1" type="text" />
        <button data-testid="btn2">Second</button>
        <a href="#" data-testid="link1">Link</a>
        <button data-testid="btn3" disabled>Disabled</button>
      </div>
    </div>
  )
}

function createKeyboardEvent(key: string, shiftKey = false): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true,
  })
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('hook return value', () => {
    it('should return a ref object', () => {
      const { result } = renderHook(() =>
        useFocusTrap({ isActive: false })
      )

      expect(result.current).toBeDefined()
      expect(result.current.current).toBeNull()
    })
  })

  describe('escape key handling', () => {
    it('should call onEscape when Escape is pressed', () => {
      const onEscape = vi.fn()
      render(<TestComponent initiallyActive={true} onEscape={onEscape} />)

      act(() => {
        vi.runAllTimers()
      })

      const event = createKeyboardEvent('Escape')
      document.dispatchEvent(event)

      expect(onEscape).toHaveBeenCalledTimes(1)
    })

    it('should not call onEscape when trap is inactive', () => {
      const onEscape = vi.fn()
      render(<TestComponent initiallyActive={false} onEscape={onEscape} />)

      const event = createKeyboardEvent('Escape')
      document.dispatchEvent(event)

      expect(onEscape).not.toHaveBeenCalled()
    })

    it('should prevent default and stop propagation on Escape', () => {
      const onEscape = vi.fn()
      render(<TestComponent initiallyActive={true} onEscape={onEscape} />)

      act(() => {
        vi.runAllTimers()
      })

      const event = createKeyboardEvent('Escape')
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation')

      document.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(stopPropagationSpy).toHaveBeenCalled()
    })
  })

  describe('initialFocus="container"', () => {
    it('should focus container when initialFocus="container"', () => {
      render(<TestComponent initiallyActive={false} initialFocus="container" />)

      act(() => {
        screen.getByTestId('toggle').click()
      })

      act(() => {
        vi.runAllTimers()
      })

      expect(document.activeElement).toBe(screen.getByTestId('container'))
    })

    it('should set tabIndex on container if not set', () => {
      function ContainerWithoutTabIndex() {
        const [isActive, setIsActive] = useState(false)
        const ref = useFocusTrap<HTMLDivElement>({
          isActive,
          initialFocus: 'container',
        })

        return (
          <div>
            <button onClick={() => setIsActive(true)}>Activate</button>
            <div ref={ref} data-testid="container">Content</div>
          </div>
        )
      }

      render(<ContainerWithoutTabIndex />)
      const container = screen.getByTestId('container')
      expect(container.tabIndex).toBe(-1)

      act(() => {
        screen.getByRole('button', { name: 'Activate' }).click()
      })

      act(() => {
        vi.runAllTimers()
      })

      expect(container.tabIndex).toBe(-1)
    })
  })

  describe('autoFocus option', () => {
    it('should not auto-focus when autoFocus is false', () => {
      render(<TestComponent initiallyActive={false} autoFocus={false} />)

      const toggle = screen.getByTestId('toggle')
      toggle.focus()
      const originalFocus = document.activeElement

      act(() => {
        toggle.click()
      })

      act(() => {
        vi.runAllTimers()
      })

      expect(document.activeElement).toBe(originalFocus)
    })
  })

  describe('keyboard event cleanup', () => {
    it('should remove keyboard listener when deactivated', () => {
      const onEscape = vi.fn()
      render(<TestComponent initiallyActive={false} onEscape={onEscape} />)

      const toggle = screen.getByTestId('toggle')

      act(() => {
        toggle.click()
      })

      act(() => {
        vi.runAllTimers()
      })

      const event1 = createKeyboardEvent('Escape')
      document.dispatchEvent(event1)
      expect(onEscape).toHaveBeenCalledTimes(1)

      act(() => {
        toggle.click()
      })

      const event2 = createKeyboardEvent('Escape')
      document.dispatchEvent(event2)
      expect(onEscape).toHaveBeenCalledTimes(1)
    })
  })

  describe('initialFocusRef (deprecated)', () => {
    it('should focus element from initialFocusRef when provided', () => {
      function ComponentWithInitialFocusRef() {
        const [isActive, setIsActive] = useState(false)
        const inputRef = useRef<HTMLInputElement>(null)
        const containerRef = useFocusTrap<HTMLDivElement>({
          isActive,
          initialFocusRef: inputRef,
        })

        return (
          <div>
            <button data-testid="activate" onClick={() => setIsActive(true)}>
              Activate
            </button>
            <div ref={containerRef} data-testid="container" tabIndex={-1}>
              <button>First</button>
              <input ref={inputRef} data-testid="target-input" />
              <button>Last</button>
            </div>
          </div>
        )
      }

      render(<ComponentWithInitialFocusRef />)

      act(() => {
        screen.getByTestId('activate').click()
      })

      act(() => {
        vi.runAllTimers()
      })

      expect(document.activeElement).toBe(screen.getByTestId('target-input'))
    })
  })

  describe('initialFocus with RefObject', () => {
    it('should focus element from RefObject initialFocus', () => {
      function ComponentWithRefFocus() {
        const [isActive, setIsActive] = useState(false)
        const buttonRef = useRef<HTMLButtonElement>(null)
        const containerRef = useFocusTrap<HTMLDivElement>({
          isActive,
          initialFocus: buttonRef,
        })

        return (
          <div>
            <button data-testid="activate" onClick={() => setIsActive(true)}>
              Activate
            </button>
            <div ref={containerRef} data-testid="container" tabIndex={-1}>
              <input data-testid="input" />
              <button ref={buttonRef} data-testid="target-button">Target</button>
            </div>
          </div>
        )
      }

      render(<ComponentWithRefFocus />)

      act(() => {
        screen.getByTestId('activate').click()
      })

      act(() => {
        vi.runAllTimers()
      })

      expect(document.activeElement).toBe(screen.getByTestId('target-button'))
    })
  })

  describe('state transitions', () => {
    it('should only store focus on initial activation', () => {
      render(<TestComponent initiallyActive={false} restoreFocus={true} />)

      const outside = screen.getByTestId('outside')
      act(() => {
        outside.focus()
      })

      const toggle = screen.getByTestId('toggle')
      act(() => {
        toggle.click()
      })

      act(() => {
        vi.runAllTimers()
      })

      act(() => {
        toggle.click()
      })

      act(() => {
        vi.runAllTimers()
      })

      expect(document.activeElement).toBe(outside)
    })
  })
})
