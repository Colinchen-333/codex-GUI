/**
 * Card utilities and constants
 *
 * Shared utilities for card components including status configuration,
 * formatting functions, and style utilities.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type CardStatus = 'pending' | 'running' | 'completed' | 'failed' | 'warning'

// -----------------------------------------------------------------------------
// Status Configuration
// -----------------------------------------------------------------------------

interface StatusConfig {
  borderColor: string
  dotColor: string
  textColor: string
  badgeBg: string
}

export const STATUS_CONFIG: Record<CardStatus, StatusConfig> = {
  pending: {
    borderColor: 'border-l-stroke/40',
    dotColor: 'bg-text-3/60',
    textColor: 'text-text-3',
    badgeBg: 'bg-surface-hover/[0.06]',
  },
  running: {
    borderColor: 'border-l-status-info',
    dotColor: 'bg-status-info',
    textColor: 'text-status-info',
    badgeBg: 'bg-status-info-muted',
  },
  completed: {
    borderColor: 'border-l-status-success',
    dotColor: 'bg-status-success',
    textColor: 'text-status-success',
    badgeBg: 'bg-status-success-muted',
  },
  failed: {
    borderColor: 'border-l-status-error',
    dotColor: 'bg-status-error',
    textColor: 'text-status-error',
    badgeBg: 'bg-status-error-muted',
  },
  warning: {
    borderColor: 'border-l-status-warning',
    dotColor: 'bg-status-warning',
    textColor: 'text-status-warning',
    badgeBg: 'bg-status-warning-muted',
  },
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Get border color based on status or custom color
 */
export function getBorderClass(status?: CardStatus, customColor?: string): string {
  if (customColor) return customColor
  if (status && STATUS_CONFIG[status]) {
    return `border-l-4 ${STATUS_CONFIG[status].borderColor} border-y-stroke/20 border-r-stroke/20`
  }
  return 'border-stroke/20'
}

/**
 * Format duration in ms to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

/**
 * Get status config for a given status
 */
export function getStatusConfig(status: CardStatus): StatusConfig | undefined {
  return STATUS_CONFIG[status]
}
