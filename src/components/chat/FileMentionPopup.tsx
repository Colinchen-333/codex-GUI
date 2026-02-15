import { useEffect, useRef, useState, useCallback } from 'react'
import { File, Folder, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'
import { projectApi, type FileEntry } from '../../lib/api'
import { isTauriAvailable } from '../../lib/tauri'
import { usePopupNavigation } from '../../hooks/usePopupNavigation'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useToast } from '../ui/useToast'

interface FileMentionPopupProps {
  /** The text after @ that we're filtering by */
  query: string
  /** Project path for file listing */
  projectPath: string
  /** Called when a file is selected */
  onSelect: (file: FileEntry) => void
  /** Called when popup should close */
  onClose: () => void
  /** Whether the popup is visible */
  isVisible: boolean
}

export function FileMentionPopup({
  query,
  projectPath,
  onSelect,
  onClose,
  isVisible,
}: FileMentionPopupProps) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const requestIdRef = useRef(0)
  const projectPathRef = useRef(projectPath)
  const { toast } = useToast()
  const toastRef = useRef(toast)
  const prefersReducedMotion = useReducedMotion()

  // Error recovery states
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  // P2.1 优化：使用提取的 usePopupNavigation hook 处理键盘导航
  // 统一了与 SlashCommandPopup 的导航逻辑，减少代码重复
  const { selectedIndex, setSelectedIndex } = usePopupNavigation({
    items: files,
    onSelect,
    onClose,
    isVisible,
  })

  // Fetch files with debouncing and error handling
  useEffect(() => {
    projectPathRef.current = projectPath
    toastRef.current = toast
  }, [projectPath, toast])

  const fetchFiles = useCallback(async (searchQuery: string) => {
    const currentProjectPath = projectPathRef.current
    if (!currentProjectPath) return

    if (!isTauriAvailable()) {
      setFiles([])
      setError('Unavailable in web mode')
      setIsLoading(false)
      setIsRetrying(false)
      return
    }

    requestIdRef.current += 1
    const requestId = requestIdRef.current
    const pathAtRequest = currentProjectPath

    setIsLoading(true)
    try {
      const result = await projectApi.listFiles(
        currentProjectPath,
        searchQuery || undefined,
        50
      )
      if (requestId !== requestIdRef.current || projectPathRef.current !== pathAtRequest) {
        return
      }
      setFiles(result)
      setError(null) // Clear any previous errors on success
    } catch (err) {
      if (requestId !== requestIdRef.current || projectPathRef.current !== pathAtRequest) {
        return
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files'
      setError(errorMessage)
      setFiles([])
      toastRef.current.error('Files Error', {
        message: errorMessage,
        duration: 5000,
      })
    } finally {
      // Only update loading state if this request is still current
      if (requestId === requestIdRef.current && projectPathRef.current === pathAtRequest) {
        setIsLoading(false)
        setIsRetrying(false)
      }
    }
  }, [])

  useEffect(() => {
    requestIdRef.current += 1
    setFiles([])
    setError(null)
    setIsLoading(false)
  }, [projectPath])

  // Retry handler
  const handleRetry = useCallback(() => {
    setIsRetrying(true)
    setError(null)
    void fetchFiles(query)
  }, [query, fetchFiles])

  // Debounced fetch on query change
  useEffect(() => {
    if (!isVisible) return

    if (!isTauriAvailable()) {
      setFiles([])
      setError('Unavailable in web mode')
      setIsLoading(false)
      setIsRetrying(false)
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      void fetchFiles(query)
    }, 150)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, isVisible, fetchFiles])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!isVisible) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 mx-2">
      <div
        role="listbox"
        aria-label="File suggestions"
        className={cn(
          'max-h-72 overflow-y-auto rounded-xl border border-stroke/20 bg-surface-solid shadow-[var(--shadow-2)]',
          prefersReducedMotion ? '' : 'animate-in fade-in slide-in-from-bottom-2 duration-200'
        )}
      >
        <div className="p-2 text-[10px] font-medium text-text-3 uppercase tracking-wider border-b border-stroke/20 bg-surface-solid/90 flex items-center justify-between">
          <span>Files</span>
          {(isLoading || isRetrying) && <Loader2 className="w-3 h-3 animate-spin" />}
        </div>

        <div ref={listRef} className="py-1">
          {error ? (
            // Error state UI
            <div className="px-3 py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-text-1">Unable to load files</h3>
                  <p className="text-xs text-text-3 mt-1">{error}</p>
                </div>
                {error !== 'Unavailable in web mode' && (
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className={cn(
                      'shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                      'bg-surface-hover/[0.18] text-text-1 hover:bg-surface-hover/[0.24]',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <RefreshCw className={cn('w-3 h-3', isRetrying && 'animate-spin')} />
                    {isRetrying ? 'Retrying...' : 'Retry'}
                  </button>
                )}
              </div>
            </div>
          ) : files.length === 0 && !isLoading ? (
            <div className="px-3 py-4 text-sm text-text-3 text-center">
              {query ? 'No matching files' : 'Start typing to search files'}
            </div>
          ) : (
            files.map((file, index) => (
              <button
                key={file.path}
                data-index={index}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                  index === selectedIndex
                    ? 'bg-surface-selected/[0.16] text-text-1'
                    : 'text-text-2 hover:bg-surface-hover/[0.12]'
                )}
                onClick={() => onSelect(file)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="flex-shrink-0 text-text-3">
                  {file.isDir ? (
                    <Folder className="w-4 h-4" />
                  ) : (
                    <File className="w-4 h-4" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate text-text-1">{file.name}</div>
                  {file.path !== file.name && (
                    <div className="text-xs text-text-3 truncate">
                      {file.path}
                    </div>
                  )}
                </div>
                {index === selectedIndex && (
                  <span className="flex-shrink-0 text-[10px] text-text-3 bg-surface-hover/[0.16] px-1.5 py-0.5 rounded">
                    ↵
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
