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
import { SelectWorkspacePage } from './pages/SelectWorkspacePage'
import { SkillsPage } from './pages/SkillsPage'
import { WelcomePage } from './pages/WelcomePage'
import { WorktreeInitPage } from './pages/WorktreeInitPage'
import { OAuthCallbackPage } from './pages/OAuthCallbackPage'
import { RemoteConnectionsPage } from './pages/RemoteConnectionsPage'
import { RemoteThreadPage } from './pages/RemoteThreadPage'
import { ThreadOverlayPage } from './pages/ThreadOverlayPage'
import { SettingsLicensesPage } from './pages/settings/SettingsLicensesPage'
import { SettingsSectionPage } from './pages/settings/SettingsSectionPage'
import { SettingsShellPage } from './pages/settings/SettingsShellPage'
import { HotkeyWindowPage } from './pages/HotkeyWindowPage'
import { HotkeyLayout } from './components/layout/HotkeyLayout'
import { PopoutThreadPage } from './pages/PopoutThreadPage'
import { PopoutLayout } from './components/layout/PopoutLayout'

export const router = createBrowserRouter([
  // Pop-out thread window — standalone floating window, native decorations, no app chrome
  {
    element: <PopoutLayout />,
    children: [
      { path: '/popout/thread/:threadId', element: <PopoutThreadPage /> },
    ],
  },
  // Hotkey mini-window — frameless transparent window, no app chrome
  {
    element: <HotkeyLayout />,
    children: [
      { path: '/hotkey-window', element: <HotkeyWindowPage /> },
      { path: '/hotkey-window/thread/:conversationId', element: <HotkeyWindowPage /> },
    ],
  },
  {
    element: <StandaloneLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/welcome', element: <WelcomePage /> },
      { path: '/select-workspace', element: <SelectWorkspacePage /> },
      { path: '/first-run', element: <FirstRunPage /> },
      { path: '/announcement', element: <AnnouncementPage /> },
      { path: '/worktree-init-v2/:pendingWorktreeId', element: <WorktreeInitPage /> },
      { path: '/connector/oauth_callback', element: <OAuthCallbackPage /> },
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
      { path: '/inbox', element: <InboxPage /> },
      { path: '/inbox/:itemId', element: <InboxItemPage /> },
      { path: '/skills', element: <SkillsPage /> },
      { path: '/thread-overlay', element: <ThreadOverlayPage /> },
      { path: '/thread-overlay/:conversationId', element: <ThreadOverlayPage /> },
      { path: '/remote/:taskId', element: <RemoteThreadPage /> },
      { path: '/remote-conversation/:conversationId', element: <RemoteThreadPage /> },
      { path: '/remote-connections', element: <RemoteConnectionsPage /> },
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
