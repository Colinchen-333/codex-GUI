/**
 * ChatView - Main chat interface component (Coordinator)
 * Refactored to use modular sub-components for better maintainability
 *
 * Sub-components:
 * - ChatMessageList: Virtualized message list with auto-scroll
 * - ChatInputArea: Input area with textarea, popups, and send button
 * - ChatImageUpload: Drag & drop and paste image handling
 * - useChatCommands: Command context builder hook
 */
import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import type { ListImperativeAPI } from 'react-window'
// useThreadStore imported for potential future use - currently using props
import { useProjectsStore, type ProjectsState } from '../../stores/projects'
import { useAppStore, type AppState } from '../../stores/app'
import { useThreadStore, selectFocusedThread } from '../../stores/thread'
import { serverApi, type ReviewTarget } from '../../lib/api'
import { ReviewSelectorDialog } from '../LazyComponents'
import { log } from '../../lib/logger'

// Import sub-components
import ChatMessageList from './ChatMessageList'
import ChatInputArea from './ChatInputArea'
import { DragOverlay, useChatImageUpload } from './ChatImageUpload'
import { useChatCommands } from './useChatCommands'
import { useMessageSubmission } from './useMessageSubmission'

export function ChatView() {
  // Store selectors
  const selectedProjectId = useProjectsStore((state: ProjectsState) => state.selectedProjectId)
  const projects = useProjectsStore((state: ProjectsState) => state.projects)
  const focusedThread = useThreadStore(selectFocusedThread)

  // Local state
  const [inputValue, setInputValue] = useState('')
  const [attachedImages, setAttachedImages] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showReviewSelector, setShowReviewSelector] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const virtualListRef = useRef<ListImperativeAPI | null>(null)

  // Custom hooks
  const {
    handleImageFile,
    handlePaste,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useChatImageUpload(setAttachedImages, setIsDragging)

  const {
    buildCommandContext,
    sendMessage,
    addInfoItem,
    showToast,
    activeThread,
  } = useChatCommands({
    inputRef,
    inputValue,
    setInputValue,
    setShowReviewSelector,
  })

  const { handleSend } = useMessageSubmission({
    inputValue,
    setInputValue,
    attachedImages,
    setAttachedImages,
    inputRef,
    projects,
    selectedProjectId,
    activeThread,
    buildCommandContext,
    sendMessage,
    addInfoItem,
    showToast,
  })

  const escapePending = useAppStore((state: AppState) => state.escapePending)
  const escapeToastShownRef = useRef(false)
  const scrollToItemId = useAppStore((state: AppState) => state.scrollToItemId)
  const clearScrollToItemId = useAppStore((state: AppState) => state.clearScrollToItemId)

  useEffect(() => {
    if (escapePending && !escapeToastShownRef.current) {
      showToast('Press Esc again to stop the current response', 'info')
      escapeToastShownRef.current = true
    }
    if (!escapePending) {
      escapeToastShownRef.current = false
    }
  }, [escapePending, showToast])

  // Cross-component scroll requests (for example: jumping to pending approvals)
  useEffect(() => {
    if (!scrollToItemId || !focusedThread) return
    const index = focusedThread.itemOrder.indexOf(scrollToItemId)
    if (index < 0) return
    const rafId = window.requestAnimationFrame(() => {
      virtualListRef.current?.scrollToRow({ index, align: 'start', behavior: 'instant' })
      clearScrollToItemId()
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [scrollToItemId, focusedThread, clearScrollToItemId])

  // Handle review target selection from dialog
  // P0 Fix: Added proper error handling and use activeThread from hook to avoid stale closure
  const handleReviewSelect = useCallback(async (target: ReviewTarget) => {
    if (!activeThread) {
      showToast('No active session', 'error')
      return
    }
    const targetDesc =
      target.type === 'uncommittedChanges'
        ? 'uncommitted changes'
        : target.type === 'baseBranch'
          ? `branch: ${target.branch}`
          : target.type === 'commit'
            ? `commit: ${target.sha.slice(0, 7)}`
            : 'custom instructions'
    addInfoItem('Review', `Starting review of ${targetDesc}...`)
    try {
      await serverApi.startReview(activeThread.id, target)
    } catch (error) {
      log.error(`Failed to start review: ${error}`, 'ChatView')
      showToast('Failed to start review', 'error')
    }
  }, [activeThread, addInfoItem, showToast])

  // Get current project for review selector
  const currentProject = projects.find((p) => p.id === selectedProjectId)

  const shouldShowContinue = useMemo(() => {
    if (!focusedThread || focusedThread.turnStatus === 'running') return false
    const lastId = focusedThread.itemOrder[focusedThread.itemOrder.length - 1]
    if (!lastId) return false
    const lastItem = focusedThread.items[lastId]
    return lastItem?.type === 'info' && lastItem.id.startsWith('compact-')
  }, [focusedThread])

  const handleQuickContinue = useCallback(() => {
    setInputValue('Continue')
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [setInputValue])

  return (
    <div className="flex flex-1 flex-col overflow-hidden relative">
      {shouldShowContinue && (
        <div className="absolute right-8 top-6 z-10">
          <button
            className="rounded-full border border-stroke/20 bg-surface-hover/[0.08] px-4 py-2 text-sm font-semibold text-text-2 shadow-[var(--shadow-1)] transition-colors hover:bg-surface-hover/[0.14]"
            onClick={handleQuickContinue}
          >
            Continue
          </button>
        </div>
      )}
      {/* Drag Overlay */}
      {isDragging && (
        <DragOverlay onDragLeave={handleDragLeave} onDrop={handleDrop} />
      )}

      {/* Messages Area - Virtualized */}
      <ChatMessageList
        scrollAreaRef={scrollAreaRef}
        messagesEndRef={messagesEndRef}
        virtualListRef={virtualListRef}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />

      {/* Input Area */}
      <ChatInputArea
        inputValue={inputValue}
        setInputValue={setInputValue}
        attachedImages={attachedImages}
        setAttachedImages={setAttachedImages}
        isDragging={isDragging}
        onSend={handleSend}
        onPaste={handlePaste}
        handleImageFile={handleImageFile}
        inputRef={inputRef}
        projects={projects}
        selectedProjectId={selectedProjectId}
      />

      {/* Review Selector Dialog */}
      <ReviewSelectorDialog
        isOpen={showReviewSelector}
        onClose={() => setShowReviewSelector(false)}
        onSelect={handleReviewSelect}
        projectPath={currentProject?.path ?? ''}
      />
    </div>
  )
}
