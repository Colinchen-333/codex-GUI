import { describe, it, expect } from 'vitest'
import {
  canAgentTransition,
  canPhaseTransition,
  canWorkflowTransition,
  validateAgentTransition,
  validatePhaseTransition,
  validateWorkflowTransition,
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

    // Exhaustive invalid transition tests
    it('rejects all invalid transitions from pending', () => {
      expect(canAgentTransition('pending', 'completed')).toBe(false)
      expect(canAgentTransition('pending', 'pending')).toBe(false)
    })

    it('rejects all invalid transitions from running', () => {
      expect(canAgentTransition('running', 'running')).toBe(false)
    })

    it('rejects all invalid transitions from completed (terminal state)', () => {
      expect(canAgentTransition('completed', 'pending')).toBe(false)
      expect(canAgentTransition('completed', 'running')).toBe(false)
      expect(canAgentTransition('completed', 'completed')).toBe(false)
      expect(canAgentTransition('completed', 'error')).toBe(false)
      expect(canAgentTransition('completed', 'cancelled')).toBe(false)
    })

    it('rejects all invalid transitions from error', () => {
      expect(canAgentTransition('error', 'running')).toBe(false)
      expect(canAgentTransition('error', 'completed')).toBe(false)
      expect(canAgentTransition('error', 'error')).toBe(false)
      expect(canAgentTransition('error', 'cancelled')).toBe(false)
    })

    it('rejects all invalid transitions from cancelled', () => {
      expect(canAgentTransition('cancelled', 'running')).toBe(false)
      expect(canAgentTransition('cancelled', 'completed')).toBe(false)
      expect(canAgentTransition('cancelled', 'error')).toBe(false)
      expect(canAgentTransition('cancelled', 'cancelled')).toBe(false)
    })
  })

  describe('validateAgentTransition', () => {
    it('does not throw for valid transitions', () => {
      expect(() => validateAgentTransition('pending', 'running')).not.toThrow()
      expect(() => validateAgentTransition('running', 'completed')).not.toThrow()
      expect(() => validateAgentTransition('error', 'pending')).not.toThrow()
    })

    it('throws for invalid transitions', () => {
      expect(() => validateAgentTransition('completed', 'running'))
        .toThrow('Invalid agent transition: completed → running')
      expect(() => validateAgentTransition('pending', 'completed'))
        .toThrow('Invalid agent transition: pending → completed')
      expect(() => validateAgentTransition('error', 'completed'))
        .toThrow('Invalid agent transition: error → completed')
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

    it('rejects all invalid transitions from pending', () => {
      expect(canPhaseTransition('pending', 'pending')).toBe(false)
      expect(canPhaseTransition('pending', 'completed')).toBe(false)
      expect(canPhaseTransition('pending', 'failed')).toBe(false)
      expect(canPhaseTransition('pending', 'awaiting_approval')).toBe(false)
      expect(canPhaseTransition('pending', 'approval_timeout')).toBe(false)
    })

    it('rejects all invalid transitions from running', () => {
      expect(canPhaseTransition('running', 'running')).toBe(false)
      expect(canPhaseTransition('running', 'pending')).toBe(false)
      expect(canPhaseTransition('running', 'approval_timeout')).toBe(false)
    })

    it('rejects all invalid transitions from awaiting_approval', () => {
      expect(canPhaseTransition('awaiting_approval', 'awaiting_approval')).toBe(false)
      expect(canPhaseTransition('awaiting_approval', 'pending')).toBe(false)
      expect(canPhaseTransition('awaiting_approval', 'running')).toBe(false)
    })

    it('rejects all invalid transitions from approval_timeout', () => {
      expect(canPhaseTransition('approval_timeout', 'approval_timeout')).toBe(false)
      expect(canPhaseTransition('approval_timeout', 'pending')).toBe(false)
      expect(canPhaseTransition('approval_timeout', 'running')).toBe(false)
    })

    it('rejects all invalid transitions from completed (terminal state)', () => {
      expect(canPhaseTransition('completed', 'pending')).toBe(false)
      expect(canPhaseTransition('completed', 'running')).toBe(false)
      expect(canPhaseTransition('completed', 'completed')).toBe(false)
      expect(canPhaseTransition('completed', 'failed')).toBe(false)
      expect(canPhaseTransition('completed', 'awaiting_approval')).toBe(false)
      expect(canPhaseTransition('completed', 'approval_timeout')).toBe(false)
    })

    it('rejects all invalid transitions from failed', () => {
      expect(canPhaseTransition('failed', 'running')).toBe(false)
      expect(canPhaseTransition('failed', 'completed')).toBe(false)
      expect(canPhaseTransition('failed', 'failed')).toBe(false)
      expect(canPhaseTransition('failed', 'awaiting_approval')).toBe(false)
      expect(canPhaseTransition('failed', 'approval_timeout')).toBe(false)
    })
  })

  describe('validatePhaseTransition', () => {
    it('does not throw for valid transitions', () => {
      expect(() => validatePhaseTransition('pending', 'running')).not.toThrow()
      expect(() => validatePhaseTransition('running', 'awaiting_approval')).not.toThrow()
      expect(() => validatePhaseTransition('awaiting_approval', 'completed')).not.toThrow()
    })

    it('throws for invalid transitions', () => {
      expect(() => validatePhaseTransition('completed', 'running'))
        .toThrow('Invalid phase transition: completed → running')
      expect(() => validatePhaseTransition('pending', 'completed'))
        .toThrow('Invalid phase transition: pending → completed')
      expect(() => validatePhaseTransition('failed', 'completed'))
        .toThrow('Invalid phase transition: failed → completed')
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

    it('rejects all invalid transitions from pending', () => {
      expect(canWorkflowTransition('pending', 'pending')).toBe(false)
      expect(canWorkflowTransition('pending', 'completed')).toBe(false)
      expect(canWorkflowTransition('pending', 'failed')).toBe(false)
      expect(canWorkflowTransition('pending', 'cancelled')).toBe(false)
    })

    it('rejects all invalid transitions from running', () => {
      expect(canWorkflowTransition('running', 'running')).toBe(false)
      expect(canWorkflowTransition('running', 'pending')).toBe(false)
    })

    it('rejects all invalid transitions from completed (terminal state)', () => {
      expect(canWorkflowTransition('completed', 'pending')).toBe(false)
      expect(canWorkflowTransition('completed', 'running')).toBe(false)
      expect(canWorkflowTransition('completed', 'completed')).toBe(false)
      expect(canWorkflowTransition('completed', 'failed')).toBe(false)
      expect(canWorkflowTransition('completed', 'cancelled')).toBe(false)
    })

    it('rejects all invalid transitions from failed', () => {
      expect(canWorkflowTransition('failed', 'pending')).toBe(false)
      expect(canWorkflowTransition('failed', 'completed')).toBe(false)
      expect(canWorkflowTransition('failed', 'failed')).toBe(false)
      expect(canWorkflowTransition('failed', 'cancelled')).toBe(false)
    })

    it('rejects all invalid transitions from cancelled', () => {
      expect(canWorkflowTransition('cancelled', 'pending')).toBe(false)
      expect(canWorkflowTransition('cancelled', 'completed')).toBe(false)
      expect(canWorkflowTransition('cancelled', 'failed')).toBe(false)
      expect(canWorkflowTransition('cancelled', 'cancelled')).toBe(false)
    })
  })

  describe('validateWorkflowTransition', () => {
    it('does not throw for valid transitions', () => {
      expect(() => validateWorkflowTransition('pending', 'running')).not.toThrow()
      expect(() => validateWorkflowTransition('running', 'completed')).not.toThrow()
      expect(() => validateWorkflowTransition('failed', 'running')).not.toThrow()
    })

    it('throws for invalid transitions', () => {
      expect(() => validateWorkflowTransition('completed', 'running'))
        .toThrow('Invalid workflow transition: completed → running')
      expect(() => validateWorkflowTransition('pending', 'completed'))
        .toThrow('Invalid workflow transition: pending → completed')
      expect(() => validateWorkflowTransition('failed', 'completed'))
        .toThrow('Invalid workflow transition: failed → completed')
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

describe('Cross-Module Contract: State Machine Integration', () => {
  describe('Agent Status Transitions', () => {
    it('updateAgentStatus guards against invalid transitions', () => {
      expect(canAgentTransition('completed', 'running')).toBe(false)
      expect(canAgentTransition('completed', 'pending')).toBe(false)
      expect(canAgentTransition('pending', 'completed')).toBe(false)
    })

    it('all valid agent status values are covered by transition table', () => {
      const allStatuses: Array<'pending' | 'running' | 'completed' | 'error' | 'cancelled'> = [
        'pending', 'running', 'completed', 'error', 'cancelled'
      ]

      for (const status of allStatuses) {
        expect(() => canAgentTransition(status, 'pending')).not.toThrow()
      }
    })
  })

  describe('Phase Status Transitions', () => {
    it('checkPhaseCompletion guards against terminal state transitions', () => {
      expect(isPhaseTerminal('completed')).toBe(true)
      expect(isPhaseTerminal('failed')).toBe(true)
      expect(canPhaseTransition('completed', 'running')).toBe(false)
      expect(canPhaseTransition('failed', 'running')).toBe(false)
    })

    it('all valid phase status values are covered by transition table', () => {
      const allStatuses: Array<'pending' | 'running' | 'awaiting_approval' | 'approval_timeout' | 'completed' | 'failed'> = [
        'pending', 'running', 'awaiting_approval', 'approval_timeout', 'completed', 'failed'
      ]

      for (const status of allStatuses) {
        expect(() => canPhaseTransition(status, 'pending')).not.toThrow()
      }
    })

    it('approval timeout recovery path is valid', () => {
      expect(canPhaseTransition('awaiting_approval', 'approval_timeout')).toBe(true)
      expect(canPhaseTransition('approval_timeout', 'awaiting_approval')).toBe(true)
      expect(canPhaseTransition('approval_timeout', 'completed')).toBe(true)
      expect(canPhaseTransition('approval_timeout', 'failed')).toBe(true)
    })
  })

  describe('Workflow Status Transitions', () => {
    it('cancelled workflow can be recovered', () => {
      expect(isWorkflowRecoverable('cancelled')).toBe(true)
      expect(canWorkflowTransition('cancelled', 'running')).toBe(true)
    })

    it('failed workflow can be retried', () => {
      expect(isWorkflowRecoverable('failed')).toBe(true)
      expect(canWorkflowTransition('failed', 'running')).toBe(true)
    })

    it('completed workflow cannot be modified', () => {
      expect(isWorkflowTerminal('completed')).toBe(true)
      expect(isWorkflowRecoverable('completed')).toBe(false)
      expect(canWorkflowTransition('completed', 'running')).toBe(false)
      expect(canWorkflowTransition('completed', 'pending')).toBe(false)
    })
  })

  describe('Error Classification Contract', () => {
    it('dependency errors are always recoverable', () => {
      const depTimeout = classifyError('DEPENDENCY_TIMEOUT', 'msg')
      const depFailed = classifyError('DEPENDENCY_FAILED', 'msg')
      
      expect(depTimeout.canRecover).toBe(true)
      expect(depFailed.canRecover).toBe(true)
    })

    it('transient errors allow retry but not full recovery', () => {
      const networkError = classifyError('NETWORK_ERROR', 'msg')
      const timeout = classifyError('TIMEOUT', 'msg')
      
      expect(networkError.canRetry).toBe(true)
      expect(timeout.canRetry).toBe(true)
    })

    it('spawn errors are recoverable', () => {
      const spawnFailed = classifyError('SPAWN_FAILED', 'msg')
      expect(spawnFailed.canRecover).toBe(true)
    })
  })

  describe('Decision Priority Contract', () => {
    it('safety always takes precedence over phase approval', () => {
      expect(getDecisionPriority('safety_approval')).toBeLessThan(
        getDecisionPriority('phase_approval')
      )
    })

    it('phase approval takes precedence over recovery actions', () => {
      expect(getDecisionPriority('phase_approval')).toBeLessThan(
        getDecisionPriority('timeout_recovery')
      )
      expect(getDecisionPriority('phase_approval')).toBeLessThan(
        getDecisionPriority('error_recovery')
      )
    })

    it('timeout recovery takes precedence over error recovery', () => {
      expect(getDecisionPriority('timeout_recovery')).toBeLessThan(
        getDecisionPriority('error_recovery')
      )
    })
  })
})
