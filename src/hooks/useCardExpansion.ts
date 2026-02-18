/**
 * useCardExpansion Hook
 *
 * Manages card expand/collapse state with independent control for multiple cards.
 * Commonly used for accordion panels, FAQs, settings pages, etc.
 *
 * @example
 * function CardList({ cards }) {
 *   const {
 *     isExpanded,
 *     toggle,
 *     expandAll,
 *     collapseAll,
 *     expandedCount,
 *   } = useCardExpansion({
 *     defaultExpanded: ['card-1'], // Expand the first card by default
 *   })
 *
 *   return (
 *     <div>
 *       <button onClick={expandAll}>Expand All</button>
 *       <button onClick={collapseAll}>Collapse All</button>
 *       {cards.map((card) => (
 *         <Card
 *           key={card.id}
 *           isExpanded={isExpanded(card.id)}
 *           onToggle={() => toggle(card.id)}
 *         />
 *       ))}
 *     </div>
 *   )
 * }
 */

import { useState, useCallback } from 'react'

/**
 * Card expansion configuration options
 */
export interface UseCardExpansionOptions {
  /** List of card IDs expanded by default */
  defaultExpanded?: string[]
  /** Whether multiple cards can be expanded simultaneously (default true) */
  allowMultiple?: boolean
  /** Callback when expansion state changes */
  onChange?: (expandedIds: string[]) => void
}

/**
 * Card expansion hook return value
 */
export interface UseCardExpansionReturn {
  /** Check if a specific card is expanded */
  isExpanded: (id: string) => boolean
  /** Toggle a specific card's expansion state */
  toggle: (id: string) => void
  /** Expand a specific card */
  expand: (id: string) => void
  /** Collapse a specific card */
  collapse: (id: string) => void
  /** Expand all cards */
  expandAll: (ids: string[]) => void
  /** Collapse all cards */
  collapseAll: () => void
  /** Get the list of currently expanded card IDs */
  expandedIds: string[]
  /** Get the count of currently expanded cards */
  expandedCount: number
  /** Set the list of expanded card IDs */
  setExpandedIds: (ids: string[]) => void
}

/**
 * Card expansion state management hook
 *
 * Features:
 * - Manage independent expand/collapse state for multiple cards
 * - Single/multiple selection modes
 * - Default expansion settings
 * - Expand all / collapse all support
 * - State change callbacks
 *
 * @param options - Configuration options
 * @returns Card expansion control interface
 */
export function useCardExpansion(
  options: UseCardExpansionOptions = {}
): UseCardExpansionReturn {
  const { defaultExpanded = [], allowMultiple = true, onChange } = options

  const [expandedIds, setExpandedIdsState] = useState<string[]>(defaultExpanded)

  /**
   * Update expanded state and trigger callback
   */
  const updateExpandedIds = useCallback(
    (newIds: string[]) => {
      setExpandedIdsState(newIds)
      onChange?.(newIds)
    },
    [onChange]
  )

  /**
   * Check if a specific card is expanded
   */
  const isExpanded = useCallback(
    (id: string): boolean => {
      return expandedIds.includes(id)
    },
    [expandedIds]
  )

  /**
   * Toggle a specific card's expansion state
   */
  const toggle = useCallback(
    (id: string) => {
      if (expandedIds.includes(id)) {
        // Currently expanded, collapse it
        updateExpandedIds(expandedIds.filter((expandedId) => expandedId !== id))
      } else {
        // Currently collapsed, expand it
        if (allowMultiple) {
          updateExpandedIds([...expandedIds, id])
        } else {
          // Single mode: only keep the current card
          updateExpandedIds([id])
        }
      }
    },
    [expandedIds, allowMultiple, updateExpandedIds]
  )

  /**
   * Expand a specific card
   */
  const expand = useCallback(
    (id: string) => {
      if (expandedIds.includes(id)) return

      if (allowMultiple) {
        updateExpandedIds([...expandedIds, id])
      } else {
        updateExpandedIds([id])
      }
    },
    [expandedIds, allowMultiple, updateExpandedIds]
  )

  /**
   * Collapse a specific card
   */
  const collapse = useCallback(
    (id: string) => {
      if (!expandedIds.includes(id)) return
      updateExpandedIds(expandedIds.filter((expandedId) => expandedId !== id))
    },
    [expandedIds, updateExpandedIds]
  )

  /**
   * Expand all cards
   */
  const expandAll = useCallback(
    (ids: string[]) => {
      if (!allowMultiple && ids.length > 0) {
        // Single mode: only expand the first one
        updateExpandedIds([ids[0]])
      } else {
        // Merge existing expanded IDs with new ones
        const newIds = [...new Set([...expandedIds, ...ids])]
        updateExpandedIds(newIds)
      }
    },
    [expandedIds, allowMultiple, updateExpandedIds]
  )

  /**
   * Collapse all cards
   */
  const collapseAll = useCallback(() => {
    updateExpandedIds([])
  }, [updateExpandedIds])

  /**
   * Directly set the list of expanded card IDs
   */
  const setExpandedIds = useCallback(
    (ids: string[]) => {
      if (!allowMultiple && ids.length > 1) {
        // Single mode: only keep the first one
        updateExpandedIds([ids[0]])
      } else {
        updateExpandedIds(ids)
      }
    },
    [allowMultiple, updateExpandedIds]
  )

  /**
   * Number of expanded cards
   */
  const expandedCount = expandedIds.length

  return {
    isExpanded,
    toggle,
    expand,
    collapse,
    expandAll,
    collapseAll,
    expandedIds,
    expandedCount,
    setExpandedIds,
  }
}

/**
 * Single card expansion state hook
 * For scenarios where only a single card's state needs to be managed
 *
 * @example
 * function Card() {
 *   const { isExpanded, toggle, expand, collapse } = useSingleCardExpansion(false)
 *
 *   return (
 *     <div>
 *       <button onClick={toggle}>
 *         {isExpanded ? 'Collapse' : 'Expand'}
 *       </button>
 *       {isExpanded && <div>Card content</div>}
 *     </div>
 *   )
 * }
 */
export function useSingleCardExpansion(
  defaultExpanded = false,
  onChange?: (isExpanded: boolean) => void
): {
  isExpanded: boolean
  toggle: () => void
  expand: () => void
  collapse: () => void
  setExpanded: (value: boolean) => void
} {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const updateExpanded = useCallback(
    (value: boolean) => {
      setIsExpanded(value)
      onChange?.(value)
    },
    [onChange]
  )

  const toggle = useCallback(() => {
    updateExpanded(!isExpanded)
  }, [isExpanded, updateExpanded])

  const expand = useCallback(() => {
    updateExpanded(true)
  }, [updateExpanded])

  const collapse = useCallback(() => {
    updateExpanded(false)
  }, [updateExpanded])

  const setExpanded = useCallback(
    (value: boolean) => {
      updateExpanded(value)
    },
    [updateExpanded]
  )

  return {
    isExpanded,
    toggle,
    expand,
    collapse,
    setExpanded,
  }
}
