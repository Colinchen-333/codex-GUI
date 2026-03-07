import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

interface FindInThreadProps {
  isOpen: boolean
  onClose: () => void
  containerRef: React.RefObject<HTMLElement | null>
}

export function FindInThread({ isOpen, onClose, containerRef }: FindInThreadProps) {
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<Range[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const highlightRef = useRef<Highlight | null>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      inputRef.current?.select()
    } else {
      clearHighlights()
      setQuery('')
      setMatches([])
      setCurrentIndex(0)
    }
  }, [isOpen])

  const clearHighlights = useCallback(() => {
    if (highlightRef.current) {
      highlightRef.current.clear()
    }
    try {
      CSS.highlights?.delete('codex-find-match')
      CSS.highlights?.delete('codex-find-active')
    } catch {
      // CSS.highlights not supported
    }
  }, [])

  const performSearch = useCallback((searchQuery: string) => {
    clearHighlights()

    if (!searchQuery || !containerRef.current) {
      setMatches([])
      setCurrentIndex(0)
      return
    }

    const treeWalker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
    )

    const foundRanges: Range[] = []
    const lowerQuery = searchQuery.toLowerCase()

    let node: Node | null
    while ((node = treeWalker.nextNode())) {
      const text = node.textContent?.toLowerCase() ?? ''
      let startIdx = 0
      let idx: number

      while ((idx = text.indexOf(lowerQuery, startIdx)) !== -1) {
        const range = new Range()
        range.setStart(node, idx)
        range.setEnd(node, idx + searchQuery.length)
        foundRanges.push(range)
        startIdx = idx + 1
      }
    }

    setMatches(foundRanges)
    setCurrentIndex(foundRanges.length > 0 ? 0 : -1)

    if (foundRanges.length > 0 && CSS.highlights) {
      try {
        const matchHighlight = new Highlight(...foundRanges)
        CSS.highlights.set('codex-find-match', matchHighlight)

        const activeHighlight = new Highlight(foundRanges[0])
        CSS.highlights.set('codex-find-active', activeHighlight)

        foundRanges[0].startContainer.parentElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      } catch {
        // Fallback for browsers without CSS.highlights
      }
    }
  }, [containerRef, clearHighlights])

  const navigateMatch = useCallback((direction: 'prev' | 'next') => {
    if (matches.length === 0) return

    const newIndex = direction === 'next'
      ? (currentIndex + 1) % matches.length
      : (currentIndex - 1 + matches.length) % matches.length

    setCurrentIndex(newIndex)

    if (CSS.highlights) {
      try {
        const activeHighlight = new Highlight(matches[newIndex])
        CSS.highlights.set('codex-find-active', activeHighlight)
      } catch {
        // fallback
      }
    }

    matches[newIndex].startContainer.parentElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [matches, currentIndex])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        navigateMatch('prev')
      } else {
        navigateMatch('next')
      }
    }
  }, [onClose, navigateMatch])

  useEffect(() => {
    const timer = setTimeout(() => performSearch(query), 150)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  if (!isOpen) return null

  return (
    <div className="absolute top-toolbar right-4 z-popover flex items-center gap-1.5 rounded-xl bg-surface-solid border border-stroke/20 px-3 py-1.5 shadow-xl">
      <Search size={14} className="text-text-3 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in thread..."
        className="bg-transparent text-sm text-text-1 placeholder:text-text-3 outline-none w-48"
      />
      <span className={cn(
        'text-xs tabular-nums shrink-0',
        matches.length > 0 ? 'text-text-2' : 'text-text-3'
      )}>
        {matches.length > 0 ? `${currentIndex + 1}/${matches.length}` : 'No results'}
      </span>
      <button
        onClick={() => navigateMatch('prev')}
        disabled={matches.length === 0}
        className="p-0.5 rounded hover:bg-surface-hover/[0.08] disabled:opacity-30 transition-colors"
        aria-label="Previous match"
      >
        <ChevronUp size={14} className="text-text-2" />
      </button>
      <button
        onClick={() => navigateMatch('next')}
        disabled={matches.length === 0}
        className="p-0.5 rounded hover:bg-surface-hover/[0.08] disabled:opacity-30 transition-colors"
        aria-label="Next match"
      >
        <ChevronDown size={14} className="text-text-2" />
      </button>
      <button
        onClick={onClose}
        className="p-0.5 rounded hover:bg-surface-hover/[0.08] transition-colors"
        aria-label="Close search"
      >
        <X size={14} className="text-text-3" />
      </button>
    </div>
  )
}
