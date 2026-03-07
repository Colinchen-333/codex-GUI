import { create } from 'zustand'

export type CollaborationRole = 'owner' | 'follower' | 'none'
export type CollaborationMode = 'watch' | 'suggest' | 'co-pilot' | 'full-control'

export interface Follower {
  id: string
  name: string
  role: CollaborationRole
  mode: CollaborationMode
  joinedAt: number
}

interface CollaborationState {
  // Current thread's collaboration state
  activeThreadId: string | null
  role: CollaborationRole
  mode: CollaborationMode
  followers: Follower[]
  isFollowing: boolean
  followingThreadId: string | null

  // Actions
  setRole: (role: CollaborationRole) => void
  setMode: (mode: CollaborationMode) => void
  startFollowing: (threadId: string) => void
  stopFollowing: () => void
  addFollower: (follower: Follower) => void
  removeFollower: (followerId: string) => void
  setActiveThread: (threadId: string | null) => void
  reset: () => void
}

const initialState = {
  activeThreadId: null,
  role: 'none' as CollaborationRole,
  mode: 'watch' as CollaborationMode,
  followers: [] as Follower[],
  isFollowing: false,
  followingThreadId: null,
}

export const useCollaborationStore = create<CollaborationState>()((set) => ({
  ...initialState,

  setRole: (role) => set({ role }),
  setMode: (mode) => set({ mode }),

  startFollowing: (threadId) =>
    set({
      isFollowing: true,
      followingThreadId: threadId,
      role: 'follower',
    }),

  stopFollowing: () =>
    set({
      isFollowing: false,
      followingThreadId: null,
      role: 'none',
      mode: 'watch',
    }),

  addFollower: (follower) =>
    set((state) => ({
      followers: [...state.followers.filter((f) => f.id !== follower.id), follower],
    })),

  removeFollower: (followerId) =>
    set((state) => ({
      followers: state.followers.filter((f) => f.id !== followerId),
    })),

  setActiveThread: (threadId) => set({ activeThreadId: threadId }),

  reset: () => set(initialState),
}))
