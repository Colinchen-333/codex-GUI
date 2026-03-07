import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { Search, File, X } from 'lucide-react'
import { fileSearchApi, type FileSearchResult } from '../../lib/api'
import { log } from '../../lib/logger'

// ==================== Types ====================

interface FileSearchPanelProps {
  /** Called when the user selects a file */
  onSelect: (path: string) => void
  /** Called when the panel should be dismissed (Escape, outside click) */
  onClose: () => void
  /** Working directory to scope the search to */
  cwd?: string
  /** Placeholder text for the search input */
  placeholder?: string
}

// ==================== Helpers ====================

/**
 * Trim a file path to its last two segments for display.
 * Keeps the filename readable while shortening very long paths.
 */
function displayPath(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  if (parts.length <= 2) return path
  return parts.slice(-2).join('/')
}

/** Return the filename portion of a path. */
function fileName(path: string): string {
  return path.replace(/\\/g, '/').split('/').pop() ?? path
}

// ==================== Component ====================

/**
 * FileSearchPanel — fuzzy file picker backed by the official
 * `fuzzyFileSearch/session*` JSON-RPC protocol.
 *
 * Lifecycle:
 *  - On mount:        starts a search session via `sessionStart`
 *  - On query change: updates the session via `sessionUpdate` (debounced 150 ms)
 *  - On unmount:      stops the session via `sessionStop`
 *
 * Keyboard nav:
 *  - Arrow Up / Down  — move selection
 *  - Enter            — confirm selection
 *  - Escape           — close panel
 */
export const FileSearchPanel = memo(function FileSearchPanel({
  onSelect,
  onClose,
  cwd,
  placeholder = 'Search files…',
}: FileSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FileSearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  // Debounce timer for sessionUpdate calls
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track whether the component is still mounted to avoid state updates after unmount
  const mountedRef = useRef(true)

  // ---- Session lifecycle ------------------------------------------------

  useEffect(() => {
    mountedRef.current = true
    let sid: string | null = null

    const start = async () => {
      setIsLoading(true)
      try {
        const res = await fileSearchApi.sessionStart('', cwd)
        if (!mountedRef.current) return
        sid = res.sessionId || null
        setSessionId(sid)
        setResults(res.results ?? [])
      } catch (err) {
        if (mountedRef.current) {
          log.warn(`FileSearchPanel: sessionStart failed: ${err}`, 'FileSearch')
        }
      } finally {
        if (mountedRef.current) setIsLoading(false)
      }
    }

    start()

    return () => {
      mountedRef.current = false
      // Stop the session on unmount (fire-and-forget)
      if (sid) {
        fileSearchApi.sessionStop(sid).catch((err) => {
          log.warn(`FileSearchPanel: sessionStop failed: ${err}`, 'FileSearch')
        })
      }
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwd])

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // ---- Query handling --------------------------------------------------

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value
      setQuery(q)
      setSelectedIndex(0)

      if (debounceRef.current) clearTimeout(debounceRef.current)

      debounceRef.current = setTimeout(async () => {
        if (!mountedRef.current) return
        setIsLoading(true)
        try {
          if (sessionId) {
            const res = await fileSearchApi.sessionUpdate(sessionId, q)
            if (mountedRef.current) setResults(res.results ?? [])
          } else {
            // Fallback: one-shot search when session is not yet established
            const res = await fileSearchApi.search(q, cwd)
            if (mountedRef.current) setResults(res.results ?? [])
          }
        } catch (err) {
          if (mountedRef.current) {
            log.warn(`FileSearchPanel: search update failed: ${err}`, 'FileSearch')
          }
        } finally {
          if (mountedRef.current) setIsLoading(false)
        }
      }, 150)
    },
    [sessionId, cwd]
  )

  const handleClear = useCallback(() => {
    setQuery('')
    setSelectedIndex(0)
    setResults([])
    inputRef.current?.focus()
  }, [])

  // ---- Keyboard navigation ---------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            onSelect(results[selectedIndex].path)
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [results, selectedIndex, onSelect, onClose]
  )

  // ---- Render ----------------------------------------------------------

  return (
    <div
      className="flex flex-col bg-surface-solid rounded-xl border border-stroke/20 shadow-xl overflow-hidden"
      style={{ maxHeight: '24rem' }}
      role="dialog"
      aria-label="File search"
    >
      {/* Search input row */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-stroke/20 flex-shrink-0">
        <Search
          size={16}
          className={`flex-shrink-0 transition-colors ${isLoading ? 'text-primary' : 'text-text-3'}`}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-text-1 outline-none placeholder:text-text-3"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-label="Search files"
        />
        {query && (
          <button
            onClick={handleClear}
            className="flex-shrink-0 text-text-3 hover:text-text-1 transition-colors"
            aria-label="Clear search"
            tabIndex={-1}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results list */}
      <div
        className="overflow-y-auto flex-1"
        role="listbox"
        aria-label="File search results"
      >
        {results.map((result, i) => {
          const name = fileName(result.path)
          const dir = displayPath(result.path)
          const isSelected = i === selectedIndex

          return (
            <button
              key={result.path}
              role="option"
              aria-selected={isSelected}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                isSelected
                  ? 'bg-selected text-text-1'
                  : 'text-text-2 hover:bg-hover'
              }`}
              onClick={() => onSelect(result.path)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <File
                size={14}
                className="text-text-3 flex-shrink-0"
                aria-hidden="true"
              />
              <span className="flex-1 truncate">
                <span className="text-text-1 font-medium">{name}</span>
                {dir !== name && (
                  <span className="ml-1.5 text-text-3 text-xs">{dir}</span>
                )}
              </span>
            </button>
          )
        })}

        {/* Empty states */}
        {!isLoading && query && results.length === 0 && (
          <div className="px-3 py-6 text-center text-text-3 text-sm">
            No files found
          </div>
        )}
        {!query && results.length === 0 && !isLoading && (
          <div className="px-3 py-6 text-center text-text-3 text-sm">
            Start typing to search files
          </div>
        )}
      </div>
    </div>
  )
})
