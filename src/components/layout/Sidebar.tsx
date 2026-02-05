/**
 * Sidebar - Main coordinator component for project/session navigation
 *
 * Refactored from 802 lines to ~180 lines by extracting sub-components:
 * - SidebarTabs: Tab switcher UI
 * - SessionSearch: Search input with debounce
 * - ProjectList: Project cards with context menu
 * - SessionList: Session cards with sorting and context menu
 * - SidebarDialogs: All dialog components
 * - useSidebarDialogs: Dialog state management hook
 */

import { useEffect, useCallback, useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { Download, MessageSquarePlus, Zap, Layers, Settings, FolderPlus, Filter } from 'lucide-react'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { log } from '../../lib/logger'
import { useProjectsStore } from '../../stores/projects'
import { useSessionsStore } from '../../stores/sessions'
import { useAppStore } from '../../stores/app'
import { useThreadStore } from '../../stores/thread'
import { useSettingsStore, mergeProjectSettings, getEffectiveWorkingDirectory } from '../../stores/settings'
import { useToast } from '../ui/Toast'
import { SessionSearch, GroupedSessionList, SidebarDialogs, useSidebarDialogs } from './sidebar/index'
import { ImportCodexSessionDialog } from '../LazyComponents'
import type { CodexSessionSummary } from '../../lib/api'

export function Sidebar() {
  const { setSidebarTab: setActiveTab } = useAppStore()
  const { projects, selectedProjectId, addProject, selectProject } = useProjectsStore()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const {
    sessions,
    selectedSessionId,
    isLoading: sessionsLoading,
    searchQuery,
    searchResults,
    isSearching,
    selectSession,
    fetchSessions,
  } = useSessionsStore()
  const closeAllThreads = useThreadStore((state) => state.closeAllThreads)
  const startThread = useThreadStore((state) => state.startThread)
  const settings = useSettingsStore((state) => state.settings)
  const { showToast } = useToast()
  const dialogs = useSidebarDialogs()

  useEffect(() => {
    if (selectedProjectId) void fetchSessions(selectedProjectId)
  }, [fetchSessions, selectedProjectId])

  const displaySessions = searchQuery ? searchResults : sessions

  const handleSelectSession = useCallback((sessionId: string | null, sessionProjectId?: string) => {
    if (sessionProjectId && sessionProjectId !== selectedProjectId) {
      closeAllThreads()
      selectProject(sessionProjectId)
    }
    selectSession(sessionId)
  }, [closeAllThreads, selectProject, selectSession, selectedProjectId])

  const handleAddProject = async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Select Project Folder' })
      if (selected && typeof selected === 'string') {
        await addProject(selected)
        showToast('Project added successfully', 'success')
      }
    } catch (error) {
      log.error(`Failed to add project: ${error}`, 'Sidebar')
      showToast('Failed to add project', 'error')
    }
  }

  const handleNewSession = async () => {
    if (!selectedProjectId) { showToast('Please select a project first', 'error'); return }
    const project = projects.find((p) => p.id === selectedProjectId)
    if (!project) return
    const effective = mergeProjectSettings(settings, project.settingsJson)
    const cwd = getEffectiveWorkingDirectory(project.path, project.settingsJson)
    try {
      selectSession(null)
      await startThread(selectedProjectId, cwd, effective.model, effective.sandboxMode, effective.approvalPolicy)
      const newThread = useThreadStore.getState().activeThread
      if (newThread) selectSession(newThread.id)
      await fetchSessions(selectedProjectId)
      setActiveTab('sessions')
      showToast('New session started', 'success')
    } catch (error) {
      log.error(`Failed to start new session: ${error}`, 'Sidebar')
      showToast('Failed to start new session', 'error')
    }
  }

  const handleImportSession = useCallback(async (session: CodexSessionSummary) => {
    // Find or create project for the imported session's cwd
    let projectId = projects.find((p) => p.path === session.cwd)?.id

    if (!projectId) {
      // Auto-add the project if it doesn't exist
      try {
        const newProject = await addProject(session.cwd)
        projectId = newProject.id
        showToast(`Project "${session.projectName}" added`, 'success')
      } catch (error) {
        log.error(`Failed to add project for imported session: ${error}`, 'Sidebar')
        showToast('Failed to add project for imported session', 'error')
        return
      }
    }

    // Select the project and switch to sessions tab
    selectProject(projectId)
    setActiveTab('sessions')

    // Start a new thread that resumes from the imported session
    const project = projects.find((p) => p.id === projectId) ?? { path: session.cwd, settingsJson: null }
    const effective = mergeProjectSettings(settings, project.settingsJson)
    const cwd = getEffectiveWorkingDirectory(project.path, project.settingsJson)

    try {
      // Resume the CLI session by starting a thread with the session ID
      selectSession(null)
      await startThread(projectId, cwd, effective.model, effective.sandboxMode, effective.approvalPolicy)

      // Get the new thread and try to resume the CLI session
      const resumeThread = useThreadStore.getState().resumeThread
      const newThread = useThreadStore.getState().activeThread
      if (newThread) {
        try {
          // Try to resume the imported session
          await resumeThread(session.id)
          selectSession(session.id)
          showToast('Session imported and resumed', 'success')
        } catch {
          // If resume fails, just use the new session
          selectSession(newThread.id)
          showToast('Session imported (started new)', 'info')
        }
      }

      await fetchSessions(projectId)
    } catch (error) {
      log.error(`Failed to import session: ${error}`, 'Sidebar')
      showToast('Failed to import session', 'error')
    }
  }, [projects, addProject, selectProject, setActiveTab, settings, startThread, fetchSessions, selectSession, showToast])

  return (
    <div className="flex h-full w-64 flex-col border-r border-stroke/10 bg-surface">
      <nav className="px-2 pt-4 space-y-1">
        <button
          onClick={handleNewSession}
          disabled={!selectedProjectId}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-surface-hover/[0.08] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MessageSquarePlus size={20} className="text-text-3" />
          <span className="text-text-1">New thread</span>
        </button>
        <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-surface-hover/[0.08] cursor-pointer transition-colors justify-between">
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-text-3" />
            <span className="text-text-1">Automations</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 bg-surface-hover/[0.12] rounded text-text-3 font-semibold">1</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-surface-hover/[0.08] cursor-pointer transition-colors">
          <Layers size={20} className="text-text-3" />
          <span className="text-text-1">Skills</span>
        </div>
      </nav>

      <div className="pt-6 pb-2 px-4 flex items-center justify-between">
        <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Threads</span>
        <div className="flex gap-1">
          <IconButton
            onClick={handleAddProject}
            size="sm"
            title="Add project folder"
          >
            <FolderPlus size={16} />
          </IconButton>
          <IconButton size="sm" title="Filter">
            <Filter size={16} />
          </IconButton>
        </div>
      </div>

      <SessionSearch visible={true} />

      <div className="flex-1 overflow-y-auto px-2">
        <GroupedSessionList
          sessions={displaySessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={handleSelectSession}
          isLoading={sessionsLoading || isSearching}
        />
      </div>

      <div className="p-4 border-t border-stroke/10 space-y-2">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => setImportDialogOpen(true)}
          title="Import from Codex CLI"
        >
          <Download size={16} />
          Import
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
        >
          <Settings size={20} className="text-text-3" />
          <span>Settings</span>
        </Button>
      </div>

      <SidebarDialogs
        renameDialogOpen={dialogs.renameDialogOpen}
        projectToRename={dialogs.projectToRename}
        onConfirmRename={dialogs.handleConfirmRename}
        onCancelRenameProject={dialogs.cancelRenameProject}
        sessionRenameDialogOpen={dialogs.sessionRenameDialogOpen}
        sessionToRename={dialogs.sessionToRename}
        onConfirmSessionRename={dialogs.handleConfirmSessionRename}
        onCancelRenameSession={dialogs.cancelRenameSession}
        projectSettingsOpen={dialogs.projectSettingsOpen}
        projectSettingsId={dialogs.projectSettingsId}
        onCloseProjectSettings={dialogs.closeProjectSettings}
        deleteProjectConfirm={dialogs.deleteProjectConfirm}
        onConfirmDeleteProject={dialogs.confirmDeleteProject}
        onCancelDeleteProject={dialogs.cancelDeleteProject}
        deleteSessionConfirm={dialogs.deleteSessionConfirm}
        onConfirmDeleteSession={dialogs.confirmDeleteSession}
        onCancelDeleteSession={dialogs.cancelDeleteSession}
      />
      <ImportCodexSessionDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportSession}
      />
    </div>
  )
}
