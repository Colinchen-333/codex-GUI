import { useProjectsStore } from '../stores/projects'
import { useSessionsStore } from '../stores/sessions'
import { useThreadStore } from '../stores/thread'
import { useAppStore } from '../stores/app'
import { useUndoRedoStore } from '../stores/undoRedo'
import {
  createEmptyThreadState,
  defaultTokenUsage,
  defaultTurnTiming,
} from '../stores/thread/utils/helpers'

declare global {
  interface Window {
    __CODEX_DEV__?: {
      stores?: {
        useProjectsStore: typeof useProjectsStore
        useSessionsStore: typeof useSessionsStore
        useThreadStore: typeof useThreadStore
        useAppStore: typeof useAppStore
        useUndoRedoStore: typeof useUndoRedoStore
      }
      threadHelpers?: {
        createEmptyThreadState: typeof createEmptyThreadState
        defaultTokenUsage: typeof defaultTokenUsage
        defaultTurnTiming: typeof defaultTurnTiming
      }
    }
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__CODEX_DEV__ = {
    ...(window.__CODEX_DEV__ ?? {}),
    stores: {
      useProjectsStore,
      useSessionsStore,
      useThreadStore,
      useAppStore,
      useUndoRedoStore,
    },
    threadHelpers: {
      createEmptyThreadState,
      defaultTokenUsage,
      defaultTurnTiming,
    },
  }
}
