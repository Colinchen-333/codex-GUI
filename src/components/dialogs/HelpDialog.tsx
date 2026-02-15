import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ExternalLink,
  FileDiff,
  FolderPlus,
  History,
  ImagePlus,
  Keyboard,
  Lock,
  MessageSquare,
  RotateCcw,
  Shield,
} from 'lucide-react'
import { BaseDialog } from '../ui/BaseDialog'
import { Button } from '../ui/Button'

interface HelpDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface HelpSection {
  title: string
  items: Array<{
    icon: ReactNode
    label: string
    description: string
  }>
}

const helpSections: HelpSection[] = [
  {
    title: 'Getting Started',
    items: [
      {
        icon: <FolderPlus size={18} className="text-text-2" />,
        label: 'Add a Project',
        description: 'Click "Add Project" in the sidebar to select a folder containing your code.',
      },
      {
        icon: <MessageSquare size={18} className="text-text-2" />,
        label: 'Start a Session',
        description: 'Select a project and start a new session to begin chatting with Codex.',
      },
      {
        icon: <FileDiff size={18} className="text-text-2" />,
        label: 'Review Changes',
        description: 'Review diffs carefully before applying them. Use snapshots to roll back if needed.',
      },
    ],
  },
  {
    title: 'Keyboard Shortcuts',
    items: [
      { icon: <Keyboard size={18} className="text-text-2" />, label: 'Cmd + Enter', description: 'Send message / Submit input' },
      { icon: <Keyboard size={18} className="text-text-2" />, label: 'Cmd + K', description: 'Open command palette' },
      { icon: <Keyboard size={18} className="text-text-2" />, label: 'Cmd + Shift + K', description: 'Focus input' },
      { icon: <Keyboard size={18} className="text-text-2" />, label: 'Cmd + ,', description: 'Open Settings' },
      { icon: <Keyboard size={18} className="text-text-2" />, label: 'Cmd + N', description: 'Start a new session' },
      { icon: <Keyboard size={18} className="text-text-2" />, label: 'Cmd + ] / Cmd + [', description: 'Next / previous session' },
      { icon: <Keyboard size={18} className="text-text-2" />, label: 'Escape', description: 'Stop generation (double-press) / Close dialogs' },
    ],
  },
  {
    title: 'Working with Files',
    items: [
      {
        icon: <History size={18} className="text-text-2" />,
        label: 'Snapshots',
        description: 'Snapshots are created automatically before changes are applied. Use them to revert quickly.',
      },
      {
        icon: <RotateCcw size={18} className="text-text-2" />,
        label: 'Revert',
        description: 'Use snapshots to restore the project state if changes go wrong.',
      },
      {
        icon: <ImagePlus size={18} className="text-text-2" />,
        label: 'Images',
        description: 'Paste or drag images into the chat input to include them with your message.',
      },
    ],
  },
  {
    title: 'Safety & Approval',
    items: [
      {
        icon: <Shield size={18} className="text-text-2" />,
        label: 'Sandbox Mode',
        description: 'Controls file system access. Use stricter modes for sensitive repositories.',
      },
      {
        icon: <Lock size={18} className="text-text-2" />,
        label: 'Approval Mode',
        description: 'Choose whether the engine must ask for approval before running commands or writing files.',
      },
      {
        icon: <AlertTriangle size={18} className="text-text-2" />,
        label: 'Review Commands',
        description: 'Treat command approvals like code review: verify intent, paths, and side effects.',
      },
    ],
  },
]

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Help & Documentation"
      description="Quick reference for common workflows and shortcuts."
      maxWidth="xl"
      footer={
        <Button variant="primary" size="sm" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <div className="max-h-[500px] overflow-y-auto p-6">
        <div className="space-y-6">
          {helpSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 text-sm font-semibold text-text-1">{section.title}</h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-lg border border-stroke/20 bg-surface-solid p-3"
                  >
                    <span className="mt-0.5">{item.icon}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-text-1">{item.label}</div>
                      <div className="text-xs text-text-3">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-stroke/20 bg-surface-solid p-4">
          <h3 className="mb-2 text-sm font-semibold text-text-1">Need More Help?</h3>
          <div className="space-y-2 text-sm text-text-3">
            <p>
              <a
                href="https://github.com/Colinchen-333/codex-GUI/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Report an Issue
                <ExternalLink size={14} />
              </a>
              {' - '}Found a bug? Let us know.
            </p>
            <p>
              <a
                href="https://github.com/Colinchen-333/codex-GUI#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                View Documentation
                <ExternalLink size={14} />
              </a>
              {' - '}Full documentation on GitHub.
            </p>
          </div>
        </div>
      </div>
    </BaseDialog>
  )
}
