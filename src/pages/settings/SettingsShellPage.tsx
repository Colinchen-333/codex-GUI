import { NavLink, Outlet } from 'react-router-dom'
import { Settings, Shield, User, HardDrive, FileText, Keyboard, Info, Server, GitBranch, Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'

const SETTINGS_NAV = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'sandbox', label: 'Sandbox', icon: Shield },
  { id: 'mcp', label: 'MCP Servers', icon: Server },
  { id: 'git', label: 'Git', icon: GitBranch },
  { id: 'personalization', label: 'Personalization', icon: Sparkles },
  { id: 'account', label: 'Account', icon: User },
  { id: 'worktrees', label: 'Worktrees', icon: HardDrive },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'about', label: 'About', icon: Info },
] as const

export function SettingsShellPage() {
  return (
    <div className="flex h-full overflow-hidden">
      <aside className="flex w-64 flex-col border-r border-stroke/20 bg-surface">
        <div className="px-5 py-4">
          <h1 className="text-lg font-semibold text-text-1">Settings</h1>
          <p className="text-xs text-text-3">Manage your preferences.</p>
        </div>
        <nav className="flex-1 px-3 pb-4">
          {SETTINGS_NAV.map((item) => (
            <NavLink
              key={item.id}
              to={`/settings/${item.id}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-surface-hover/[0.16] text-text-1'
                    : 'text-text-3 hover:bg-surface-hover/[0.12] hover:text-text-1'
                )
              }
            >
              <item.icon size={16} className="text-text-3" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-4">
          <NavLink
            to="/settings/open-source-licenses"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-surface-hover/[0.16] text-text-1'
                  : 'text-text-3 hover:bg-surface-hover/[0.12] hover:text-text-1'
              )
            }
          >
            <FileText size={16} className="text-text-3" />
            Open Source Licenses
          </NavLink>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-4xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
