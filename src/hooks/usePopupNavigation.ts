/**
 * usePopupNavigation Hook
 *
 * Shared keyboard navigation logic extracted from SlashCommandPopup and FileMentionPopup.
 * Handles keyboard interactions for popup lists:
 * - ArrowUp/Down: Navigate selected item
 * - Enter/Tab: Confirm selection
 * - Escape: Close popup
 *
 * @example
 * const { selectedIndex, setSelectedIndex } = usePopupNavigation({
 *   items: filteredCommands,
 *   onSelect: handleSelect,
 *   onClose: handleClose,
 *   isVisible: showPopup,
 * })
 */

import { useEffect, useLayoutEffect, useState, useCallback, useRef, type SetStateAction } from 'react'

/**
 * Popup navigation configuration options
 */
export interface UsePopupNavigationOptions<T> {
  /** List of selectable items */
  items: T[]
  /** Callback when an item is selected */
  onSelect: (item: T) => void
  /** Callback to close the popup */
  onClose: () => void
  /** Whether the popup is visible */
  isVisible: boolean
  /** Whether to loop navigation (default false, stops at boundary) */
  loop?: boolean
}

/**
 * Popup navigation hook return value
 */
export interface UsePopupNavigationReturn {
  /** Index of the currently selected item */
  selectedIndex: number
  /** Manually set selected index (e.g., for mouse hover) */
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
}

/**
 * Popup keyboard navigation hook
 *
 * Provides unified keyboard navigation for popup lists:
 * - Arrow Up/Down to navigate items
 * - Enter/Tab to confirm selection
 * - Escape to close popup
 * - Auto-reset selected state
 *
 * @param options - Navigation configuration options
 * @returns Selected index state and setter
 */
export function usePopupNavigation<T>({
  items,
  onSelect,
  onClose,
  isVisible,
  loop = false,
}: UsePopupNavigationOptions<T>): UsePopupNavigationReturn {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // P1 Fix: Use refs to store the latest callbacks to prevent stale closure issues
  // This ensures the keyboard event handler always has access to the current values
  const itemsRef = useRef(items)
  const onSelectRef = useRef(onSelect)
  const onCloseRef = useRef(onClose)
  const selectedIndexRef = useRef(selectedIndex)
  const loopRef = useRef(loop)

  // Keep refs in sync with latest values using useLayoutEffect to avoid render-time ref access
  useLayoutEffect(() => {
    itemsRef.current = items
    onSelectRef.current = onSelect
    onCloseRef.current = onClose
    selectedIndexRef.current = selectedIndex
    loopRef.current = loop
  })

  const setSelectedIndexSafe = useCallback((value: SetStateAction<number>) => {
    setSelectedIndex((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      selectedIndexRef.current = next
      return next
    })
  }, [])

  // Reset selected index when popup becomes visible or items change
  // Ensures the user always starts browsing from the first item
  useEffect(() => {
    if (isVisible) {
      setSelectedIndexSafe(0)
    }
  }, [isVisible, setSelectedIndexSafe])

  useEffect(() => {
    if (!isVisible) return
    const maxIndex = itemsRef.current.length - 1
    if (selectedIndexRef.current > maxIndex) {
      setSelectedIndexSafe(Math.max(0, maxIndex))
    }
  }, [isVisible, items, setSelectedIndexSafe])

  // Handle downward navigation
  const handleArrowDown = useCallback(() => {
    setSelectedIndexSafe((prev) => {
      const currentItems = itemsRef.current
      const currentLoop = loopRef.current
      if (currentItems.length === 0) return 0
      if (currentLoop) {
        // Loop mode: wrap to beginning after reaching end
        return (prev + 1) % currentItems.length
      }
      // Non-loop mode: stop at end
      return Math.min(prev + 1, currentItems.length - 1)
    })
  }, [setSelectedIndexSafe]) // P1 Fix: uses refs internally

  // Handle upward navigation
  const handleArrowUp = useCallback(() => {
    setSelectedIndexSafe((prev) => {
      const currentItems = itemsRef.current
      const currentLoop = loopRef.current
      if (currentItems.length === 0) return 0
      if (currentLoop) {
        // Loop mode: wrap to end after reaching beginning
        return (prev - 1 + currentItems.length) % currentItems.length
      }
      // Non-loop mode: stop at beginning
      return Math.max(prev - 1, 0)
    })
  }, [setSelectedIndexSafe]) // P1 Fix: uses refs internally

  // Handle selection confirmation
  const handleSelect = useCallback(() => {
    const currentItems = itemsRef.current
    const currentIndex = selectedIndexRef.current
    if (currentIndex >= 0 && currentIndex < currentItems.length) {
      onSelectRef.current(currentItems[currentIndex])
    }
  }, []) // P1 Fix: Empty deps - uses refs internally

  // Handle close
  const handleClose = useCallback(() => {
    onCloseRef.current()
  }, []) // P1 Fix: Empty deps - uses refs internally

  // Keyboard event listener
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          handleArrowDown()
          break
        case 'ArrowUp':
          e.preventDefault()
          handleArrowUp()
          break
        case 'Enter':
        case 'Tab':
          e.preventDefault()
          handleSelect()
          break
        case 'Escape':
          e.preventDefault()
          handleClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, handleArrowDown, handleArrowUp, handleSelect, handleClose])

  return { selectedIndex, setSelectedIndex: setSelectedIndexSafe }
}
