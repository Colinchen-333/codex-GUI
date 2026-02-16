import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useUndoRedo,
  createMessageOperationState,
  createSnapshotOperationState,
  createClearThreadOperationState,
} from '../useUndoRedo'
import type { AnyThreadItem } from '../../stores/thread/types'
import type { UndoableOperation } from '../../stores/undoRedo'

const mockToast = {
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}

const mockUndoRedoState = {
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: vi.fn(),
  canRedo: vi.fn(),
  clearHistory: vi.fn(),
  pushOperation: vi.fn(),
}

const mockThreadState = {
  focusedThreadId: 'thread-1',
  threads: {
    'thread-1': { thread: { id: 'thread-1' }, items: {}, itemOrder: [] },
  },
  deleteMessage: vi.fn(),
  addItemBack: vi.fn(),
  restoreItemOrder: vi.fn(),
  restoreMessageContent: vi.fn(),
  restoreThreadState: vi.fn(),
}

vi.mock('../../stores/undoRedo', () => ({
  useUndoRedoStore: vi.fn(),
  OPERATION_DESCRIPTIONS: {
    sendMessage: 'Send message',
    deleteMessage: 'Delete message',
    editMessage: 'Edit message',
    revertSnapshot: 'Restore snapshot',
    clearThread: 'Clear thread',
  },
}))

vi.mock('../../stores/thread', () => ({
  useThreadStore: vi.fn(),
}))

vi.mock('../../components/ui/useToast', () => ({
  useToast: vi.fn(() => ({ toast: mockToast })),
}))

import { useUndoRedoStore } from '../../stores/undoRedo'
import { useThreadStore } from '../../stores/thread'

describe('useUndoRedo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUndoRedoState.canUndo.mockReturnValue(false)
    mockUndoRedoState.canRedo.mockReturnValue(false)
    mockUndoRedoState.undo.mockReturnValue(null)
    mockUndoRedoState.redo.mockReturnValue(null)

    vi.mocked(useUndoRedoStore).mockImplementation((selector: unknown) => {
      if (typeof selector === 'function') {
        return (selector as (s: typeof mockUndoRedoState) => unknown)(mockUndoRedoState)
      }
      return mockUndoRedoState
    })

    Object.defineProperty(useUndoRedoStore, 'getState', {
      value: () => mockUndoRedoState,
      writable: true,
    })

    vi.mocked(useThreadStore).mockImplementation((selector: unknown) => {
      if (typeof selector === 'function') {
        return (selector as (s: typeof mockThreadState) => unknown)(mockThreadState)
      }
      return mockThreadState
    })

    Object.defineProperty(useThreadStore, 'getState', {
      value: () => mockThreadState,
      writable: true,
    })
  })

  describe('hook return value', () => {
    it('should return undo, redo, canUndo, canRedo, recordOperation, and clearHistory', () => {
      const { result } = renderHook(() => useUndoRedo())

      expect(typeof result.current.undo).toBe('function')
      expect(typeof result.current.redo).toBe('function')
      expect(typeof result.current.canUndo).toBe('function')
      expect(typeof result.current.canRedo).toBe('function')
      expect(typeof result.current.recordOperation).toBe('function')
      expect(typeof result.current.clearHistory).toBe('function')
    })
  })

  describe('undo', () => {
    it('should show toast when nothing to undo', () => {
      mockUndoRedoState.canUndo.mockReturnValue(false)

      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.undo()
      })

      expect(mockToast.info).toHaveBeenCalledWith('Nothing to undo', {
        message: 'There are no operations to undo.',
      })
    })

    it('should call undo and show success toast', () => {
      const operation: UndoableOperation = {
        id: 'op-1',
        type: 'deleteMessage',
        timestamp: Date.now(),
        description: 'Delete message',
        previousState: { itemId: 'msg-1', itemData: { id: 'msg-1', type: 'userMessage', content: { text: 'test' }, createdAt: Date.now() } },
        threadId: 'thread-1',
      }
      mockUndoRedoState.canUndo.mockReturnValue(true)
      mockUndoRedoState.undo.mockReturnValue(operation)

      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.undo()
      })

      expect(mockUndoRedoState.undo).toHaveBeenCalled()
      expect(mockToast.success).toHaveBeenCalledWith('Undo successful', {
        message: 'Undone: Delete message',
      })
    })

    it('should perform delete message undo by restoring the message', () => {
      const itemData = { id: 'msg-1', type: 'userMessage', content: { text: 'restored' }, createdAt: Date.now() }
      const operation: UndoableOperation = {
        id: 'op-1',
        type: 'deleteMessage',
        timestamp: Date.now(),
        description: 'Delete message',
        previousState: { itemId: 'msg-1', itemData, itemOrder: ['msg-1', 'msg-2'] },
        threadId: 'thread-1',
      }
      mockUndoRedoState.canUndo.mockReturnValue(true)
      mockUndoRedoState.undo.mockReturnValue(operation)

      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.undo()
      })

      expect(mockThreadState.addItemBack).toHaveBeenCalledWith('msg-1', itemData, 'thread-1')
      expect(mockThreadState.restoreItemOrder).toHaveBeenCalledWith(['msg-1', 'msg-2'], 'thread-1')
    })

    it('should perform send message undo by deleting the message', () => {
      const operation: UndoableOperation = {
        id: 'op-1',
        type: 'sendMessage',
        timestamp: Date.now(),
        description: 'Send message',
        previousState: { itemId: 'msg-1' },
        threadId: 'thread-1',
      }
      mockUndoRedoState.canUndo.mockReturnValue(true)
      mockUndoRedoState.undo.mockReturnValue(operation)

      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.undo()
      })

      expect(mockThreadState.deleteMessage).toHaveBeenCalledWith('msg-1', 'thread-1')
    })

    it('should perform edit message undo by restoring content', () => {
      const itemData = { id: 'msg-1', type: 'userMessage', content: { text: 'original' }, createdAt: Date.now() }
      const operation: UndoableOperation = {
        id: 'op-1',
        type: 'editMessage',
        timestamp: Date.now(),
        description: 'Edit message',
        previousState: { itemId: 'msg-1', itemData },
        threadId: 'thread-1',
      }
      mockUndoRedoState.canUndo.mockReturnValue(true)
      mockUndoRedoState.undo.mockReturnValue(operation)

      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.undo()
      })

      expect(mockThreadState.restoreMessageContent).toHaveBeenCalledWith('msg-1', itemData, 'thread-1')
    })

    it('should show info toast for revertSnapshot undo', () => {
      const operation: UndoableOperation = {
        id: 'op-1',
        type: 'revertSnapshot',
        timestamp: Date.now(),
        description: 'Restore snapshot',
        previousState: { snapshotState: { snapshotId: 'snap-1' } },
        threadId: 'thread-1',
      }
      mockUndoRedoState.canUndo.mockReturnValue(true)
      mockUndoRedoState.undo.mockReturnValue(operation)

      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.undo()
      })

      expect(mockToast.info).toHaveBeenCalledWith('Snapshot undo not supported', expect.any(Object))
      expect(mockToast.success).not.toHaveBeenCalledWith(
        'Undo successful',
        expect.any(Object)
      )
    })

    it('should perform clearThread undo by restoring thread state', () => {
      const threadState = { items: { 'msg-1': {} }, itemOrder: ['msg-1'] }
      const operation: UndoableOperation = {
        id: 'op-1',
        type: 'clearThread',
        timestamp: Date.now(),
        description: 'Clear thread',
        previousState: { threadState },
        threadId: 'thread-1',
      }
      mockUndoRedoState.canUndo.mockReturnValue(true)
      mockUndoRedoState.undo.mockReturnValue(operation)

      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.undo()
      })

      expect(mockThreadState.restoreThreadState).toHaveBeenCalledWith(threadState, 'thread-1')
    })
  })

  describe('redo', () => {
    it('should show toast when nothing to redo', () => {
      mockUndoRedoState.canRedo.mockReturnValue(false)

      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.redo()
      })

      expect(mockToast.info).toHaveBeenCalledWith('Nothing to redo', {
        message: 'There are no operations to redo.',
      })
    })

    it('should call redo and show success toast', () => {
      const operation: UndoableOperation = {
        id: 'op-1',
        type: 'deleteMessage',
        timestamp: Date.now(),
        description: 'Delete message',
        previousState: { itemId: 'msg-1' },
        threadId: 'thread-1',
      }
      mockUndoRedoState.canRedo.mockReturnValue(true)
      mockUndoRedoState.redo.mockReturnValue(operation)

      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.redo()
      })

      expect(mockUndoRedoState.redo).toHaveBeenCalled()
      expect(mockToast.success).toHaveBeenCalledWith('Redo successful', {
        message: 'Redone: Delete message',
      })
    })

    it('should perform delete message redo by deleting the message again', () => {
      const operation: UndoableOperation = {
        id: 'op-1',
        type: 'deleteMessage',
        timestamp: Date.now(),
        description: 'Delete message',
        previousState: { itemId: 'msg-1' },
        threadId: 'thread-1',
      }
      mockUndoRedoState.canRedo.mockReturnValue(true)
      mockUndoRedoState.redo.mockReturnValue(operation)

      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.redo()
      })

      expect(mockThreadState.deleteMessage).toHaveBeenCalledWith('msg-1', 'thread-1')
    })

    it('should show info toast for sendMessage redo', () => {
      const operation: UndoableOperation = {
        id: 'op-1',
        type: 'sendMessage',
        timestamp: Date.now(),
        description: 'Send message',
        previousState: {},
        threadId: 'thread-1',
      }
      mockUndoRedoState.canRedo.mockReturnValue(true)
      mockUndoRedoState.redo.mockReturnValue(operation)

      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.redo()
      })

      expect(mockToast.info).toHaveBeenCalledWith('Message resend', expect.any(Object))
      expect(mockToast.success).not.toHaveBeenCalledWith(
        'Redo successful',
        expect.any(Object)
      )
    })

    it('should show info toast for editMessage redo', () => {
      const operation: UndoableOperation = {
        id: 'op-1',
        type: 'editMessage',
        timestamp: Date.now(),
        description: 'Edit message',
        previousState: {},
        threadId: 'thread-1',
      }
      mockUndoRedoState.canRedo.mockReturnValue(true)
      mockUndoRedoState.redo.mockReturnValue(operation)

      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.redo()
      })

      expect(mockToast.info).toHaveBeenCalledWith('Edit redo', expect.any(Object))
      expect(mockToast.success).not.toHaveBeenCalledWith(
        'Redo successful',
        expect.any(Object)
      )
    })
  })

  describe('recordOperation', () => {
    it('should not record when no focused thread', () => {
      vi.mocked(useThreadStore).mockImplementation((selector: unknown) => {
        const state = { ...mockThreadState, focusedThreadId: null }
        if (typeof selector === 'function') {
          return (selector as (s: typeof state) => unknown)(state)
        }
        return state
      })

      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.recordOperation('sendMessage', { itemId: 'msg-1' })
      })

      expect(mockUndoRedoState.pushOperation).not.toHaveBeenCalled()
    })

    it('should record operation with default description', () => {
      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.recordOperation('sendMessage', { itemId: 'msg-1' })
      })

      expect(mockUndoRedoState.pushOperation).toHaveBeenCalledWith({
        type: 'sendMessage',
        description: 'Send message',
        previousState: { itemId: 'msg-1' },
        threadId: 'thread-1',
      })
    })

    it('should record operation with custom description', () => {
      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.recordOperation('sendMessage', { itemId: 'msg-1' }, 'Custom description')
      })

      expect(mockUndoRedoState.pushOperation).toHaveBeenCalledWith({
        type: 'sendMessage',
        description: 'Custom description',
        previousState: { itemId: 'msg-1' },
        threadId: 'thread-1',
      })
    })
  })

  describe('clearHistory', () => {
    it('should call clearHistory from store', () => {
      const { result } = renderHook(() => useUndoRedo())

      act(() => {
        result.current.clearHistory()
      })

      expect(mockUndoRedoState.clearHistory).toHaveBeenCalled()
    })
  })
})

describe('helper functions', () => {
  describe('createMessageOperationState', () => {
    it('should create operation state for message', () => {
      const itemData: AnyThreadItem = {
        id: 'msg-1',
        type: 'agentMessage',
        status: 'completed',
        content: { text: 'hello', isStreaming: false },
        createdAt: 12345,
      }

      const state = createMessageOperationState('msg-1', itemData, ['msg-1', 'msg-2'])

      expect(state).toEqual({
        itemId: 'msg-1',
        itemData: {
          id: 'msg-1',
          type: 'agentMessage',
          content: { text: 'hello', isStreaming: false },
          createdAt: 12345,
          editState: undefined,
        },
        itemOrder: ['msg-1', 'msg-2'],
      })
    })

    it('should include editState for userMessage', () => {
      const itemData = {
        id: 'msg-1',
        type: 'userMessage' as const,
        status: 'completed' as const,
        content: { text: 'hello' },
        createdAt: 12345,
        editState: { isEditing: true, editedText: 'edited' },
      }

      const state = createMessageOperationState('msg-1', itemData)

      expect(state.itemData?.editState).toEqual({ isEditing: true, editedText: 'edited' })
    })
  })

  describe('createSnapshotOperationState', () => {
    it('should create operation state for snapshot', () => {
      const state = createSnapshotOperationState('snap-1', 'snap-0')

      expect(state).toEqual({
        snapshotState: {
          snapshotId: 'snap-1',
          previousSnapshotId: 'snap-0',
        },
      })
    })

    it('should handle undefined previousSnapshotId', () => {
      const state = createSnapshotOperationState('snap-1')

      expect(state).toEqual({
        snapshotState: {
          snapshotId: 'snap-1',
          previousSnapshotId: undefined,
        },
      })
    })
  })

  describe('createClearThreadOperationState', () => {
    it('should create operation state for clear thread', () => {
      const items = { 'msg-1': { id: 'msg-1', type: 'userMessage', content: { text: '' }, status: 'completed', createdAt: 0 } } as Record<string, AnyThreadItem>
      const itemOrder = ['msg-1']

      const state = createClearThreadOperationState(items, itemOrder)

      expect(state).toEqual({
        threadState: {
          items,
          itemOrder,
        },
      })
    })
  })
})
