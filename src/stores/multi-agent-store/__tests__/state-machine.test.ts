import { describe, it, expect } from 'vitest'
import {
  canAgentTransition,
  canPhaseTransition,
  canWorkflowTransition,
  isPhaseTerminal,
  isPhaseAwaitingAction,
  isWorkflowTerminal,
  isWorkflowRecoverable,
  classifyError,
  getDecisionPriority,
  sortDecisionsByPriority,
  type PendingDecision,
} from '../state-machine'

describe('Agent State Machine', () => {
  describe('canAgentTransition', () => {
    it('allows pending → running', () => {
      expect(canAgentTransition('pending', 'running')).toBe(true)
    })

    it('allows pending → cancelled', () => {
      expect(canAgentTransition('pending', 'cancelled')).toBe(true)
    })

    it('allows pending → error (dependency failed)', () => {
      expect(canAgentTransition('pending', 'error')).toBe(true)
    })

    it('allows running → completed', () => {
      expect(canAgentTransition('running', 'completed')).toBe(true)
    })

    it('allows running → error', () => {
      expect(canAgentTransition('running', 'error')).toBe(true)
    })

    it('allows running → cancelled', () => {
      expect(canAgentTransition('running', 'cancelled')).toBe(true)
    })

    it('allows running → pending (pause)', () => {
      expect(canAgentTransition('running', 'pending')).toBe(true)
    })

    it('allows error → pending (retry)', () => {
      expect(canAgentTransition('error', 'pending')).toBe(true)
    })

    it('allows cancelled → pending (retry)', () => {
      expect(canAgentTransition('cancelled', 'pending')).toBe(true)
    })

    it('disallows completed → any', () => {
      expect(canAgentTransition('completed', 'pending')).toBe(false)
      expect(canAgentTransition('completed', 'running')).toBe(false)
      expect(canAgentTransition('completed', 'error')).toBe(false)
      expect(canAgentTransition('completed', 'cancelled')).toBe(false)
    })

    it('disallows pending → completed (must go through running)', () => {
      expect(canAgentTransition('pending', 'completed')).toBe(false)
    })
  })
})

describe('Phase State Machine', () => {
  describe('canPhaseTransition', () => {
    it('allows pending → running', () => {
      expect(canPhaseTransition('pending', 'running')).toBe(true)
    })

    it('allows running → awaiting_approval', () => {
      expect(canPhaseTransition('running', 'awaiting_approval')).toBe(true)
    })

    it('allows running → completed (no approval required)', () => {
      expect(canPhaseTransition('running', 'completed')).toBe(true)
    })

    it('allows running → failed', () => {
      expect(canPhaseTransition('running', 'failed')).toBe(true)
    })

    it('allows awaiting_approval → completed (approved)', () => {
      expect(canPhaseTransition('awaiting_approval', 'completed')).toBe(true)
    })

    it('allows awaiting_approval → failed (rejected)', () => {
      expect(canPhaseTransition('awaiting_approval', 'failed')).toBe(true)
    })

    it('allows awaiting_approval → approval_timeout', () => {
      expect(canPhaseTransition('awaiting_approval', 'approval_timeout')).toBe(true)
    })

    it('allows approval_timeout → awaiting_approval (recover)', () => {
      expect(canPhaseTransition('approval_timeout', 'awaiting_approval')).toBe(true)
    })

    it('allows approval_timeout → completed (approved after timeout)', () => {
      expect(canPhaseTransition('approval_timeout', 'completed')).toBe(true)
    })

    it('allows approval_timeout → failed (rejected after timeout)', () => {
      expect(canPhaseTransition('approval_timeout', 'failed')).toBe(true)
    })

    it('allows failed → pending (retry)', () => {
      expect(canPhaseTransition('failed', 'pending')).toBe(true)
    })

    it('disallows completed → any', () => {
      expect(canPhaseTransition('completed', 'pending')).toBe(false)
      expect(canPhaseTransition('completed', 'running')).toBe(false)
      expect(canPhaseTransition('completed', 'failed')).toBe(false)
    })

    it('disallows pending → completed (must go through running)', () => {
      expect(canPhaseTransition('pending', 'completed')).toBe(false)
    })
  })

  describe('isPhaseTerminal', () => {
    it('returns true for completed', () => {
      expect(isPhaseTerminal('completed')).toBe(true)
    })

    it('returns true for failed', () => {
      expect(isPhaseTerminal('failed')).toBe(true)
    })

    it('returns false for running', () => {
      expect(isPhaseTerminal('running')).toBe(false)
    })

    it('returns false for awaiting_approval', () => {
      expect(isPhaseTerminal('awaiting_approval')).toBe(false)
    })

    it('returns false for approval_timeout', () => {
      expect(isPhaseTerminal('approval_timeout')).toBe(false)
    })
  })

  describe('isPhaseAwaitingAction', () => {
    it('returns true for awaiting_approval', () => {
      expect(isPhaseAwaitingAction('awaiting_approval')).toBe(true)
    })

    it('returns true for approval_timeout', () => {
      expect(isPhaseAwaitingAction('approval_timeout')).toBe(true)
    })

    it('returns false for running', () => {
      expect(isPhaseAwaitingAction('running')).toBe(false)
    })

    it('returns false for completed', () => {
      expect(isPhaseAwaitingAction('completed')).toBe(false)
    })
  })
})

describe('Workflow State Machine', () => {
  describe('canWorkflowTransition', () => {
    it('allows pending → running', () => {
      expect(canWorkflowTransition('pending', 'running')).toBe(true)
    })

    it('allows running → completed', () => {
      expect(canWorkflowTransition('running', 'completed')).toBe(true)
    })

    it('allows running → failed', () => {
      expect(canWorkflowTransition('running', 'failed')).toBe(true)
    })

    it('allows running → cancelled', () => {
      expect(canWorkflowTransition('running', 'cancelled')).toBe(true)
    })

    it('allows failed → running (retry)', () => {
      expect(canWorkflowTransition('failed', 'running')).toBe(true)
    })

    it('allows cancelled → running (recover)', () => {
      expect(canWorkflowTransition('cancelled', 'running')).toBe(true)
    })

    it('disallows completed → any', () => {
      expect(canWorkflowTransition('completed', 'pending')).toBe(false)
      expect(canWorkflowTransition('completed', 'running')).toBe(false)
      expect(canWorkflowTransition('completed', 'failed')).toBe(false)
    })
  })

  describe('isWorkflowTerminal', () => {
    it('returns true for completed', () => {
      expect(isWorkflowTerminal('completed')).toBe(true)
    })

    it('returns true for failed', () => {
      expect(isWorkflowTerminal('failed')).toBe(true)
    })

    it('returns true for cancelled', () => {
      expect(isWorkflowTerminal('cancelled')).toBe(true)
    })

    it('returns false for running', () => {
      expect(isWorkflowTerminal('running')).toBe(false)
    })
  })

  describe('isWorkflowRecoverable', () => {
    it('returns true for failed', () => {
      expect(isWorkflowRecoverable('failed')).toBe(true)
    })

    it('returns true for cancelled', () => {
      expect(isWorkflowRecoverable('cancelled')).toBe(true)
    })

    it('returns false for completed', () => {
      expect(isWorkflowRecoverable('completed')).toBe(false)
    })

    it('returns false for running', () => {
      expect(isWorkflowRecoverable('running')).toBe(false)
    })
  })
})

describe('Error Classification', () => {
  describe('classifyError', () => {
    it('classifies DEPENDENCY_TIMEOUT as recoverable', () => {
      const result = classifyError('DEPENDENCY_TIMEOUT', 'Dependency wait timed out', { agentId: 'a1' })
      expect(result.severity).toBe('recoverable')
      expect(result.canRetry).toBe(true)
      expect(result.canRecover).toBe(true)
      expect(result.domain).toBe('agent')
    })

    it('classifies DEPENDENCY_FAILED as recoverable', () => {
      const result = classifyError('DEPENDENCY_FAILED', 'Dependency failed', { agentId: 'a1' })
      expect(result.severity).toBe('recoverable')
      expect(result.canRetry).toBe(true)
    })

    it('classifies PAUSE_TIMEOUT as recoverable', () => {
      const result = classifyError('PAUSE_TIMEOUT', 'Pause timed out', { agentId: 'a1' })
      expect(result.severity).toBe('recoverable')
    })

    it('classifies APP_RESTART_LOST_CONNECTION as recoverable', () => {
      const result = classifyError('APP_RESTART_LOST_CONNECTION', 'Connection lost', { agentId: 'a1' })
      expect(result.severity).toBe('recoverable')
    })

    it('classifies NETWORK_ERROR as transient', () => {
      const result = classifyError('NETWORK_ERROR', 'Network failed')
      expect(result.severity).toBe('transient')
      expect(result.canRetry).toBe(true)
    })

    it('classifies unknown errors as terminal', () => {
      const result = classifyError('UNKNOWN_ERROR', 'Something went wrong')
      expect(result.severity).toBe('terminal')
      expect(result.canRetry).toBe(false)
      expect(result.canRecover).toBe(false)
    })

    it('detects agent domain from context', () => {
      const result = classifyError('SOME_ERROR', 'Error', { agentId: 'a1' })
      expect(result.domain).toBe('agent')
    })

    it('detects phase domain from context', () => {
      const result = classifyError('SOME_ERROR', 'Error', { phaseId: 'p1' })
      expect(result.domain).toBe('phase')
    })

    it('detects workflow domain from code prefix', () => {
      const result = classifyError('WORKFLOW_FAILED', 'Workflow error')
      expect(result.domain).toBe('workflow')
    })
  })
})

describe('Decision Priority', () => {
  describe('getDecisionPriority', () => {
    it('gives highest priority to safety_approval', () => {
      expect(getDecisionPriority('safety_approval')).toBe(1)
    })

    it('gives second priority to phase_approval', () => {
      expect(getDecisionPriority('phase_approval')).toBe(2)
    })

    it('gives third priority to timeout_recovery', () => {
      expect(getDecisionPriority('timeout_recovery')).toBe(3)
    })

    it('gives lowest priority to error_recovery', () => {
      expect(getDecisionPriority('error_recovery')).toBe(4)
    })
  })

  describe('sortDecisionsByPriority', () => {
    it('sorts decisions by priority (lowest number first)', () => {
      const decisions: PendingDecision[] = [
        { type: 'error_recovery', priority: 4, id: '1', label: 'Error', description: '', actions: [] },
        { type: 'safety_approval', priority: 1, id: '2', label: 'Safety', description: '', actions: [] },
        { type: 'phase_approval', priority: 2, id: '3', label: 'Phase', description: '', actions: [] },
      ]

      const sorted = sortDecisionsByPriority(decisions)

      expect(sorted[0].type).toBe('safety_approval')
      expect(sorted[1].type).toBe('phase_approval')
      expect(sorted[2].type).toBe('error_recovery')
    })

    it('does not mutate original array', () => {
      const decisions: PendingDecision[] = [
        { type: 'error_recovery', priority: 4, id: '1', label: 'Error', description: '', actions: [] },
        { type: 'safety_approval', priority: 1, id: '2', label: 'Safety', description: '', actions: [] },
      ]

      const sorted = sortDecisionsByPriority(decisions)

      expect(decisions[0].type).toBe('error_recovery')
      expect(sorted[0].type).toBe('safety_approval')
    })
  })
})
