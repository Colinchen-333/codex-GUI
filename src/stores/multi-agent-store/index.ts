/**
 * Multi-Agent Store v2 - Protocol-native multi-agent system
 *
 * Modular architecture with separate concerns:
 * - types.ts: State and config type definitions
 * - constants.ts: Timeout values, policies, defaults
 * - helpers.ts: Pure utility functions
 * - persistence.ts: localStorage serialization
 * - state-machine.ts: State transitions and error classification
 * - selectors.ts: State selectors
 * - actions/: Modular action slices
 *   - agent-actions.ts: Agent lifecycle management
 *   - workflow-actions.ts: Workflow orchestration
 *   - timer-actions.ts: Timeout management
 *   - recovery-actions.ts: Error recovery and retry
 *   - config-actions.ts: Configuration and reset
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'

import type { MultiAgentState } from './types'
import { DEFAULT_CONFIG } from './constants'
import {
  STORAGE_NAME,
  STORAGE_VERSION,
  createMultiAgentStorage,
  partializeState,
  createOnRehydrateHandler,
} from './persistence'

import { createSelectors } from './selectors'
import { createAgentActions } from './actions/agent-actions'
import { createWorkflowActions } from './actions/workflow-actions'
import { createTimerActions } from './actions/timer-actions'
import { createRecoveryActions } from './actions/recovery-actions'
import { createConfigActions } from './actions/config-actions'

// Re-export types for backward compatibility
export type {
  MultiAgentState,
  MultiAgentConfig,
} from './types'

export type {
  AgentStatus,
  AgentProgress,
  AgentError,
  AgentConfigOverrides,
  AgentDescriptor,
  WorkflowPhaseStatus,
  WorkflowPhase,
  Workflow,
  WorkflowExecutionContext,
  AgentType,
} from '../../lib/workflows/types'

export {
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
  type ClassifiedError,
  type PendingDecision,
  type DecisionType,
  type ErrorDomain,
  type ErrorSeverity,
} from './state-machine'

export const useMultiAgentStore = create<MultiAgentState>()(
  persist(
    immer((set, get, api) => ({
      // ==================== Initial State ====================
      config: DEFAULT_CONFIG,
      workingDirectory: '',
      agents: {},
      agentOrder: [],
      agentMapping: {},
      workflow: null,
      previousPhaseOutput: undefined,
      phaseCompletionInFlight: null,
      approvalInFlight: {},
      approvalTimeouts: {},
      pauseInFlight: {},
      dependencyWaitTimeouts: {},
      pauseTimeouts: {},
      phaseOperationVersion: 0,
      restartRecoveryInFlight: false,

      // ==================== Compose Action Slices ====================
      ...createConfigActions(set, get, api),
      ...createSelectors(set, get, api),
      ...createTimerActions(set, get, api),
      ...createAgentActions(set, get, api),
      ...createWorkflowActions(set, get, api),
      ...createRecoveryActions(set, get, api),
    })),
    {
      name: STORAGE_NAME,
      version: STORAGE_VERSION,
      storage: createMultiAgentStorage(),
      partialize: partializeState,
      onRehydrateStorage: (): ((state: MultiAgentState | undefined) => void) => createOnRehydrateHandler(() => useMultiAgentStore.getState()),
    }
  )
)
