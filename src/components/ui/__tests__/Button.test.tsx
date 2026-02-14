import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../Button'

describe('Button', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
    })

    it('renders with default variant and size', () => {
      render(<Button>Default</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-surface-solid')
      expect(button).toHaveClass('h-9')
    })
  })

  describe('variants', () => {
    it('renders primary variant', () => {
      render(<Button variant="primary">Primary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-primary')
    })

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-surface-solid')
    })

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>)
      expect(screen.getByRole('button')).toHaveClass('text-text-2')
    })

    it('renders outline variant', () => {
      render(<Button variant="outline">Outline</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-transparent')
    })

    it('renders destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>)
      expect(screen.getByRole('button')).toHaveClass('bg-destructive')
    })
  })

  describe('sizes', () => {
    it('renders sm size', () => {
      render(<Button size="sm">Small</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-7')
    })

    it('renders md size', () => {
      render(<Button size="md">Medium</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-9')
    })

    it('renders lg size', () => {
      render(<Button size="lg">Large</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-11')
    })

    it('renders icon size', () => {
      render(<Button size="icon">+</Button>)
      expect(screen.getByRole('button')).toHaveClass('h-8', 'w-8')
    })
  })

  describe('states', () => {
    it('handles disabled state', () => {
      render(<Button disabled>Disabled</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('shows loading spinner when loading', () => {
      render(<Button loading>Loading</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button.querySelector('.animate-spin')).toBeInTheDocument()
      expect(screen.queryByText('Loading')).not.toBeInTheDocument()
    })

    it('is disabled when loading', () => {
      render(<Button loading>Submit</Button>)
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click</Button>)
      
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(<Button disabled onClick={handleClick}>Click</Button>)
      
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('does not call onClick when loading', () => {
      const handleClick = vi.fn()
      render(<Button loading onClick={handleClick}>Click</Button>)
      
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has correct focus styles', () => {
      render(<Button>Focus me</Button>)
      expect(screen.getByRole('button')).toHaveClass('focus-visible:ring-2')
    })

    it('forwards ref correctly', () => {
      const ref = vi.fn()
      render(<Button ref={ref}>Ref</Button>)
      expect(ref).toHaveBeenCalled()
    })
  })

  describe('custom className', () => {
    it('applies custom className', () => {
      render(<Button className="custom-class">Custom</Button>)
      expect(screen.getByRole('button')).toHaveClass('custom-class')
    })
  })
})
