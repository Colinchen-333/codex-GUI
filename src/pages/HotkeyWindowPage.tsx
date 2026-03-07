import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Send, ChevronDown, ChevronUp, X, MessageSquare, Zap } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { useSessionsStore } from '../stores/sessions'
import { normalizeTimestampToMs } from '../lib/utils'

export const HotkeyWindowPage = memo(function HotkeyWindowPage() {
  const { conversationId } = useParams()
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sessions = useSessionsStore((s) => s.sessions)

  // If we have a conversationId, we could open that thread directly
  useEffect(() => {
    if (conversationId) {
      sessionStorage.setItem('hotkey-open-thread', conversationId)
      void invoke('show_main_window').catch(() => {})
      void invoke('hide_hotkey_window').catch(() => {})
    }
  }, [conversationId])

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Handle Escape to hide the window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void invoke('hide_hotkey_window').catch(() => {
          window.close()
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleClose = useCallback(() => {
    void invoke('hide_hotkey_window').catch(() => {
      window.close()
    })
  }, [])

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      sessionStorage.setItem('hotkey-pending-prompt', input.trim())
      await invoke('show_main_window').catch(() => {})
      await invoke('hide_hotkey_window').catch(() => {})
    } finally {
      setSending(false)
    }
  }, [input, sending])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  // Recent threads (non-archived, most recent first)
  const recentSessions = sessions
    .filter((s) => !s.isArchived)
    .slice(0, 6)

  return (
    <div className="flex flex-col bg-transparent select-none min-h-screen">
      {/* Draggable title bar — invisible but enables window drag */}
      <div className="h-5 w-full" data-tauri-drag-region />

      {/* Composer card */}
      <div className="mx-2.5 mb-2 rounded-2xl border border-stroke/20 bg-surface-solid shadow-xl overflow-hidden backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5">
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-primary" />
            <span className="text-xs font-medium text-text-2">Quick Prompt</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-surface-hover/[0.08] text-text-3 hover:text-text-2 transition-colors"
            aria-label="Close"
          >
            <X size={12} />
          </button>
        </div>

        {/* Input area */}
        <div className="px-3.5 py-1.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask Codex anything..."
            className="w-full bg-transparent text-sm text-text-1 resize-none outline-none placeholder:text-text-3 leading-relaxed min-h-12 max-h-[120px]"
            rows={2}
            aria-label="Quick prompt input"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3.5 pb-3 pt-0.5">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-text-3 hover:text-text-2 transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {expanded ? 'Hide threads' : 'Recent threads'}
          </button>
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
            aria-label="Send message"
          >
            <Send size={11} />
            Send
          </button>
        </div>
      </div>

      {/* Expanded panel — recent threads */}
      {expanded && (
        <div className="mx-2.5 mb-3 rounded-xl overflow-hidden border border-stroke/20 bg-surface-solid backdrop-blur-xl max-h-56">
          <div className="overflow-y-auto max-h-56 hide-scrollbar">
            {recentSessions.length === 0 ? (
              <div className="px-4 py-6 text-center text-text-3 text-xs">
                No recent threads
              </div>
            ) : (
              recentSessions.map((session) => {
                const displayName =
                  session.title?.trim() ||
                  session.firstMessage?.trim().slice(0, 40) ||
                  `Session ${session.sessionId.slice(0, 8)}`
                const ts = session.lastAccessedAt ?? session.createdAt
                const date = new Date(normalizeTimestampToMs(ts)).toLocaleDateString()
                return (
                  <button
                    key={session.sessionId}
                    onClick={() => {
                      void invoke('show_main_window').catch(() => {})
                      void invoke('hide_hotkey_window').catch(() => {})
                      sessionStorage.setItem('hotkey-open-thread', session.sessionId)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover/[0.08] text-left transition-colors border-b border-stroke/10 last:border-b-0"
                  >
                    <MessageSquare size={13} className="text-text-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-1 truncate leading-snug">
                        {displayName}
                      </p>
                      <p className="text-xs text-text-3 mt-0.5">{date}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
})
