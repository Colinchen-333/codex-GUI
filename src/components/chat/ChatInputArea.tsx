/**
 * ChatInputArea - Input area component with textarea, image preview, and send button
 * Extracted from ChatView.tsx for better modularity
 */
import React, { useCallback, useEffect, memo, useMemo, useRef, useState } from 'react'
import { X, Plus, ArrowUp, Square, ChevronDown, Shield, Mic, MicOff, Paperclip, ListTodo, GitBranch, Check, MessageSquare, FileEdit, Zap, Search } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useThreadStore, selectFocusedThread } from '../../stores/thread'
import { selectFileChanges } from '../../stores/thread/selectors'
import { useSettingsStore, type ApprovalPolicy } from '../../stores/settings'
import { useProjectsStore } from '../../stores/projects'
import { useModelsStore, modelSupportsReasoning } from '../../stores/models'
import { projectApi, terminalApi, type GitBranch as GitBranchType } from '../../lib/api'
import { useToast } from '../ui/useToast'
import { SlashCommandPopup } from './SlashCommandPopup'
import { FileMentionPopup } from './FileMentionPopup'
import { type SlashCommand } from '../../lib/slashCommands'
import { WorkingStatusBar, QueuedMessagesDisplay, RateLimitWarning, InputStatusHint } from './status'
import {
  useInputPopups,
  useTextareaResize,
  useFocusInput,
  useFileMentionHandler,
} from './useInputHooks'
import { useCommandHistory } from '../../hooks/useCommandHistory'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { log } from '../../lib/logger'

export interface ChatInputAreaProps {
  inputValue: string
  setInputValue: React.Dispatch<React.SetStateAction<string>>
  attachedImages: string[]
  setAttachedImages: React.Dispatch<React.SetStateAction<string[]>>
  isDragging: boolean
  onSend: () => Promise<void>
  onPaste: (e: React.ClipboardEvent) => void
  handleImageFile: (file: File) => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  projects: Array<{ id: string; path: string }>
  selectedProjectId: string | null
}

/**
 * Image preview component
 */
const ImagePreview = memo(function ImagePreview({
  images,
  onRemove,
}: {
  images: string[]
  onRemove: (index: number) => void
}) {
  if (images.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-2 pt-2 pb-1">
      {images.map((img, i) => (
        <div key={i} className="relative group animate-in zoom-in duration-100">
          <img
            src={img}
            alt={`Attached ${i + 1}`}
            loading="lazy"
            decoding="async"
            className="h-14 w-14 rounded-lg object-cover border border-stroke/30 shadow-[var(--shadow-1)]"
          />
          <button
            className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-surface-solid shadow-[var(--shadow-1)] text-text-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
            onClick={() => onRemove(i)}
            aria-label={`Remove image ${i + 1}`}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
})

/**
 * Send/Stop button component
 */
const SendButton = memo(function SendButton({
  turnStatus,
  canSend,
  onSend,
  onInterrupt,
}: {
  turnStatus: string
  canSend: boolean
  onSend: () => void
  onInterrupt: () => void
}) {
  const isRunning = turnStatus === 'running'
  return (
    <button
      className={cn(
        'h-10 w-10 flex items-center justify-center rounded-full transition-all duration-100 shadow-[var(--shadow-1)]',
        isRunning
          ? 'bg-token-foreground text-token-bg-primary hover:bg-token-foreground/85'
          : !canSend
            ? 'bg-surface-hover/[0.08] text-text-3 cursor-not-allowed opacity-40'
            : 'bg-token-foreground text-token-bg-primary hover:bg-token-foreground/85'
      )}
      onClick={isRunning ? onInterrupt : onSend}
      disabled={!isRunning && !canSend}
      title={isRunning ? 'Stop generation (Esc)' : 'Send message (Enter)'}
      aria-label={isRunning ? 'Stop generation' : 'Send message'}
    >
      {isRunning ? <Square size={18} aria-hidden="true" /> : <ArrowUp size={18} aria-hidden="true" />}
    </button>
  )
})

export default memo(function ChatInputArea({
  inputValue,
  setInputValue,
  attachedImages,
  setAttachedImages,
  isDragging,
  onSend,
  onPaste,
  handleImageFile,
  inputRef,
  projects,
  selectedProjectId,
}: ChatInputAreaProps) {
  // P1 Fix: Use proper selector to avoid re-render loops from getter-based state access
  const focusedThread = useThreadStore(selectFocusedThread)
  const hasFileChanges = useThreadStore((state) => selectFileChanges(state).length > 0)
  const interrupt = useThreadStore((state) => state.interrupt)
  const settings = useSettingsStore((state) => state.settings)

  const [isFocused, setIsFocused] = useState(false)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [planModeEnabled, setPlanModeEnabled] = useState(false)
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false)
  const [isApprovalMenuOpen, setIsApprovalMenuOpen] = useState(false)
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false)
  const [branches, setBranches] = useState<GitBranchType[]>([])
  const [branchSearch, setBranchSearch] = useState('')
  const [isSwitchingBranch, setIsSwitchingBranch] = useState(false)

  const models = useModelsStore((state) => state.models)
  const fetchModels = useModelsStore((state) => state.fetchModels)
  const updateSetting = useSettingsStore((state) => state.updateSetting)
  const { toast } = useToast()

  const gitInfo = useProjectsStore((state) =>
    selectedProjectId ? state.gitInfo[selectedProjectId] : null
  )
  const fetchGitInfo = useProjectsStore((state) => state.fetchGitInfo)
  const gitBranch = gitInfo?.branch || null
  const addMenuRef = useRef<HTMLDivElement>(null)
  const modelMenuRef = useRef<HTMLDivElement>(null)
  const approvalMenuRef = useRef<HTMLDivElement>(null)
  const branchMenuRef = useRef<HTMLDivElement>(null)
  const branchSearchRef = useRef<HTMLInputElement>(null)

  const turnStatus = focusedThread?.turnStatus ?? 'idle'
  const modelOverride = focusedThread?.sessionOverrides?.model

  const modelLabel = useMemo(() => {
    const modelId = modelOverride || settings.model || 'gpt-5.2-codex'
    const parts = modelId.replace(/_/g, '-').split('-')
    const formatted = parts
      .map((part, index) => {
        if (index === 0 && part.toLowerCase() === 'gpt') return 'GPT'
        if (/^o\\d+/i.test(part)) return part.toUpperCase()
        if (/^\\d/.test(part)) return part
        return part.charAt(0).toUpperCase() + part.slice(1)
      })
      .join('-')
    return formatted
  }, [modelOverride, settings.model])

  const reasoningLabel = useMemo(() => {
    const map: Record<string, string> = {
      none: '',
      minimal: 'Minimal',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      xhigh: 'Extra High',
    }
    return map[settings.reasoningEffort] ?? ''
  }, [settings.reasoningEffort])

  const {
    showSlashCommands,
    setShowSlashCommands,
    showFileMention,
    setShowFileMention,
    fileMentionQuery,
    mentionStartPos,
    restoreFocus, // P0 Enhancement: Get focus restoration function
  } = useInputPopups(inputValue, inputRef)

  useTextareaResize(inputRef, inputValue)
  useFocusInput(inputRef)

  // Command history for up/down arrow navigation
  const {
    handleHistoryKeyDown,
    addToHistory,
    resetHistoryCursor,
  } = useCommandHistory({
    inputRef,
    inputValue,
    setInputValue: (value: string) => setInputValue(value),
    popupsOpen: showSlashCommands || showFileMention,
  })

  // Reset history cursor when user types (not during navigation)
  useEffect(() => {
    resetHistoryCursor()
  }, [inputValue, resetHistoryCursor])

  // Voice input
  const {
    isListening,
    transcript,
    error: voiceError,
    startListening,
    stopListening,
    isSupported: voiceSupported,
  } = useVoiceInput({
    onResult: useCallback((text: string) => {
      setInputValue((prev) => {
        const separator = prev && !prev.endsWith(' ') ? ' ' : ''
        return prev + separator + text
      })
    }, [setInputValue]),
  })

  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  const { handleFileMentionSelect } = useFileMentionHandler({
    inputValue,
    mentionStartPos,
    fileMentionQuery,
    projects,
    selectedProjectId,
    setInputValue,
    setAttachedImages,
    setShowFileMention,
    inputRef,
  })

  const handleSlashCommandSelect = useCallback((command: SlashCommand) => {
    setInputValue(`/${command.name} `)
    setShowSlashCommands(false)
    // P0 Enhancement: Use focus restoration function
    restoreFocus()
  }, [setInputValue, setShowSlashCommands, restoreFocus])

  // Wrapped onSend to add command to history
  const handleSendWithHistory = useCallback(async () => {
    const text = inputValue.trim()
    if (text) {
      addToHistory(text)
    }
    await onSend()
  }, [inputValue, addToHistory, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle history navigation first
      handleHistoryKeyDown(e)

      // Ctrl+M / Cmd+M to toggle voice input
      if (e.key === 'm' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        toggleVoice()
        return
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        if (showSlashCommands || showFileMention) {
          return
        }
        e.preventDefault()
        void handleSendWithHistory()
      }
    },
    [showSlashCommands, showFileMention, handleSendWithHistory, handleHistoryKeyDown, toggleVoice]
  )

  // Global Ctrl+M shortcut (works even when textarea is not focused)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' && (e.ctrlKey || e.metaKey)) {
        // Skip if event already handled by textarea's onKeyDown
        if (e.target === inputRef.current) return
        e.preventDefault()
        toggleVoice()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [toggleVoice, inputRef])

  const removeImage = useCallback(
    (index: number) => {
      setAttachedImages((prev) => prev.filter((_, i) => i !== index))
    },
    [setAttachedImages]
  )

  // P0 Enhancement: Focus loss detection and logging
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false)
      // Log focus loss for debugging
      const relatedTarget = e.relatedTarget as HTMLElement | null
      const targetDescription = relatedTarget
        ? `${relatedTarget.tagName}${relatedTarget.id ? `#${relatedTarget.id}` : ''}${relatedTarget.className ? `.${relatedTarget.className.split(' ')[0]}` : ''}`
        : 'null'

      log.debug(
        `[ChatInputArea] Focus lost from input. New focus target: ${targetDescription}`,
        'ChatInputArea'
      )

      // Only warn in development if focus is lost unexpectedly (not to buttons or known elements)
      if (process.env.NODE_ENV === 'development') {
        const isExpectedTarget =
          relatedTarget &&
          (relatedTarget.tagName === 'BUTTON' ||
            relatedTarget.closest('[role="dialog"]') ||
            relatedTarget.closest('[role="listbox"]') ||
            relatedTarget.closest('.popup') ||
            relatedTarget.closest('.dialog'))

        if (!isExpectedTarget && relatedTarget !== null) {
          log.warn(
            `[ChatInputArea] Unexpected focus loss to: ${targetDescription}. Consider adding focus restoration.`,
            'ChatInputArea'
          )
        }
      }
    },
    []
  )

  const handleFocus = useCallback(() => setIsFocused(true), [])

  const canSend = inputValue.trim() || attachedImages.length > 0

  useEffect(() => {
    if (!isAddMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (!addMenuRef.current) return
      if (!addMenuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isAddMenuOpen])

  // Click outside handler for model menu
  useEffect(() => {
    if (!isModelMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (!modelMenuRef.current?.contains(event.target as Node)) {
        setIsModelMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isModelMenuOpen])

  // Click outside handler for approval menu
  useEffect(() => {
    if (!isApprovalMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (!approvalMenuRef.current?.contains(event.target as Node)) {
        setIsApprovalMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isApprovalMenuOpen])

  // Click outside handler for branch menu
  useEffect(() => {
    if (!isBranchMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (!branchMenuRef.current?.contains(event.target as Node)) {
        setIsBranchMenuOpen(false)
        setBranchSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isBranchMenuOpen])

  // Fetch models when model menu opens
  useEffect(() => {
    if (isModelMenuOpen) {
      void fetchModels()
    }
  }, [isModelMenuOpen, fetchModels])

  // Fetch branches when branch menu opens
  useEffect(() => {
    if (!isBranchMenuOpen) return
    const projectPath = projects.find((p) => p.id === selectedProjectId)?.path
    if (!projectPath) return
    projectApi.getGitBranches(projectPath).then(setBranches).catch(() => {
      setBranches([])
    })
  }, [isBranchMenuOpen, projects, selectedProjectId])

  // Focus branch search when menu opens
  useEffect(() => {
    if (isBranchMenuOpen) {
      setTimeout(() => branchSearchRef.current?.focus(), 50)
    }
  }, [isBranchMenuOpen])

  // Approval policy helpers
  const approvalPolicyConfig: Record<ApprovalPolicy, { label: string; description: string; icon: typeof MessageSquare; color: string }> = useMemo(() => ({
    'on-request': { label: 'Suggest', description: 'Ask before any action', icon: MessageSquare, color: 'text-status-success' },
    'on-failure': { label: 'Auto-edit', description: 'Auto-apply file changes, confirm commands', icon: FileEdit, color: 'text-status-warning' },
    'never': { label: 'Full auto', description: 'Execute all operations automatically', icon: Zap, color: 'text-status-error' },
    'untrusted': { label: 'Unless Trusted', description: 'Auto-apply only for trusted projects', icon: Shield, color: 'text-status-warning' },
  }), [])

  const currentApprovalConfig = approvalPolicyConfig[settings.approvalPolicy] || approvalPolicyConfig['on-request']

  const handleSelectModel = useCallback((modelId: string) => {
    updateSetting('model', modelId)
    setIsModelMenuOpen(false)
  }, [updateSetting])

  const handleSelectApproval = useCallback((policy: ApprovalPolicy) => {
    updateSetting('approvalPolicy', policy)
    setIsApprovalMenuOpen(false)
  }, [updateSetting])

  const handleSelectBranch = useCallback(async (branchName: string) => {
    const projectPath = projects.find((p) => p.id === selectedProjectId)?.path
    if (!projectPath || isSwitchingBranch) return

    setIsSwitchingBranch(true)
    try {
      await terminalApi.execute(projectPath, `git checkout ${branchName}`)
      // Refresh git info after successful checkout
      if (selectedProjectId) {
        await fetchGitInfo(selectedProjectId, projectPath)
      }
      toast.success('Branch switched', { message: `Now on ${branchName}` })
      setIsBranchMenuOpen(false)
      setBranchSearch('')
    } catch (error) {
      toast.error('Failed to switch branch', {
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSwitchingBranch(false)
    }
  }, [projects, selectedProjectId, isSwitchingBranch, fetchGitInfo, toast])

  const filteredBranches = useMemo(() => {
    if (!branchSearch) return branches
    const query = branchSearch.toLowerCase()
    return branches.filter((b) => b.name.toLowerCase().includes(query))
  }, [branches, branchSearch])

  const placeholder = turnStatus === 'running'
    ? 'Type to queue next message...'
    : hasFileChanges
      ? 'Ask for follow-up changes'
      : 'Message Codex...'

  return (
    <div className="px-6 md:px-8 pb-6 pt-3 bg-transparent" role="form" aria-label="Message composer">
      <div className="mx-auto max-w-[880px]">
        <RateLimitWarning />
        <WorkingStatusBar />
        <QueuedMessagesDisplay />

        <div
          className={cn(
            'relative rounded-2xl bg-surface-solid border border-white/[0.08] transition-all duration-200 shadow-[var(--shadow-1)]',
            'hover:border-white/[0.12]',
            isFocused && 'ring-2 ring-primary/5 border-primary/20 shadow-[var(--shadow-2)]',
            isDragging && 'scale-[1.01] ring-2 ring-primary/20 ring-offset-2'
          )}
        >
          <SlashCommandPopup
            input={inputValue}
            onSelect={handleSlashCommandSelect}
            onClose={() => setShowSlashCommands(false)}
            isVisible={showSlashCommands}
          />
          <FileMentionPopup
            query={fileMentionQuery}
            projectPath={projects.find((p) => p.id === selectedProjectId)?.path ?? ''}
            onSelect={handleFileMentionSelect}
            onClose={() => setShowFileMention(false)}
            isVisible={showFileMention && !!selectedProjectId}
          />

          <ImagePreview images={attachedImages} onRemove={removeImage} />

          {(isListening || voiceError) && (
            <div className="px-4 pt-2">
              {isListening && transcript && (
                <div className="text-xs text-text-2 italic truncate">
                  {transcript}
                </div>
              )}
              {isListening && !transcript && (
                <div className="text-xs text-text-3">
                  Listening... Press Ctrl+M to stop
                </div>
              )}
              {voiceError && (
                <div className="text-xs text-status-error">
                  {voiceError}
                </div>
              )}
            </div>
          )}

          <div className="px-4 pt-3">
            <textarea
              ref={inputRef}
              className="w-full max-h-[220px] min-h-[80px] resize-none bg-transparent text-sm text-text-1 focus:outline-none placeholder:text-text-3/70"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={onPaste}
              onBlur={handleBlur}
              onFocus={handleFocus}
              rows={1}
              aria-label="Message input"
              aria-describedby="input-hint"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stroke/15 px-4 py-2">
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="image-upload"
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = e.target.files
                  if (files) {
                    for (const file of files) {
                      handleImageFile(file)
                    }
                  }
                  e.target.value = ''
                }}
              />
              <div ref={addMenuRef} className="relative">
                <button
                  className={cn(
                    'h-8 w-8 rounded-full border border-white/[0.08] bg-surface-solid text-text-2 transition-colors hover:bg-surface-hover/[0.12] hover:text-text-1',
                    isAddMenuOpen && 'bg-surface-hover/[0.14] text-text-1'
                  )}
                  onClick={() => setIsAddMenuOpen((prev) => !prev)}
                  title="Add"
                  aria-label="Add"
                >
                  <Plus size={16} aria-hidden="true" strokeWidth={1.5} />
                </button>

                {isAddMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl border border-stroke/15 bg-surface-solid p-2 shadow-[var(--shadow-2)]">
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-1 hover:bg-surface-hover/[0.12]"
                      onClick={() => {
                        document.getElementById('image-upload')?.click()
                        setIsAddMenuOpen(false)
                      }}
                    >
                      <Paperclip size={16} className="text-text-3" />
                      Add photos & files
                    </button>
                    <div className="mt-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm text-text-1 hover:bg-surface-hover/[0.12]">
                      <div className="flex items-center gap-2">
                        <ListTodo size={16} className="text-text-3" />
                        Plan mode
                      </div>
                      <button
                        className={cn(
                          'relative h-5 w-10 rounded-full transition-colors',
                          planModeEnabled ? 'bg-primary/80' : 'bg-surface-hover/[0.2]'
                        )}
                        onClick={() => setPlanModeEnabled((prev) => !prev)}
                        aria-label="Toggle plan mode"
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 h-4 w-4 rounded-full bg-switch-knob shadow transition-transform',
                            planModeEnabled ? 'translate-x-5' : 'translate-x-0.5'
                          )}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div ref={modelMenuRef} className="relative">
                <button
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium text-text-2 transition-colors hover:bg-surface-hover/[0.08] hover:text-text-1',
                    isModelMenuOpen && 'bg-surface-hover/[0.12] text-text-1'
                  )}
                  onClick={() => setIsModelMenuOpen((prev) => !prev)}
                  title="Model and reasoning"
                  aria-label="Model and reasoning"
                  aria-expanded={isModelMenuOpen}
                  aria-haspopup="listbox"
                >
                  <span className="text-text-1">{modelLabel}</span>
                  {reasoningLabel && <span className="text-text-3">{reasoningLabel}</span>}
                  <ChevronDown size={14} className={cn('text-text-3 transition-transform', isModelMenuOpen && 'rotate-180')} strokeWidth={1.5} />
                </button>

                {isModelMenuOpen && (
                  <div
                    className="absolute bottom-full left-0 mb-2 w-72 max-h-80 overflow-y-auto rounded-xl border border-stroke/15 bg-surface-solid p-1.5 shadow-[var(--shadow-2)]"
                    role="listbox"
                    aria-label="Select model"
                  >
                    {models.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-text-3">Loading models...</div>
                    ) : (
                      models.map((model) => {
                        const isSelected = model.id === (modelOverride || settings.model) || model.model === (modelOverride || settings.model)
                        const isReasoning = modelSupportsReasoning(model)
                        return (
                          <button
                            key={model.id}
                            role="option"
                            aria-selected={isSelected}
                            className={cn(
                              'flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover/[0.08]',
                              isSelected && 'bg-surface-hover/[0.06]'
                            )}
                            onClick={() => handleSelectModel(model.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-text-1 font-medium truncate">{model.displayName || model.model}</span>
                                {isReasoning && (
                                  <span className="shrink-0 rounded px-1 py-0.5 text-[10px] font-medium bg-primary/15 text-primary">
                                    reasoning
                                  </span>
                                )}
                              </div>
                              {model.description && (
                                <p className="mt-0.5 text-xs text-text-3 truncate">{model.description}</p>
                              )}
                            </div>
                            {isSelected && <Check size={16} className="shrink-0 mt-0.5 text-primary" />}
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div ref={approvalMenuRef} className="relative">
                <button
                  className={cn(
                    'h-8 w-8 flex items-center justify-center rounded-full transition-colors hover:bg-surface-hover/[0.12]',
                    currentApprovalConfig.color,
                    isApprovalMenuOpen && 'bg-surface-hover/[0.14]'
                  )}
                  onClick={() => setIsApprovalMenuOpen((prev) => !prev)}
                  title={`Approval policy: ${currentApprovalConfig.label}`}
                  aria-label={`Approval policy: ${currentApprovalConfig.label}`}
                  aria-expanded={isApprovalMenuOpen}
                  aria-haspopup="listbox"
                >
                  <Shield size={16} strokeWidth={1.5} />
                </button>

                {isApprovalMenuOpen && (
                  <div
                    className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-stroke/15 bg-surface-solid p-1.5 shadow-[var(--shadow-2)]"
                    role="listbox"
                    aria-label="Select approval policy"
                  >
                    {(['on-request', 'on-failure', 'never'] as const).map((policy) => {
                      const config = approvalPolicyConfig[policy]
                      const isSelected = settings.approvalPolicy === policy
                      const IconComp = config.icon
                      return (
                        <button
                          key={policy}
                          role="option"
                          aria-selected={isSelected}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover/[0.08]',
                            isSelected && 'bg-surface-hover/[0.06]'
                          )}
                          onClick={() => handleSelectApproval(policy)}
                        >
                          <IconComp size={16} className={cn('shrink-0', config.color)} />
                          <div className="flex-1 min-w-0">
                            <div className="text-text-1 font-medium">{config.label}</div>
                            <div className="text-xs text-text-3">{config.description}</div>
                          </div>
                          {isSelected && <Check size={16} className="shrink-0 text-primary" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              {voiceSupported && (
                <button
                  className={cn(
                    'h-8 w-8 flex items-center justify-center rounded-full transition-colors',
                    isListening
                      ? 'text-status-error bg-status-error-muted voice-recording'
                      : 'text-text-3 hover:bg-surface-hover/[0.12] hover:text-text-1'
                  )}
                  onClick={toggleVoice}
                  title={isListening ? 'Stop recording (Ctrl+M)' : 'Voice input (Ctrl+M)'}
                  aria-label={isListening ? 'Stop voice recording' : 'Start voice recording'}
                >
                  {isListening ? <MicOff size={16} strokeWidth={1.5} /> : <Mic size={16} strokeWidth={1.5} />}
                </button>
              )}
              <SendButton
                turnStatus={turnStatus}
                canSend={!!canSend}
                onSend={handleSendWithHistory}
                onInterrupt={interrupt}
              />
            </div>
          </div>
        </div>

        {gitBranch && (
          <div className="flex justify-end items-center mt-3 px-2">
            <div ref={branchMenuRef} className="relative">
              <button
                className={cn(
                  'flex items-center gap-1.5 text-[12px] font-medium text-text-3 rounded-md px-1.5 py-0.5 transition-colors hover:bg-surface-hover/[0.08] hover:text-text-2',
                  isBranchMenuOpen && 'bg-surface-hover/[0.1] text-text-2'
                )}
                onClick={() => setIsBranchMenuOpen((prev) => !prev)}
                title="Switch branch"
                aria-label="Switch branch"
                aria-expanded={isBranchMenuOpen}
                aria-haspopup="listbox"
              >
                <GitBranch size={14} />
                <span>{gitBranch}</span>
                <ChevronDown size={12} className={cn('transition-transform', isBranchMenuOpen && 'rotate-180')} />
              </button>

              {isBranchMenuOpen && (
                <div
                  className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-stroke/15 bg-surface-solid shadow-[var(--shadow-2)]"
                  role="listbox"
                  aria-label="Select branch"
                >
                  <div className="p-2 border-b border-stroke/15">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3" />
                      <input
                        ref={branchSearchRef}
                        type="text"
                        className="w-full rounded-lg bg-surface-hover/[0.08] py-1.5 pl-8 pr-3 text-xs text-text-1 placeholder:text-text-3/70 focus:outline-none focus:ring-1 focus:ring-primary/30"
                        placeholder="Find a branch..."
                        value={branchSearch}
                        onChange={(e) => setBranchSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto p-1.5">
                    {filteredBranches.length === 0 ? (
                      <div className="px-3 py-3 text-center text-xs text-text-3">
                        {branchSearch ? 'No matching branches' : 'Loading branches...'}
                      </div>
                    ) : (
                      filteredBranches.map((branch) => (
                        <button
                          key={branch.name}
                          role="option"
                          aria-selected={branch.isCurrent}
                          disabled={branch.isCurrent || isSwitchingBranch}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-surface-hover/[0.08]',
                            branch.isCurrent && 'bg-surface-hover/[0.06]',
                            isSwitchingBranch && !branch.isCurrent && 'opacity-50'
                          )}
                          onClick={() => void handleSelectBranch(branch.name)}
                        >
                          <span className={cn('flex-1 truncate', branch.isCurrent ? 'text-text-1 font-medium' : 'text-text-2')}>
                            {branch.name}
                          </span>
                          {branch.isCurrent && <Check size={14} className="shrink-0 text-primary" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <InputStatusHint />
      </div>
    </div>
  )
})
