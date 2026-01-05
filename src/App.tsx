import { useEffect, useState, useRef } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { MainArea } from './components/layout/MainArea'
import { StatusBar } from './components/layout/StatusBar'
import { OnboardingFlow, useNeedsOnboarding } from './components/onboarding/OnboardingFlow'
import { ToastProvider } from './components/ui/Toast'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { ConnectionStatus } from './components/ui/ConnectionStatus'
import { KeyboardShortcuts } from './components/KeyboardShortcuts'
import { useProjectsStore } from './stores/projects'
import { useThreadStore } from './stores/thread'
import { setupEventListeners, cleanupEventListeners } from './lib/events'

function App() {
  const fetchProjects = useProjectsStore((state) => state.fetchProjects)
  const needsOnboarding = useNeedsOnboarding()
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Use ref to access latest store functions without causing re-renders
  const unlistenersRef = useRef<(() => void)[]>([])
  const listenersSetupRef = useRef(false)

  // Check if onboarding is needed
  useEffect(() => {
    setShowOnboarding(needsOnboarding)
  }, [needsOnboarding])

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Setup event listeners - only once on mount
  useEffect(() => {
    // Prevent duplicate setup
    if (listenersSetupRef.current) return
    listenersSetupRef.current = true

    setupEventListeners({
      onItemStarted: (event) => useThreadStore.getState().handleItemStarted(event),
      onItemCompleted: (event) => useThreadStore.getState().handleItemCompleted(event),
      onAgentMessageDelta: (event) => useThreadStore.getState().handleAgentMessageDelta(event),
      onCommandApprovalRequested: (event) => useThreadStore.getState().handleCommandApprovalRequested(event),
      onFileChangeApprovalRequested: (event) => useThreadStore.getState().handleFileChangeApprovalRequested(event),
      onTurnCompleted: (event) => useThreadStore.getState().handleTurnCompleted(event),
      onTurnFailed: (event) => useThreadStore.getState().handleTurnFailed(event),
      onExecCommandBegin: (event) => useThreadStore.getState().handleExecCommandBegin(event),
      onExecCommandOutputDelta: (event) => useThreadStore.getState().handleExecCommandOutputDelta(event),
      onExecCommandEnd: (event) => useThreadStore.getState().handleExecCommandEnd(event),
      onServerDisconnected: () => {
        console.log('Server disconnected')
        // TODO: Show reconnection UI
      },
    }).then((listeners) => {
      unlistenersRef.current = listeners
    })

    return () => {
      cleanupEventListeners(unlistenersRef.current)
      listenersSetupRef.current = false
    }
  }, []) // Empty deps - only run once

  // Show onboarding flow if needed
  if (showOnboarding) {
    return (
      <ToastProvider>
        <OnboardingFlow
          onComplete={() => {
            setShowOnboarding(false)
            fetchProjects()
          }}
        />
      </ToastProvider>
    )
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <KeyboardShortcuts />
        <div className="flex h-screen w-screen overflow-hidden bg-background p-3 gap-3">
          {/* Left Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-sm border border-border/50 relative">
            <MainArea />
            <StatusBar />
          </div>
        </div>
        <ConnectionStatus />
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
