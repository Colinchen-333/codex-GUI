import { useState, useRef } from 'react'
import { useSwarmStore } from '../../stores/swarm'
import { Button } from '../ui/Button'
import { Send } from 'lucide-react'

export function SwarmInput() {
  const phase = useSwarmStore((s) => s.phase)
  const setUserRequest = useSwarmStore((s) => s.setUserRequest)
  const setPhase = useSwarmStore((s) => s.setPhase)
  const stagingDiff = useSwarmStore((s) => s.stagingDiff)
  const testsPass = useSwarmStore((s) => s.testsPass)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    setUserRequest(trimmed)
    setPhase('exploring')
    setDraft('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Idle state: show input
  if (phase === 'idle') {
    return (
      <div className="border-t border-stroke/10 p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            className="flex-1 resize-none rounded-lg border border-stroke/20 bg-surface px-3 py-2 text-[14px] text-text-1 placeholder:text-text-3 focus:border-primary focus:outline-none"
            rows={2}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!draft.trim()}
            className="self-end"
          >
            <Send size={14} />
            <span className="ml-1.5">Start</span>
          </Button>
        </div>
      </div>
    )
  }

  // Completed state: show approval buttons
  if (phase === 'completed') {
    return (
      <div className="border-t border-stroke/10 p-4">
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-text-2">
            {testsPass ? 'All tests passed.' : 'Review the results above.'}
            {stagingDiff && ' Changes are ready to merge.'}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => useSwarmStore.getState().deactivate()}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                /* merge to main - orchestrator handles */
              }}
            >
              Merge to Main
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Working state: show progress indicator
  return (
    <div className="border-t border-stroke/10 px-4 py-3">
      <div className="flex items-center gap-2 text-[13px] text-text-3">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        <span>Self-Driving in progress...</span>
      </div>
    </div>
  )
}
