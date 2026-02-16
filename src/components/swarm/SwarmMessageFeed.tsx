import { useEffect, useRef } from 'react'
import { useSwarmStore } from '../../stores/swarm'

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const TYPE_STYLES: Record<string, string> = {
  broadcast: 'text-primary',
  discovery: 'text-status-info',
  status: 'text-text-2',
  error: 'text-status-error',
}

export function SwarmMessageFeed() {
  const messages = useSwarmStore((s) => s.messages)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-text-3">
        Activity will appear here.
      </div>
    )
  }

  return (
    <div className="space-y-2" role="log" aria-live="polite" aria-label="Activity log">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-text-3">
        Activity
      </h3>
      <div className="space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="text-[13px]">
            <div className="flex items-baseline gap-2">
              <span
                className={`font-medium ${TYPE_STYLES[msg.type] || 'text-text-2'}`}
              >
                [{msg.from}]
              </span>
              <span className="text-[11px] text-text-3">
                {formatTime(msg.timestamp)}
              </span>
            </div>
            <p className="mt-0.5 whitespace-pre-wrap leading-relaxed text-text-1">
              {msg.content}
            </p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
