import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChatInputArea from '../ChatInputArea'
import React from 'react'

// Mock external dependencies
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

vi.mock('../../../stores/thread', () => ({
  useThreadStore: vi.fn((selector) => {
    const state = {
      focusedThreadId: null,
      threads: {},
      pendingApprovals: [],
      queuedMessages: [],
      sessionOverrides: {},
      interrupt: vi.fn(),
    }
    return typeof selector === 'function' ? selector(state) : state
  }),
  selectFocusedThread: vi.fn(() => null),
}))

vi.mock('../../../stores/thread/selectors', () => ({
  selectFileChanges: vi.fn(() => []),
}))

vi.mock('../../../stores/settings', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      settings: {
        model: 'gpt-5.2-codex',
        reasoningEffort: 'medium',
        approvalPolicy: 'on-request',
      },
      updateSetting: vi.fn(),
    }
    return typeof selector === 'function' ? selector(state) : state
  }),
}))

vi.mock('../../../stores/projects', () => ({
  useProjectsStore: vi.fn((selector) => {
    const state = {
      gitInfo: {},
      fetchGitInfo: vi.fn(),
    }
    return typeof selector === 'function' ? selector(state) : state
  }),
}))

vi.mock('../../../stores/models', () => ({
  useModelsStore: vi.fn((selector) => {
    const state = {
      models: [],
      fetchModels: vi.fn(),
    }
    return typeof selector === 'function' ? selector(state) : state
  }),
  modelSupportsReasoning: vi.fn(() => false),
}))

vi.mock('../../ui/useToast', () => ({
  useToast: () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  }),
}))

vi.mock('../SlashCommandPopup', () => ({
  SlashCommandPopup: () => null,
}))

vi.mock('../FileMentionPopup', () => ({
  FileMentionPopup: () => null,
}))

vi.mock('../status', () => ({
  WorkingStatusBar: () => null,
  QueuedMessagesDisplay: () => null,
  RateLimitWarning: () => null,
  InputStatusHint: () => null,
}))

vi.mock('../useInputHooks', () => ({
  useInputPopups: () => ({
    showSlashCommands: false,
    setShowSlashCommands: vi.fn(),
    showFileMention: false,
    setShowFileMention: vi.fn(),
    fileMentionQuery: '',
    mentionStartPos: 0,
    restoreFocus: vi.fn(),
  }),
  useTextareaResize: vi.fn(),
  useFocusInput: vi.fn(),
  useFileMentionHandler: () => ({
    handleFileMentionSelect: vi.fn(),
  }),
}))

vi.mock('../../../hooks/useCommandHistory', () => ({
  useCommandHistory: () => ({
    handleHistoryKeyDown: vi.fn(),
    addToHistory: vi.fn(),
    resetHistoryCursor: vi.fn(),
    clearHistory: vi.fn(),
  }),
}))

vi.mock('../../../hooks/useVoiceInput', () => ({
  useVoiceInput: () => ({
    isListening: false,
    transcript: '',
    error: null,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    isSupported: false,
  }),
}))

vi.mock('../../../lib/api', () => ({
  projectApi: {
    getGitBranches: vi.fn().mockResolvedValue([]),
  },
  terminalApi: {
    execute: vi.fn().mockResolvedValue(''),
  },
}))

vi.mock('../../../lib/logger', () => ({
  log: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

function createDefaultProps(): React.ComponentProps<typeof ChatInputArea> {
  return {
    inputValue: '',
    setInputValue: vi.fn(),
    attachedImages: [],
    setAttachedImages: vi.fn(),
    isDragging: false,
    onSend: vi.fn().mockResolvedValue(undefined),
    onPaste: vi.fn(),
    handleImageFile: vi.fn(),
    inputRef: { current: null } as React.RefObject<HTMLTextAreaElement | null>,
    projects: [{ id: 'proj-1', path: '/test/project' }],
    selectedProjectId: 'proj-1',
  }
}

describe('ChatInputArea', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the message composer form', () => {
      render(<ChatInputArea {...createDefaultProps()} />)
      expect(screen.getByRole('form', { name: 'Message composer' })).toBeInTheDocument()
    })

    it('renders the textarea with correct aria-label', () => {
      render(<ChatInputArea {...createDefaultProps()} />)
      expect(screen.getByLabelText('Message input')).toBeInTheDocument()
    })

    it('renders the send button', () => {
      render(<ChatInputArea {...createDefaultProps()} />)
      expect(screen.getByLabelText('Send message')).toBeInTheDocument()
    })

    it('shows default placeholder when idle', () => {
      render(<ChatInputArea {...createDefaultProps()} />)
      expect(screen.getByPlaceholderText('Message Codex...')).toBeInTheDocument()
    })

    it('renders the Add button', () => {
      render(<ChatInputArea {...createDefaultProps()} />)
      expect(screen.getByLabelText('Add')).toBeInTheDocument()
    })

    it('renders the model selector button', () => {
      render(<ChatInputArea {...createDefaultProps()} />)
      expect(screen.getByLabelText('Model and reasoning')).toBeInTheDocument()
    })

    it('renders the approval policy button', () => {
      render(<ChatInputArea {...createDefaultProps()} />)
      expect(screen.getByLabelText(/Approval policy/)).toBeInTheDocument()
    })
  })

  describe('text input', () => {
    it('calls setInputValue on text change', () => {
      const setInputValue = vi.fn()
      render(<ChatInputArea {...createDefaultProps()} setInputValue={setInputValue} />)
      fireEvent.change(screen.getByLabelText('Message input'), { target: { value: 'hello' } })
      expect(setInputValue).toHaveBeenCalled()
    })

    it('calls onSend when Enter is pressed without Shift', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined)
      render(<ChatInputArea {...createDefaultProps()} inputValue="test" onSend={onSend} />)
      fireEvent.keyDown(screen.getByLabelText('Message input'), { key: 'Enter' })
      // onSend is called asynchronously through handleSendWithHistory
      expect(onSend).toHaveBeenCalled()
    })

    it('does not call onSend when Shift+Enter is pressed', () => {
      const onSend = vi.fn().mockResolvedValue(undefined)
      render(<ChatInputArea {...createDefaultProps()} inputValue="test" onSend={onSend} />)
      fireEvent.keyDown(screen.getByLabelText('Message input'), { key: 'Enter', shiftKey: true })
      expect(onSend).not.toHaveBeenCalled()
    })
  })

  describe('send button', () => {
    it('send button is disabled when input is empty', () => {
      render(<ChatInputArea {...createDefaultProps()} />)
      expect(screen.getByLabelText('Send message')).toBeDisabled()
    })

    it('send button is enabled when input has text', () => {
      render(<ChatInputArea {...createDefaultProps()} inputValue="hello" />)
      expect(screen.getByLabelText('Send message')).not.toBeDisabled()
    })

    it('send button is enabled when images are attached', () => {
      render(<ChatInputArea {...createDefaultProps()} attachedImages={['data:image/png;base64,abc']} />)
      expect(screen.getByLabelText('Send message')).not.toBeDisabled()
    })
  })

  describe('image preview', () => {
    it('renders attached images', () => {
      render(<ChatInputArea {...createDefaultProps()} attachedImages={['data:image/png;base64,abc']} />)
      expect(screen.getByAltText('Attached 1')).toBeInTheDocument()
    })

    it('renders remove button for each image', () => {
      render(<ChatInputArea {...createDefaultProps()} attachedImages={['data:image/png;base64,abc', 'data:image/png;base64,def']} />)
      expect(screen.getByLabelText('Remove image 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Remove image 2')).toBeInTheDocument()
    })

    it('calls setAttachedImages when image is removed', () => {
      const setAttachedImages = vi.fn()
      render(
        <ChatInputArea
          {...createDefaultProps()}
          attachedImages={['data:image/png;base64,abc']}
          setAttachedImages={setAttachedImages}
        />
      )
      fireEvent.click(screen.getByLabelText('Remove image 1'))
      expect(setAttachedImages).toHaveBeenCalled()
    })
  })

  describe('add menu', () => {
    it('opens add menu when plus button is clicked', () => {
      render(<ChatInputArea {...createDefaultProps()} />)
      fireEvent.click(screen.getByLabelText('Add'))
      expect(screen.getByText('Add photos & files')).toBeInTheDocument()
    })

    it('closes add menu on second click', () => {
      render(<ChatInputArea {...createDefaultProps()} />)
      fireEvent.click(screen.getByLabelText('Add'))
      expect(screen.getByText('Add photos & files')).toBeInTheDocument()
      fireEvent.click(screen.getByLabelText('Add'))
      expect(screen.queryByText('Add photos & files')).not.toBeInTheDocument()
    })
  })

  describe('drag state', () => {
    it('applies drag styling when isDragging is true', () => {
      const { container } = render(<ChatInputArea {...createDefaultProps()} isDragging={true} />)
      const inputContainer = container.querySelector('.scale-\\[1\\.01\\]')
      expect(inputContainer).toBeInTheDocument()
    })
  })

  describe('focus behavior', () => {
    it('handles focus and blur on textarea', () => {
      render(<ChatInputArea {...createDefaultProps()} />)
      const textarea = screen.getByLabelText('Message input')
      fireEvent.focus(textarea)
      fireEvent.blur(textarea)
      // Should not throw
    })
  })
})
