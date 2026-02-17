import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFileChangeApproval } from '../useFileChangeApproval'
import type { FileChangeContentType } from '../../components/chat/types'

const mockRespondToApproval = vi.fn()
const mockCreateSnapshot = vi.fn()
const mockRevertToSnapshot = vi.fn()
const mockShowToast = vi.fn()

vi.mock('../../stores/thread', () => {
  return {
    useThreadStore: vi.fn(),
    selectFocusedThread: vi.fn((state: unknown) => state),
  }
})

vi.mock('../../stores/projects', () => ({
  useProjectsStore: vi.fn(),
}))

vi.mock('../../components/ui/Toast', () => ({
  useToast: vi.fn(() => ({ showToast: mockShowToast })),
}))

vi.mock('../../lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { useThreadStore, selectFocusedThread } from '../../stores/thread'
import { useProjectsStore } from '../../stores/projects'

function createMockContent(overrides: Partial<FileChangeContentType> = {}): FileChangeContentType {
  return {
    path: '/test/file.ts',
    content: 'test content',
    diff: '+ new line',
    operation: 'modify',
    needsApproval: true,
    ...overrides,
  } as FileChangeContentType
}

describe('useFileChangeApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRespondToApproval.mockResolvedValue(undefined)
    mockCreateSnapshot.mockResolvedValue({ id: 'snapshot-123' })
    mockRevertToSnapshot.mockResolvedValue(undefined)

    const mockState = {
      thread: { id: 'thread-1', messages: [] },
      respondToApproval: mockRespondToApproval,
      createSnapshot: mockCreateSnapshot,
      revertToSnapshot: mockRevertToSnapshot,
    }

    vi.mocked(selectFocusedThread).mockReturnValue({ thread: { id: 'thread-1' } } as ReturnType<typeof selectFocusedThread>)

    const mockThreadStore = vi.mocked(useThreadStore)
    mockThreadStore.mockImplementation((selector: unknown) => {
      if (selector === selectFocusedThread) {
        return { thread: { id: 'thread-1' } }
      }
      if (typeof selector === 'function') {
        return (selector as (s: typeof mockState) => unknown)(mockState)
      }
      return mockState
    })

    Object.defineProperty(useThreadStore, 'getState', {
      value: () => ({
        thread: { id: 'thread-1' },
        threads: {
          'thread-1': {
            pendingApprovals: [{ itemId: 'item-1', createdAt: Date.now() }],
          },
        },
      }),
      writable: true,
    })

    const mockProjectsStore = vi.mocked(useProjectsStore)
    mockProjectsStore.mockImplementation((selector: unknown) => {
      const state = {
        projects: [{ id: 'proj-1', path: '/test/project' }],
        selectedProjectId: 'proj-1',
      }
      if (typeof selector === 'function') {
        return (selector as (s: typeof state) => unknown)(state)
      }
      return state
    })
  })

  describe('initial state', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent(),
        })
      )

      expect(result.current.isApplying).toBe(false)
      expect(result.current.isReverting).toBe(false)
      expect(result.current.isDeclining).toBe(false)
      expect(typeof result.current.handleApplyChanges).toBe('function')
      expect(typeof result.current.handleRevert).toBe('function')
      expect(typeof result.current.handleDecline).toBe('function')
      expect(typeof result.current.handleManualRollback).toBe('function')
    })
  })

  describe('handleApplyChanges', () => {
    it('should call respondToApproval with accept decision', async () => {
      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent(),
        })
      )

      await act(async () => {
        await result.current.handleApplyChanges()
      })

      expect(mockCreateSnapshot).toHaveBeenCalledWith('/test/project')
      expect(mockRespondToApproval).toHaveBeenCalledWith('item-1', 'accept', { snapshotId: 'snapshot-123' })
    })

    it('should call respondToApproval with acceptForSession decision', async () => {
      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent(),
        })
      )

      await act(async () => {
        await result.current.handleApplyChanges('acceptForSession')
      })

      expect(mockRespondToApproval).toHaveBeenCalledWith('item-1', 'acceptForSession', { snapshotId: 'snapshot-123' })
    })

    it('should continue even if snapshot creation fails', async () => {
      mockCreateSnapshot.mockRejectedValueOnce(new Error('Snapshot failed'))

      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent(),
        })
      )

      await act(async () => {
        await result.current.handleApplyChanges()
      })

      expect(mockShowToast).toHaveBeenCalledWith(
        'Could not create snapshot (changes will still be applied)',
        'warning'
      )
      expect(mockRespondToApproval).toHaveBeenCalled()
    })

    it('should use explicit projectPath when provided', async () => {
      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent(),
          projectPath: '/explicit/path',
        })
      )

      await act(async () => {
        await result.current.handleApplyChanges()
      })

      expect(mockCreateSnapshot).toHaveBeenCalledWith('/explicit/path')
    })

    it('should not apply when no active thread', async () => {
      vi.mocked(useThreadStore).mockImplementation((selector: unknown) => {
        if (selector === selectFocusedThread) {
          return { thread: null }
        }
        const state = {
          thread: null,
          respondToApproval: mockRespondToApproval,
          createSnapshot: mockCreateSnapshot,
          revertToSnapshot: mockRevertToSnapshot,
        }
        if (typeof selector === 'function') {
          return (selector as (s: typeof state) => unknown)(state)
        }
        return state
      })

      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent(),
        })
      )

      await act(async () => {
        await result.current.handleApplyChanges()
      })

      expect(mockRespondToApproval).not.toHaveBeenCalled()
    })

    it('should not apply when no project path', async () => {
      vi.mocked(useProjectsStore).mockImplementation((selector: unknown) => {
        const state = {
          projects: [],
          selectedProjectId: null,
        }
        if (typeof selector === 'function') {
          return (selector as (s: typeof state) => unknown)(state)
        }
        return state
      })

      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent(),
        })
      )

      await act(async () => {
        await result.current.handleApplyChanges()
      })

      expect(mockRespondToApproval).not.toHaveBeenCalled()
    })
  })

  describe('handleRevert', () => {
    it('should call revertToSnapshot with correct params', async () => {
      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent({ snapshotId: 'snap-123' }),
        })
      )

      await act(async () => {
        await result.current.handleRevert()
      })

      expect(mockRevertToSnapshot).toHaveBeenCalledWith('snap-123', '/test/project')
      expect(mockShowToast).toHaveBeenCalledWith('Changes reverted successfully', 'success')
    })

    it('should not revert when no snapshotId', async () => {
      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent({ snapshotId: undefined }),
        })
      )

      await act(async () => {
        await result.current.handleRevert()
      })

      expect(mockRevertToSnapshot).not.toHaveBeenCalled()
    })

    it('should show error toast on revert failure', async () => {
      mockRevertToSnapshot.mockRejectedValueOnce(new Error('Revert failed'))

      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent({ snapshotId: 'snap-123' }),
        })
      )

      await act(async () => {
        await result.current.handleRevert()
      })

      expect(mockShowToast).toHaveBeenCalledWith('Failed to revert changes', 'error')
    })

    it('should set and reset isReverting state', async () => {
      let resolveRevert: () => void
      mockRevertToSnapshot.mockImplementationOnce(
        () => new Promise<void>((resolve) => { resolveRevert = resolve })
      )

      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent({ snapshotId: 'snap-123' }),
        })
      )

      let revertPromise: Promise<void>
      act(() => {
        revertPromise = result.current.handleRevert()
      })

      expect(result.current.isReverting).toBe(true)

      await act(async () => {
        resolveRevert!()
        await revertPromise
      })

      expect(result.current.isReverting).toBe(false)
    })
  })

  describe('handleDecline', () => {
    it('should call respondToApproval with decline', async () => {
      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent(),
        })
      )

      await act(async () => {
        await result.current.handleDecline()
      })

      expect(mockRespondToApproval).toHaveBeenCalledWith('item-1', 'decline')
    })

    it('should not decline when no active thread', async () => {
      vi.mocked(useThreadStore).mockImplementation((selector: unknown) => {
        if (selector === selectFocusedThread) {
          return { thread: null }
        }
        const state = {
          thread: null,
          respondToApproval: mockRespondToApproval,
          createSnapshot: mockCreateSnapshot,
          revertToSnapshot: mockRevertToSnapshot,
        }
        if (typeof selector === 'function') {
          return (selector as (s: typeof state) => unknown)(state)
        }
        return state
      })

      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent(),
        })
      )

      await act(async () => {
        await result.current.handleDecline()
      })

      expect(mockRespondToApproval).not.toHaveBeenCalled()
    })

    it('should set and reset isDeclining state', async () => {
      let resolveDecline: () => void
      mockRespondToApproval.mockImplementationOnce(
        () => new Promise<void>((resolve) => { resolveDecline = resolve })
      )

      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent(),
        })
      )

      let declinePromise: Promise<void>
      act(() => {
        declinePromise = result.current.handleDecline()
      })

      expect(result.current.isDeclining).toBe(true)

      await act(async () => {
        resolveDecline!()
        await declinePromise
      })

      expect(result.current.isDeclining).toBe(false)
    })
  })

  describe('handleManualRollback', () => {
    it('should show toast when manually rolling back', () => {
      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent(),
        })
      )

      act(() => {
        result.current.handleManualRollback()
      })

      expect(mockShowToast).toHaveBeenCalledWith('Changes rolled back', 'info')
    })
  })

  describe('double-click protection', () => {
    it('should prevent double revert', async () => {
      let resolveFirst: () => void
      mockRevertToSnapshot
        .mockImplementationOnce(() => new Promise<void>((resolve) => { resolveFirst = resolve }))
        .mockImplementationOnce(() => Promise.resolve())

      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent({ snapshotId: 'snap-123' }),
        })
      )

      act(() => {
        void result.current.handleRevert()
        void result.current.handleRevert()
      })

      await act(async () => {
        resolveFirst!()
      })

      await waitFor(() => {
        expect(mockRevertToSnapshot).toHaveBeenCalledTimes(1)
      })
    })

    it('should prevent double decline', async () => {
      let resolveFirst: () => void
      mockRespondToApproval
        .mockImplementationOnce(() => new Promise<void>((resolve) => { resolveFirst = resolve }))
        .mockImplementationOnce(() => Promise.resolve())

      const { result } = renderHook(() =>
        useFileChangeApproval({
          itemId: 'item-1',
          content: createMockContent(),
        })
      )

      act(() => {
        void result.current.handleDecline()
        void result.current.handleDecline()
      })

      await act(async () => {
        resolveFirst!()
      })

      await waitFor(() => {
        expect(mockRespondToApproval).toHaveBeenCalledTimes(1)
      })
    })
  })
})
