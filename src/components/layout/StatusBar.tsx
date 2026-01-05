import { useEffect, useState } from 'react'
import { Activity, ShieldCheck, HelpCircle, Info, Settings, Camera } from 'lucide-react'
import { cn } from '../../lib/utils'
import { serverApi, type ServerStatus, type AccountInfo } from '../../lib/api'
import { SettingsDialog } from '../settings/SettingsDialog'
import { SnapshotListDialog } from '../dialogs/SnapshotListDialog'
import { AboutDialog } from '../dialogs/AboutDialog'
import { HelpDialog } from '../dialogs/HelpDialog'
import { useAppStore } from '../../stores/app'
import { useThreadStore } from '../../stores/thread'

export function StatusBar() {
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
  const {
    settingsOpen,
    setSettingsOpen,
    snapshotsOpen,
    setSnapshotsOpen,
    aboutOpen,
    setAboutOpen,
    helpOpen,
    setHelpOpen,
  } = useAppStore()
  const activeThread = useThreadStore((state) => state.activeThread)

  useEffect(() => {
    // Fetch status on mount
    const fetchStatus = async () => {
      try {
        const status = await serverApi.getStatus()
        setServerStatus(status)
      } catch (error) {
        console.error('Failed to fetch server status:', error)
      }
    }

    const fetchAccount = async () => {
      try {
        const info = await serverApi.getAccountInfo()
        setAccountInfo(info)
      } catch (error) {
        console.error('Failed to fetch account info:', error)
      }
    }

    fetchStatus()
    fetchAccount()

    // Poll status every 10 seconds
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleRestartServer = async () => {
    try {
      await serverApi.restart()
      const status = await serverApi.getStatus()
      setServerStatus(status)
    } catch (error) {
      console.error('Failed to restart server:', error)
    }
  }

  return (
    <>
      <div className="flex h-9 items-center justify-between border-t border-border/40 bg-card/50 backdrop-blur-md px-4 text-[11px] font-medium tracking-tight text-muted-foreground/80">
        {/* Left side - Server status */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              {serverStatus?.isRunning && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              )}
              <span
                className={cn(
                  'relative inline-flex h-2 w-2 rounded-full',
                  serverStatus?.isRunning ? 'bg-green-500' : 'bg-red-500'
                )}
              />
            </div>
            <span className="flex items-center gap-1.5 uppercase tracking-widest text-[10px]">
              <Activity size={12} strokeWidth={2.5} />
              Engine: {serverStatus?.isRunning ? 'Running' : 'Stopped'}
            </span>
          </div>

          {!serverStatus?.isRunning && (
            <button
              className="text-primary hover:text-primary/80 transition-colors uppercase tracking-widest text-[10px] font-bold"
              onClick={handleRestartServer}
            >
              Restart
            </button>
          )}
        </div>

        {/* Right side - Account info & Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-3 border-r border-border/30">
            <ShieldCheck size={12} className={accountInfo?.account ? 'text-green-500' : 'text-yellow-500'} />
            {accountInfo?.account ? (
              <span className="truncate max-w-[120px]">
                {accountInfo.account.email || 'Logged in'}
                {accountInfo.account.planType && ` (${accountInfo.account.planType})`}
              </span>
            ) : (
              <span className="text-yellow-600/80 uppercase tracking-widest text-[10px]">Auth Required</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {activeThread && (
              <button
                className="hover:bg-primary/5 p-1.5 rounded-md transition-colors hover:text-foreground"
                onClick={() => setSnapshotsOpen(true)}
                title="Snapshots"
              >
                <Camera size={14} />
              </button>
            )}
            <button
              className="hover:bg-primary/5 p-1.5 rounded-md transition-colors hover:text-foreground"
              onClick={() => setHelpOpen(true)}
              title="Help"
            >
              <HelpCircle size={14} />
            </button>
            <button
              className="hover:bg-primary/5 p-1.5 rounded-md transition-colors hover:text-foreground"
              onClick={() => setAboutOpen(true)}
              title="About"
            >
              <Info size={14} />
            </button>
            <button
              className="hover:bg-primary/5 p-1.5 rounded-md transition-colors hover:text-foreground"
              onClick={() => setSettingsOpen(true)}
              title="Settings (⌘,)"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>
      </div>

      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SnapshotListDialog isOpen={snapshotsOpen} onClose={() => setSnapshotsOpen(false)} />
      <AboutDialog isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
      <HelpDialog isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}

