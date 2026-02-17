import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { terminalApi } from '../../lib/api'
import { TerminalToolbar } from './TerminalToolbar'

interface TerminalPanelProps {
  cwd: string
  visible: boolean
  onClose: () => void
}

const MIN_HEIGHT = 150
const MAX_HEIGHT_RATIO = 0.5 // 50vh
const DEFAULT_HEIGHT = 300

// Get xterm theme from CSS custom properties
function getTerminalTheme(): Record<string, string | undefined> {
  const root = document.documentElement
  const get = (prop: string) => getComputedStyle(root).getPropertyValue(prop).trim()

  return {
    background: get('--terminal-ansi-black') || '#1e1e1e',
    foreground: get('--terminal-ansi-white') || '#e5e5e5',
    cursor: get('--terminal-ansi-white') || '#e5e5e5',
    cursorAccent: get('--terminal-ansi-black') || '#1e1e1e',
    selectionBackground: '#ffffff30',
    selectionForeground: undefined,
    black: get('--terminal-ansi-black'),
    red: get('--terminal-ansi-red'),
    green: get('--terminal-ansi-green'),
    yellow: get('--terminal-ansi-yellow'),
    blue: get('--terminal-ansi-blue'),
    magenta: get('--terminal-ansi-magenta'),
    cyan: get('--terminal-ansi-cyan'),
    white: get('--terminal-ansi-white'),
    brightBlack: get('--terminal-ansi-bright-black'),
    brightRed: get('--terminal-ansi-bright-red'),
    brightGreen: get('--terminal-ansi-bright-green'),
    brightYellow: get('--terminal-ansi-bright-yellow'),
    brightBlue: get('--terminal-ansi-bright-blue'),
    brightMagenta: get('--terminal-ansi-bright-magenta'),
    brightCyan: get('--terminal-ansi-bright-cyan'),
    brightWhite: get('--terminal-ansi-bright-white'),
  }
}

export function TerminalPanel({ cwd, visible, onClose }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const isRunningRef = useRef(false)
  const inputBufferRef = useRef('')
  const isDraggingRef = useRef(false)
  const dragStartYRef = useRef(0)
  const dragStartHeightRef = useRef(0)

  // Initialize xterm
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return

    const theme = getTerminalTheme()
    const term = new Terminal({
      theme,
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowProposedApi: true,
      scrollback: 5000,
      convertEol: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(terminalRef.current)

    // Initial fit
    requestAnimationFrame(() => {
      fitAddon.fit()
    })

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Write initial prompt
    writePrompt(term, cwd)

    // Handle user input
    term.onData((data) => {
      if (isRunningRef.current) return

      if (data === '\r') {
        // Enter pressed
        const command = inputBufferRef.current.trim()
        term.write('\r\n')

        if (command) {
          void handleCommand(term, command)
        } else {
          writePrompt(term, cwd)
        }
        inputBufferRef.current = ''
      } else if (data === '\u007f') {
        // Backspace
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1)
          term.write('\b \b')
        }
      } else if (data === '\u0003') {
        // Ctrl+C
        inputBufferRef.current = ''
        term.write('^C\r\n')
        writePrompt(term, cwd)
      } else if (data === '\u000c') {
        // Ctrl+L - clear
        term.clear()
        writePrompt(term, cwd)
      } else if (data >= ' ') {
        // Regular character
        inputBufferRef.current += data
        term.write(data)
      }
    })

    return () => {
      term.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fit when visibility or height changes
  useEffect(() => {
    if (visible && fitAddonRef.current) {
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit()
      })
    }
  }, [visible, height])

  // Resize observer
  useEffect(() => {
    if (!terminalRef.current) return
    const observer = new ResizeObserver(() => {
      if (fitAddonRef.current && visible) {
        fitAddonRef.current.fit()
      }
    })
    observer.observe(terminalRef.current)
    return () => observer.disconnect()
  }, [visible])

  // Listen for Tauri events
  useEffect(() => {
    let mounted = true
    const unlisteners: UnlistenFn[] = []

    const setup = async () => {
      const unStdout = await listen<string>('terminal:stdout', (event) => {
        if (mounted) xtermRef.current?.writeln(event.payload)
      })
      if (mounted) unlisteners.push(unStdout); else unStdout()

      const unStderr = await listen<string>('terminal:stderr', (event) => {
        if (mounted) xtermRef.current?.writeln(`\x1b[31m${event.payload}\x1b[0m`)
      })
      if (mounted) unlisteners.push(unStderr); else unStderr()
    }

    void setup()

    return () => {
      mounted = false
      for (const fn of unlisteners) fn()
    }
  }, [])

  const writePrompt = useCallback((term: Terminal, dir: string) => {
    const shortDir = dir.replace(/^\/Users\/[^/]+/, '~')
    term.write(`\x1b[36m${shortDir}\x1b[0m \x1b[33m$\x1b[0m `)
  }, [])

  const handleCommand = useCallback(
    async (term: Terminal, command: string) => {
      // Handle built-in commands
      if (command === 'clear') {
        term.clear()
        writePrompt(term, cwd)
        return
      }

      if (command === 'exit') {
        onClose()
        return
      }

      isRunningRef.current = true
      try {
        const result = await terminalApi.execute(cwd, command)

        if (result.exitCode !== null && result.exitCode !== 0) {
          term.writeln(`\x1b[31mProcess exited with code ${result.exitCode}\x1b[0m`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        term.writeln(`\x1b[31mError: ${message}\x1b[0m`)
      } finally {
        isRunningRef.current = false
        writePrompt(term, cwd)
      }
    },
    [cwd, onClose, writePrompt]
  )

  const handleClear = useCallback(() => {
    xtermRef.current?.clear()
    inputBufferRef.current = ''
    if (xtermRef.current) {
      writePrompt(xtermRef.current, cwd)
    }
  }, [cwd, writePrompt])

  // Drag resize handler
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDraggingRef.current = true
      dragStartYRef.current = e.clientY
      dragStartHeightRef.current = height

      const handleDragMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return
        const delta = dragStartYRef.current - moveEvent.clientY
        const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO
        const newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, dragStartHeightRef.current + delta))
        setHeight(newHeight)
      }

      const handleDragEnd = () => {
        isDraggingRef.current = false
        document.removeEventListener('mousemove', handleDragMove)
        document.removeEventListener('mouseup', handleDragEnd)
        document.body.classList.remove('no-select')
      }

      document.addEventListener('mousemove', handleDragMove)
      document.addEventListener('mouseup', handleDragEnd)
      document.body.classList.add('no-select')
    },
    [height]
  )

  if (!visible) return null

  return (
    <div
      className="flex shrink-0 flex-col border-t border-stroke/20 panel-slide-up"
      style={{ height }}
    >
      {/* Drag handle */}
      <div
        className="h-1 cursor-row-resize bg-transparent transition-colors hover:bg-primary/30"
        onMouseDown={handleDragStart}
      />

      <TerminalToolbar cwd={cwd} onClear={handleClear} onClose={onClose} />

      <div
        ref={terminalRef}
        className="flex-1 overflow-hidden bg-background px-2 py-1"
      />
    </div>
  )
}
