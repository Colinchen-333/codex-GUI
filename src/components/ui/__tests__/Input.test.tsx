import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '../Input'
import { Search } from 'lucide-react'

describe('Input', () => {
  describe('rendering', () => {
    it('renders correctly', () => {
      render(<Input placeholder="Enter text" />)
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
    })

    it('renders with default size', () => {
      render(<Input data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveClass('h-9')
    })
  })

  describe('sizes', () => {
    it('renders sm size', () => {
      render(<Input inputSize="sm" data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveClass('h-7')
    })

    it('renders md size', () => {
      render(<Input inputSize="md" data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveClass('h-9')
    })

    it('renders lg size', () => {
      render(<Input inputSize="lg" data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveClass('h-11')
    })
  })

  describe('error state', () => {
    it('applies error styles when error is true', () => {
      render(<Input error data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveClass('border-destructive')
    })

    it('applies normal border when error is false', () => {
      render(<Input error={false} data-testid="input" />)
      expect(screen.getByTestId('input')).not.toHaveClass('border-destructive')
    })
  })

  describe('with icon', () => {
    it('renders icon when provided', () => {
      render(<Input icon={<Search data-testid="icon" />} data-testid="input" />)
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('adds left padding for icon', () => {
      render(<Input icon={<Search />} data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveClass('pl-9')
    })

    it('wraps input in relative container when icon provided', () => {
      const { container } = render(<Input icon={<Search />} />)
      expect(container.querySelector('.relative')).toBeInTheDocument()
    })
  })

  describe('states', () => {
    it('handles disabled state', () => {
      render(<Input disabled data-testid="input" />)
      expect(screen.getByTestId('input')).toBeDisabled()
      expect(screen.getByTestId('input')).toHaveClass('disabled:opacity-50')
    })

    it('handles readonly state', () => {
      render(<Input readOnly data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveAttribute('readonly')
    })
  })

  describe('interactions', () => {
    it('handles value changes', () => {
      const handleChange = vi.fn()
      render(<Input onChange={handleChange} data-testid="input" />)
      
      fireEvent.change(screen.getByTestId('input'), { target: { value: 'test' } })
      expect(handleChange).toHaveBeenCalled()
    })

    it('handles focus', () => {
      const handleFocus = vi.fn()
      render(<Input onFocus={handleFocus} data-testid="input" />)
      
      fireEvent.focus(screen.getByTestId('input'))
      expect(handleFocus).toHaveBeenCalled()
    })

    it('handles blur', () => {
      const handleBlur = vi.fn()
      render(<Input onBlur={handleBlur} data-testid="input" />)
      
      fireEvent.blur(screen.getByTestId('input'))
      expect(handleBlur).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has focus ring styles', () => {
      render(<Input data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveClass(
        'focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]'
      )
    })

    it('forwards ref correctly', () => {
      const ref = vi.fn()
      render(<Input ref={ref} />)
      expect(ref).toHaveBeenCalled()
    })
  })

  describe('custom className', () => {
    it('applies custom className', () => {
      render(<Input className="custom-class" data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveClass('custom-class')
    })

    it('applies custom className with icon', () => {
      render(<Input icon={<Search />} className="custom-class" data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveClass('custom-class')
    })
  })

  describe('input types', () => {
    it('renders as text input by default', () => {
      render(<Input data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input.tagName).toBe('INPUT')
      expect(input).not.toHaveAttribute('type', 'password')
    })

    it('renders as password input', () => {
      render(<Input type="password" data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'password')
    })

    it('renders as email input', () => {
      render(<Input type="email" data-testid="input" />)
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'email')
    })
  })
})
