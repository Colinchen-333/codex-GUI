import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { StandaloneLayout } from './components/layout/StandaloneLayout'
import { AnnouncementPage } from './pages/AnnouncementPage'
import { DebugPage } from './pages/DebugPage'
import { DiffPage } from './pages/DiffPage'
import { FilePreviewPage } from './pages/FilePreviewPage'
import { FirstRunPage } from './pages/FirstRunPage'
import { InboxItemPage } from './pages/InboxItemPage'
import { InboxPage } from './pages/InboxPage'
import { LocalConversationPage } from './pages/LocalConversationPage'
import { LoginPage } from './pages/LoginPage'
import { MainWorkbenchPage } from './pages/MainWorkbenchPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlanSummaryPage } from './pages/PlanSummaryPage'
import { RemoteTaskPage } from './pages/RemoteTaskPage'
import { SelectWorkspacePage } from './pages/SelectWorkspacePage'
import { SkillsPage } from './pages/SkillsPage'
import { ThreadOverlayPage } from './pages/ThreadOverlayPage'
import { WelcomePage } from './pages/WelcomePage'
import { WorktreeInitPage } from './pages/WorktreeInitPage'
import { SettingsLicensesPage } from './pages/settings/SettingsLicensesPage'
import { SettingsSectionPage } from './pages/settings/SettingsSectionPage'
import { SettingsShellPage } from './pages/settings/SettingsShellPage'

export const router = createBrowserRouter([
  {
    element: <StandaloneLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/welcome', element: <WelcomePage /> },
      { path: '/select-workspace', element: <SelectWorkspacePage /> },
      { path: '/first-run', element: <FirstRunPage /> },
      { path: '/announcement', element: <AnnouncementPage /> },
      { path: '/worktree-init-v2/:pendingWorktreeId', element: <WorktreeInitPage /> },
    ],
  },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <MainWorkbenchPage /> },
      { path: '/debug', element: <DebugPage /> },
      { path: '/diff', element: <DiffPage /> },
      { path: '/plan-summary', element: <PlanSummaryPage /> },
      { path: '/file-preview', element: <FilePreviewPage /> },
      { path: '/local/:conversationId', element: <LocalConversationPage /> },
      { path: '/thread-overlay/:conversationId', element: <ThreadOverlayPage /> },
      { path: '/inbox', element: <InboxPage /> },
      { path: '/inbox/:itemId', element: <InboxItemPage /> },
      { path: '/remote/:taskId', element: <RemoteTaskPage /> },
      { path: '/skills', element: <SkillsPage /> },
      {
        path: '/settings',
        element: <SettingsShellPage />,
        children: [
          { index: true, element: <SettingsSectionPage /> },
          { path: 'open-source-licenses', element: <SettingsLicensesPage /> },
          { path: ':section/*', element: <SettingsSectionPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
