import { useEffect, useRef } from 'react'
import { MessageSquare } from 'lucide-react'
import { useSwarmStore, type SwarmMessage } from '../../stores/swarm'

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

function PhaseSeparator({ msg }: { msg: SwarmMessage }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="h-px flex-1 bg-stroke/10" />
      <span className="text-[11px] font-medium text-text-3">{msg.content}</span>
      <div className="h-px flex-1 bg-stroke/10" />
    </div>
  )
}

function ErrorMessage({ msg }: { msg: SwarmMessage }) {
  return (
    <div className="rounded-md bg-status-error/5 px-2.5 py-2 text-[13px]">
      <div className="flex items-baseline gap-2">
        <span className="font-medium text-status-error">[{msg.from}]</span>
        <span className="text-[11px] text-text-3">{formatTime(msg.timestamp)}</span>
      </div>
      <p className="mt-0.5 whitespace-pre-wrap leading-relaxed text-status-error/80">{msg.content}</p>
    </div>
  )
}

function StandardMessage({ msg }: { msg: SwarmMessage }) {
  return (
    <div className="text-[13px]">
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
  )
}

export function SwarmMessageFeed() {
  const messages = useSwarmStore((s) => s.messages)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-text-3">
        <MessageSquare size={24} strokeWidth={1.5} />
        <p className="text-[13px]">Activity will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-2" role="log" aria-live="polite" aria-label="Activity log">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-text-3">
        Activity
      </h3>
      <div className="space-y-3">
        {messages.map((msg) => {
          const isSystemPhase =
            msg.from === 'System' &&
            (msg.type === 'broadcast' || msg.content.startsWith('Phase:'))

          if (isSystemPhase) {
            return <PhaseSeparator key={msg.id} msg={msg} />
          }

          if (msg.type === 'error') {
            return <ErrorMessage key={msg.id} msg={msg} />
          }

          return <StandardMessage key={msg.id} msg={msg} />
        })}
        <div ref={endRef} />
      </div>
    </div>
  )
}
