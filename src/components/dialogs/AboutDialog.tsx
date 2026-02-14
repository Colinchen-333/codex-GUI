import { useEffect, useState } from 'react'
import { ExternalLink, HardDrive, Cpu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { serverApi, type ServerStatus } from '../../lib/api'
import { APP_NAME, APP_VERSION } from '../../lib/appMeta'
import { BaseDialog } from '../ui/BaseDialog'
import { Button } from '../ui/Button'
import { logError } from '../../lib/errorUtils'
import { useToast } from '../ui/Toast'

interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    if (!isOpen) return
    serverApi
      .getStatus()
      .then(setServerStatus)
      .catch((error) => {
        logError(error, {
          context: 'AboutDialog',
          source: 'dialogs',
          details: 'Failed to get server status',
        })
        showToast('Failed to load engine status', 'error')
      })
  }, [isOpen, showToast])

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`About ${APP_NAME}`}
      description="Application information and diagnostics shortcuts."
      titleIcon={<HardDrive size={16} />}
      maxWidth="md"
      footer={
        <div className="flex w-full items-center justify-between">
          <a
            href="https://github.com/Colinchen-333/codex-GUI"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            GitHub
            <ExternalLink size={14} />
          </a>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="p-6">
        <div className="flex items-center gap-4">
          <img
            src="/icon.png"
            alt={APP_NAME}
            className="h-14 w-14 rounded-2xl border border-stroke/20 bg-surface-solid"
            draggable={false}
          />
          <div className="min-w-0">
            <div className="text-lg font-semibold text-text-1">{APP_NAME}</div>
            <div className="text-sm text-text-3">
              A protocol-native desktop GUI for the Codex CLI.
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-stroke/20 bg-surface-solid">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-sm">
            <div className="text-text-3">App Version</div>
            <div className="text-right font-mono text-text-2">{APP_VERSION}</div>

            <div className="text-text-3">Engine Status</div>
            <div className="text-right">
              <span
                className={
                  serverStatus?.isRunning ? 'text-status-success' : 'text-status-error'
                }
              >
                {serverStatus?.isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>

            <div className="text-text-3">Engine Version</div>
            <div className="text-right font-mono text-text-2">
              {serverStatus?.version || 'Unknown'}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-stroke/20 bg-surface-solid px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-text-2">
            <Cpu size={14} className="text-text-3" />
            <span>Diagnostics</span>
          </div>
          <Link className="text-sm font-medium text-primary hover:underline" to="/debug">
            Open Debug Page
          </Link>
        </div>
      </div>
    </BaseDialog>
  )
}
