import { createServer, Server, Socket } from 'net'
import { join } from 'path'
import { tmpdir } from 'os'
import { writeFileSync, mkdirSync } from 'fs'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HookEvent {
  agentId: string
  event: string          // PreToolUse | PostToolUse | Stop | SessionStart | UserPromptSubmit | ...
  toolName?: string
  timestamp: string
}

type HookListener = (evt: HookEvent) => void

// ─── State ────────────────────────────────────────────────────────────────────

let server: Server | null = null
let pipePath = ''
const listeners = new Set<HookListener>()

export function getHookPipePath(): string {
  return pipePath
}

export function onHook(cb: HookListener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

// ─── Shim — written to sabha home, invoked by Claude Code hooks ──────────────
// Reads the hook payload from stdin, forwards one JSON line to the named pipe,
// always exits 0 quickly so it never blocks or fails a tool call.

const SHIM_SOURCE = `// cth-hook.js — Takshashila hook shim (generated, do not edit)
const net = require('net')
const pipe = process.env.TAKSHASHILA_HOOK_PIPE
const agentId = process.env.CLAUDE_CODE_AGENT_ID || 'unknown'
if (!pipe) process.exit(0)

// hard exit guard — never hang a Claude Code tool call
setTimeout(() => process.exit(0), 3000)

let input = ''
process.stdin.on('data', (d) => { input += d })
process.stdin.on('end', () => {
  let payload = {}
  try { payload = JSON.parse(input) } catch {}
  const msg = JSON.stringify({
    agentId,
    event: payload.hook_event_name || process.argv[2] || 'Unknown',
    toolName: payload.tool_name,
    timestamp: new Date().toISOString()
  }) + '\\n'
  const sock = net.connect(pipe, () => sock.end(msg))
  sock.on('close', () => process.exit(0))
  sock.on('error', () => process.exit(0))
})
`

export function shimPath(sabhaHome: string): string {
  return join(sabhaHome, 'cth-hook.js')
}

export function ensureHookShim(sabhaHome: string): void {
  writeFileSync(shimPath(sabhaHome), SHIM_SOURCE, 'utf8')
}

// ─── Per-agent Claude Code settings — .claude/settings.json in the workspace ─
// Claude Code reads project settings from the cwd it was launched in, so each
// agent workspace gets hooks pointing at the shim. The pipe path travels via
// env (TAKSHASHILA_HOOK_PIPE), injected by pty.ts — settings stay static.

export function ensureHookSettings(workspace: string, sabhaHome: string): void {
  const shim = shimPath(sabhaHome)
  const cmd = `node "${shim}"`
  const settings = {
    hooks: {
      PreToolUse:       [{ matcher: '*', hooks: [{ type: 'command', command: `${cmd} PreToolUse` }] }],
      PostToolUse:      [{ matcher: '*', hooks: [{ type: 'command', command: `${cmd} PostToolUse` }] }],
      UserPromptSubmit: [{ hooks: [{ type: 'command', command: `${cmd} UserPromptSubmit` }] }],
      Stop:             [{ hooks: [{ type: 'command', command: `${cmd} Stop` }] }],
      SessionStart:     [{ hooks: [{ type: 'command', command: `${cmd} SessionStart` }] }]
    }
  }
  const dir = join(workspace, '.claude')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'settings.json'), JSON.stringify(settings, null, 2), 'utf8')
}

// ─── Server ───────────────────────────────────────────────────────────────────

export function startHookServer(sabhaHome: string): string {
  pipePath = process.platform === 'win32'
    ? `\\\\.\\pipe\\takshashila-hooks-${process.pid}`
    : join(tmpdir(), `takshashila-hooks-${process.pid}.sock`)

  ensureHookShim(sabhaHome)

  server = createServer((socket: Socket) => {
    let buf = ''
    socket.on('data', (d) => {
      buf += d.toString('utf8')
      let nl: number
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim()
        buf = buf.slice(nl + 1)
        if (!line) continue
        try {
          const evt = JSON.parse(line) as HookEvent
          if (evt.agentId && evt.event) listeners.forEach((l) => l(evt))
        } catch { /* skip malformed */ }
      }
    })
    socket.on('error', () => { /* client vanished — fine */ })
  })

  server.on('error', () => { /* pipe conflict — hooks degrade gracefully */ })
  server.listen(pipePath)
  return pipePath
}

export function stopHookServer(): void {
  try { server?.close() } catch { /* already closed */ }
  server = null
  listeners.clear()
}
