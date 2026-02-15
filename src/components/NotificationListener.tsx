/**
 * NotificationListener
 *
 * Invisible component that listens to thread events via the eventBus
 * and sends desktop notifications when the app is not focused.
 *
 * Notification triggers:
 * - Turn completed (task_completed)
 * - Approval requested (approval_needed)
 * - Turn failed (error)
 */

import { useEffect } from 'react'
import { eventBus } from '../lib/eventBus'
import { useNotifications } from '../hooks/useNotifications'
import { useThreadStore } from '../stores/thread'

export function NotificationListener() {
  const { sendNotification, requestPermission, permission, isSupported } = useNotifications()

  // Request permission on mount if not yet decided
  useEffect(() => {
    if (isSupported && permission === 'default') {
      void requestPermission()
    }
  }, [isSupported, permission, requestPermission])

  // Listen to thread status changes for notifications
  useEffect(() => {
    const unsubStatus = eventBus.on('thread:status-change', (event) => {
      if (event.status === 'completed') {
        sendNotification(
          'task_completed',
          'Task Completed',
          'The agent has finished processing your request.'
        )
      } else if (event.status === 'failed') {
        sendNotification(
          'error',
          'Task Failed',
          'An error occurred while processing your request.'
        )
      }
    })

    const unsubSessionStatus = eventBus.on('session:status-update', (event) => {
      if (event.status === 'completed') {
        sendNotification(
          'task_completed',
          'Task Completed',
          'The agent has finished processing your request.'
        )
      } else if (event.status === 'failed') {
        sendNotification(
          'error',
          'Task Failed',
          'An error occurred while processing your request.'
        )
      }
    })

    return () => {
      unsubStatus()
      unsubSessionStatus()
    }
  }, [sendNotification])

  // We also need to detect approval requests from the thread store.
  // Use a subscription to the thread store for pending approvals.
  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    let prevCount = 0

    unsubscribe = useThreadStore.subscribe((state) => {
      // Count all pending approvals across all threads
      let totalApprovals = 0
      Object.values(state.threads).forEach((threadState) => {
        totalApprovals += threadState.pendingApprovals.length
      })

      // Only notify when count increases (new approval)
      if (totalApprovals > prevCount) {
        sendNotification(
          'approval_needed',
          'Approval Needed',
          'The agent needs your approval to proceed.'
        )
      }
      prevCount = totalApprovals
    })

    return () => {
      unsubscribe?.()
    }
  }, [sendNotification])

  // This component renders nothing
  return null
}
