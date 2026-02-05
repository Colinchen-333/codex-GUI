import { NavLink, Outlet } from 'react-router-dom'
import { Settings, Cpu, Shield, ListChecks, User, HardDrive, FileText } from 'lucide-react'
import { cn } from '../../lib/utils'

const SETTINGS_NAV = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'model', label: 'Model', icon: Cpu },
  { id: 'safety', label: 'Safety', icon: Shield },
  { id: 'allowlist', label: 'Allowlist', icon: ListChecks },
  { id: 'worktrees', label: 'Worktrees', icon: HardDrive },
  { id: 'account', label: 'Account', icon: User },
] as const

export function SettingsShellPage() {
  return (
    <div className="flex h-full overflow-hidden">
      <aside className="flex w-64 flex-col border-r border-stroke/20 bg-surface/40">
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
