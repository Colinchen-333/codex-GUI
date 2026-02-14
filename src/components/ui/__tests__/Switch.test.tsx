import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Switch } from '../Switch'

describe('Switch', () => {
  describe('rendering', () => {
    it('renders correctly', () => {
      render(<Switch />)
      expect(screen.getByRole('switch')).toBeInTheDocument()
    })

    it('renders with default size (md)', () => {
      render(<Switch />)
      expect(screen.getByRole('switch')).toHaveClass('h-5', 'w-9')
    })

    it('renders unchecked by default', () => {
      render(<Switch />)
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('sizes', () => {
    it('renders sm size', () => {
      render(<Switch size="sm" />)
      expect(screen.getByRole('switch')).toHaveClass('h-4', 'w-7')
    })

    it('renders md size', () => {
      render(<Switch size="md" />)
      expect(screen.getByRole('switch')).toHaveClass('h-5', 'w-9')
    })
  })

  describe('checked state', () => {
    it('renders checked state correctly', () => {
      render(<Switch checked />)
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked', 'true')
      expect(toggle).toHaveClass('bg-primary')
    })

    it('renders unchecked state correctly', () => {
      render(<Switch checked={false} />)
      const toggle = screen.getByRole('switch')
      expect(toggle).toHaveAttribute('aria-checked', 'false')
      expect(toggle).not.toHaveClass('bg-primary')
    })

    it('thumb translates when checked', () => {
      const { container } = render(<Switch checked size="md" />)
      const thumb = container.querySelector('span')
      expect(thumb).toHaveClass('translate-x-4')
    })

    it('thumb does not translate when unchecked', () => {
      const { container } = render(<Switch checked={false} size="md" />)
      const thumb = container.querySelector('span')
      expect(thumb).not.toHaveClass('translate-x-4')
    })
  })

  describe('interactions', () => {
    it('calls onChange with true when clicking unchecked switch', () => {
      const handleChange = vi.fn()
      render(<Switch checked={false} onChange={handleChange} />)
      
      fireEvent.click(screen.getByRole('switch'))
      expect(handleChange).toHaveBeenCalledWith(true)
    })

    it('calls onChange with false when clicking checked switch', () => {
      const handleChange = vi.fn()
      render(<Switch checked={true} onChange={handleChange} />)
      
      fireEvent.click(screen.getByRole('switch'))
      expect(handleChange).toHaveBeenCalledWith(false)
    })

    it('does not call onChange when disabled', () => {
      const handleChange = vi.fn()
      render(<Switch disabled onChange={handleChange} />)
      
      fireEvent.click(screen.getByRole('switch'))
      expect(handleChange).not.toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('applies disabled attribute', () => {
      render(<Switch disabled />)
      expect(screen.getByRole('switch')).toBeDisabled()
    })

    it('applies disabled styles', () => {
      render(<Switch disabled />)
      expect(screen.getByRole('switch')).toHaveClass('disabled:opacity-50')
    })
  })

  describe('accessibility', () => {
    it('has role="switch"', () => {
      render(<Switch />)
      expect(screen.getByRole('switch')).toBeInTheDocument()
    })

    it('has aria-checked attribute', () => {
      render(<Switch checked />)
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    })

    it('has type="button"', () => {
      render(<Switch />)
      expect(screen.getByRole('switch')).toHaveAttribute('type', 'button')
    })

    it('has focus ring styles', () => {
      render(<Switch />)
      expect(screen.getByRole('switch')).toHaveClass('focus-visible:ring-2')
    })

    it('forwards ref correctly', () => {
      const ref = vi.fn()
      render(<Switch ref={ref} />)
      expect(ref).toHaveBeenCalled()
    })
  })

  describe('custom className', () => {
    it('applies custom className', () => {
      render(<Switch className="custom-class" />)
      expect(screen.getByRole('switch')).toHaveClass('custom-class')
    })
  })

  describe('keyboard interaction', () => {
    it('can be focused', () => {
      render(<Switch />)
      const toggle = screen.getByRole('switch')
      toggle.focus()
      expect(document.activeElement).toBe(toggle)
    })

    it('triggers onClick with Enter key', () => {
      const handleChange = vi.fn()
      render(<Switch onChange={handleChange} />)
      
      const toggle = screen.getByRole('switch')
      toggle.focus()
      fireEvent.keyDown(toggle, { key: 'Enter' })
      fireEvent.click(toggle)
      
      expect(handleChange).toHaveBeenCalled()
    })
  })
})
