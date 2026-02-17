/**
 * useFileChangeApproval Hook
 *
 * Encapsulates all business logic for file change approval operations including:
 * - Apply changes with optimistic update
 * - Revert to snapshot
 * - Decline changes
 *
 * This hook provides a clean separation between UI rendering and business logic
 * for the FileChangeCard component.
 */

import { useState, useRef, useCallback } from 'react'
import { useThreadStore, selectFocusedThread, type ThreadState } from '../stores/thread'
import { useProjectsStore } from '../stores/projects'
import { useToast } from '../components/ui/Toast'
import { useOptimisticUpdate } from './useOptimisticUpdate'
import { log } from '../lib/logger'
import { focusNextApprovalInThreadOrInput } from '../lib/approvalNav'
import type { FileChangeContentType } from '../components/chat/types'

/**
 * Optimistic update state type for apply changes operation
 */
interface ApplyChangesOptimisticState {
  snapshotId?: string
  previousApprovalState: boolean
}

/**
 * Options for the useFileChangeApproval hook
 */
export interface UseFileChangeApprovalOptions {
  /** The unique ID of the thread item */
  itemId: string
  /** The file change content data */
  content: FileChangeContentType
  /** The project path (optional, will be derived from selected project if not provided) */
  projectPath?: string
}

/**
 * Return type for the useFileChangeApproval hook
 */
export interface UseFileChangeApprovalReturn {
  /** Whether changes are being applied */
  isApplying: boolean
  /** Whether changes are being reverted */
  isReverting: boolean
  /** Whether changes are being declined */
  isDeclining: boolean
  /** Apply changes with optional decision type */
  handleApplyChanges: (decision?: 'accept' | 'acceptForSession') => Promise<void>
  /** Revert to the saved snapshot */
  handleRevert: () => Promise<void>
  /** Decline the proposed changes */
  handleDecline: () => Promise<void>
  /** Manual rollback function for external use */
  handleManualRollback: () => void
}

/**
 * Hook for managing file change approval operations
 *
 * @param options - Configuration options
 * @returns Approval operation handlers and state
 *
 * @example
 * ```tsx
 * const {
 *   isApplying,
 *   isReverting,
 *   handleApplyChanges,
 *   handleRevert,
 *   handleDecline,
 * } = useFileChangeApproval({
 *   itemId: item.id,
 *   content: item.content as FileChangeContentType,
 * })
 * ```
 */
export function useFileChangeApproval(
  options: UseFileChangeApprovalOptions
): UseFileChangeApprovalReturn {
  const { itemId, content, projectPath: explicitProjectPath } = options

  // Store selectors
  const focusedThread = useThreadStore(selectFocusedThread)
  const activeThread = focusedThread?.thread ?? null
  const respondToApproval = useThreadStore((state: ThreadState) => state.respondToApproval)
  const createSnapshot = useThreadStore((state: ThreadState) => state.createSnapshot)
  const revertToSnapshot = useThreadStore((state: ThreadState) => state.revertToSnapshot)
  const projects = useProjectsStore((state) => state.projects)
  const selectedProjectId = useProjectsStore((state) => state.selectedProjectId)
  const { showToast } = useToast()

  // State
  const [isReverting, setIsReverting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)

  // Refs for double-click protection (state updates are async, refs are synchronous)
  const isRevertingRef = useRef(false)
  const isDecliningRef = useRef(false)

  // Decision type ref for optimistic update
  const currentDecisionRef = useRef<'accept' | 'acceptForSession'>('accept')
  // Snapshot ID ref for rollback
  const pendingSnapshotIdRef = useRef<string | undefined>(undefined)

  // Get the project from store or use explicit path
  const project = projects.find((p) => p.id === selectedProjectId)
  const projectPath = explicitProjectPath ?? project?.path

  /**
   * Optimistic update rollback function
   * Restores state when approval operation fails
   */
  const rollbackApplyChanges = useCallback(
    (previousState: ApplyChangesOptimisticState) => {
      log.info(
        `Rolling back apply changes, snapshotId: ${previousState.snapshotId}`,
        'useFileChangeApproval'
      )

      // If a snapshot was created and rollback is needed, try to revert
      // Note: This restores UI state; actual file rollback is via revertToSnapshot
      const snapshotIdToRevert = previousState.snapshotId ?? pendingSnapshotIdRef.current
      if (snapshotIdToRevert && projectPath) {
        revertToSnapshot(snapshotIdToRevert, projectPath).catch((err) => {
          log.error(`Failed to revert snapshot during rollback: ${err}`, 'useFileChangeApproval')
        })
      }
    },
    [projectPath, revertToSnapshot]
  )

  /**
   * Optimistic update hook for managing apply changes state
   */
  const {
    execute: executeApplyChanges,
    isLoading: isApplying,
    rollback: manualRollback,
  } = useOptimisticUpdate<ApplyChangesOptimisticState, void>({
    execute: async () => {
      if (!activeThread || !projectPath) {
        throw new Error('No active thread or project')
      }

      // Capture thread ID at start to detect if it changes during async operations
      const threadIdAtStart = activeThread.id
      const approvalCreatedAtAtStart =
        useThreadStore.getState().threads[threadIdAtStart]?.pendingApprovals?.find((p) => p.itemId === itemId)?.createdAt

      // Try to create snapshot before applying changes
      let snapshotId: string | undefined
      try {
        const snapshot = await createSnapshot(projectPath)
        snapshotId = snapshot.id
        pendingSnapshotIdRef.current = snapshotId
      } catch (snapshotError) {
        log.warn(
          `Failed to create snapshot, proceeding without: ${snapshotError}`,
          'useFileChangeApproval'
        )
        showToast('Could not create snapshot (changes will still be applied)', 'warning')
      }

      // CRITICAL: Validate thread hasn't changed during snapshot creation
      const currentThread = selectFocusedThread(useThreadStore.getState())?.thread ?? null
      if (!currentThread || currentThread.id !== threadIdAtStart) {
        log.error(
          `Thread changed during apply - threadIdAtStart: ${threadIdAtStart}, currentThread: ${currentThread?.id}`,
          'useFileChangeApproval'
        )
        throw new Error('Thread changed during apply operation')
      }

      // Approve the changes (with or without snapshot ID)
      await respondToApproval(itemId, currentDecisionRef.current, { snapshotId })

      focusNextApprovalInThreadOrInput(threadIdAtStart, approvalCreatedAtAtStart)
    },
    optimisticUpdate: () => {
      // Save previous state for rollback
      const previousState: ApplyChangesOptimisticState = {
        snapshotId: pendingSnapshotIdRef.current,
        previousApprovalState: content.needsApproval ?? true,
      }
      return previousState
    },
    rollbackFn: rollbackApplyChanges,
    onSuccess: () => {
      log.info('Changes applied successfully', 'useFileChangeApproval')
    },
    onError: (error, rollback) => {
      log.error(`Failed to apply changes: ${error}`, 'useFileChangeApproval')
      showToast('Failed to apply changes, rolling back...', 'error')
      // Manual rollback trigger if auto rollback fails
      rollback()
    },
    autoRollback: true,
    operationId: `apply-changes-${itemId}`,
  })

  /**
   * Handle apply changes with decision type
   */
  const handleApplyChanges = useCallback(
    async (decision: 'accept' | 'acceptForSession' = 'accept') => {
      if (isApplying || !activeThread || !projectPath) return

      // Save decision type
      currentDecisionRef.current = decision
      pendingSnapshotIdRef.current = undefined

      await executeApplyChanges()
    },
    [isApplying, activeThread, projectPath, executeApplyChanges]
  )

  /**
   * Manual rollback handler - exposed for external use
   */
  const handleManualRollback = useCallback(() => {
    manualRollback()
    showToast('Changes rolled back', 'info')
  }, [manualRollback, showToast])

  /**
   * Handle revert to snapshot
   */
  const handleRevert = useCallback(async () => {
    if (isRevertingRef.current || !content.snapshotId || !projectPath) return
    isRevertingRef.current = true
    setIsReverting(true)
    try {
      await revertToSnapshot(content.snapshotId, projectPath)
      showToast('Changes reverted successfully', 'success')
    } catch (error) {
      log.error(`Failed to revert changes: ${error}`, 'useFileChangeApproval')
      showToast('Failed to revert changes', 'error')
    } finally {
      isRevertingRef.current = false
      setIsReverting(false)
    }
  }, [content.snapshotId, projectPath, revertToSnapshot, showToast])

  /**
   * Handle decline changes
   */
  const handleDecline = useCallback(async () => {
    if (isDecliningRef.current || !activeThread) return
    isDecliningRef.current = true
    setIsDeclining(true)
    try {
      const threadIdAtStart = activeThread.id
      const approvalCreatedAtAtStart =
        useThreadStore.getState().threads[threadIdAtStart]?.pendingApprovals?.find((p) => p.itemId === itemId)?.createdAt
      await respondToApproval(itemId, 'decline')
      focusNextApprovalInThreadOrInput(threadIdAtStart, approvalCreatedAtAtStart)
    } finally {
      isDecliningRef.current = false
      setIsDeclining(false)
    }
  }, [activeThread, itemId, respondToApproval])

  return {
    isApplying,
    isReverting,
    isDeclining,
    handleApplyChanges,
    handleRevert,
    handleDecline,
    handleManualRollback,
  }
}
