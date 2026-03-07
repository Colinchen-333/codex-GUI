import { memo, useState } from 'react'
import { Radio, Users } from 'lucide-react'
import { BaseDialog } from '../ui/BaseDialog'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useCollaborationStore } from '../../stores/collaboration'

interface FollowThreadDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const FollowThreadDialog = memo(function FollowThreadDialog({
  isOpen,
  onClose,
}: FollowThreadDialogProps) {
  const [threadId, setThreadId] = useState('')
  const { startFollowing } = useCollaborationStore()

  const canSubmit = threadId.trim().length > 0

  const handleFollow = () => {
    if (!canSubmit) return
    startFollowing(threadId.trim())
    setThreadId('')
    onClose()
  }

  const handleClose = () => {
    setThreadId('')
    onClose()
  }

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Follow Thread"
      titleIcon={<Users size={18} />}
      maxWidth="sm"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleFollow} disabled={!canSubmit}>
            <Radio size={14} className="mr-1.5" aria-hidden="true" />
            Follow
          </Button>
        </>
      }
    >
      <div className="p-6 space-y-4">
        <p className="text-sm text-text-2">
          Enter the thread ID to follow. You&apos;ll be able to watch and interact with the thread
          in real-time.
        </p>
        <Input
          value={threadId}
          onChange={(e) => setThreadId(e.target.value)}
          placeholder="Thread ID"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleFollow()
          }}
          autoFocus
          aria-label="Thread ID"
        />
      </div>
    </BaseDialog>
  )
})
