import { useRef, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

/**
 * PageTransition - Wraps page content with a fade+slide entry animation.
 * Re-triggers the animation whenever the route pathname changes.
 * Uses the CSS class `.page-enter` defined in index.css.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation()
  const containerRef = useRef<HTMLDivElement>(null)
  const prevPathRef = useRef(location.pathname)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Only re-trigger animation when pathname actually changes
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname
      // Remove and re-add the animation class to retrigger
      el.classList.remove('page-enter')
      // Force reflow to restart animation
      void el.offsetWidth
      el.classList.add('page-enter')
    }
  }, [location.pathname])

  return (
    <div ref={containerRef} className={`page-enter ${className ?? ''}`}>
      {children}
    </div>
  )
}
