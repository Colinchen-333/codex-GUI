import { memo, useState } from 'react'
import { Cloud, Plus, Wifi, WifiOff, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'

type ConnectionStatus = 'connected' | 'disconnected' | 'error'

interface RemoteConnection {
  id: string
  name: string
  host: string
  status: ConnectionStatus
  lastConnected?: string
}

const STATUS_BADGE: Record<ConnectionStatus, string> = {
  connected: 'bg-status-success-muted text-status-success',
  disconnected: 'bg-surface text-text-3',
  error: 'bg-status-error-muted text-status-error',
}

export const RemoteConnectionsPage = memo(function RemoteConnectionsPage() {
  // Placeholder — connections will be populated from backend when cloud support lands.
  const [connections] = useState<RemoteConnection[]>([])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stroke/20">
        <div className="flex items-center gap-2">
          <Cloud size={18} className="text-primary" />
          <h1 className="text-base font-semibold text-text-1">Remote Connections</h1>
        </div>
        <Button variant="secondary" size="sm">
          <Plus size={14} className="mr-1.5" />
          Add Connection
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Cloud size={48} className="text-text-3" />
            <h2 className="text-lg font-medium text-text-1">No Remote Connections</h2>
            <p className="text-text-3 text-sm text-center max-w-md">
              Connect to remote environments to run Codex tasks in the cloud. Remote
              connections enable collaboration and scalable compute.
            </p>
            <Button variant="primary" size="sm">
              <Plus size={14} className="mr-1.5" />
              Add Your First Connection
            </Button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center gap-4 bg-surface-solid rounded-xl p-4 border border-stroke/20"
              >
                {conn.status === 'connected' ? (
                  <Wifi size={18} className="text-status-success shrink-0" />
                ) : (
                  <WifiOff size={18} className="text-text-3 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-1">{conn.name}</p>
                  <p className="text-xs text-text-3">{conn.host}</p>
                </div>

                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[conn.status]}`}
                >
                  {conn.status}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  <IconButton
                    icon={<RefreshCw size={14} />}
                    variant="ghost"
                    size="sm"
                    aria-label="Reconnect"
                  />
                  <IconButton
                    icon={<Trash2 size={14} />}
                    variant="ghost"
                    size="sm"
                    aria-label="Remove connection"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
