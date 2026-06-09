import React, { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface Props {
  agentId: string
}

export default function TerminalPane({ agentId }: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      theme: {
        background:  '#1A0E08',
        foreground:  '#F5E6C8',
        cursor:      '#F4C430',
        cursorAccent:'#1A0E08',
        selectionBackground: 'rgba(244,196,48,0.3)',
        black:   '#2C1810', red:     '#C1440E', green:   '#4A7C59', yellow:  '#F4C430',
        blue:    '#5B7FA6', magenta: '#9B6B9B', cyan:    '#5B9B9B', white:   '#F5E6C8',
        brightBlack:   '#6B5040', brightRed:     '#E05A2B', brightGreen:   '#6AAE7A',
        brightYellow:  '#FFD700', brightBlue:    '#7BA3C9', brightMagenta: '#BF8FBF',
        brightCyan:    '#7FBFBF', brightWhite:   '#FFFFFF'
      },
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      fontSize: 11,
      lineHeight: 1.3,
      cursorBlink: true,
      cursorStyle: 'block',
      allowTransparency: false,
      scrollback: 5000
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(new WebLinksAddon())
    term.open(containerRef.current)

    // Register onResize BEFORE the first fit so the PTY gets the correct initial size
    term.onResize(({ cols, rows }) => window.takshashila.pty.resize(agentId, cols, rows))
    fitAddon.fit()

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Stream PTY output into the terminal
    const unsubData = window.takshashila.pty.onData(agentId, (data) => term.write(data))
    const unsubExit = window.takshashila.pty.onExit(agentId, (code) => {
      term.write(`\r\n\x1b[33m[process exited with code ${code}]\x1b[0m\r\n`)
    })

    // Keystrokes → PTY
    term.onData((data) => window.takshashila.pty.write(agentId, data))

    // Spawn the agent process with the correct initial size; force a resize sync after
    // in case the session already existed (Chanakya) and had different dimensions
    window.takshashila.pty.spawn(agentId, { cols: term.cols, rows: term.rows }).then(() => {
      window.takshashila.pty.resize(agentId, term.cols, term.rows)
    })

    const ro = new ResizeObserver(() => {
      fitAddon.fit()
      window.takshashila.pty.resize(agentId, term.cols, term.rows)
    })
    ro.observe(containerRef.current)

    return () => {
      unsubData()
      unsubExit()
      ro.disconnect()
      term.dispose()
      termRef.current = null
    }
  }, [agentId])

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        background: '#1A0E08'
      }}
    />
  )
}
