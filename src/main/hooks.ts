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

// ─── Sandesh shim — lets any Claude Code session drop a sandesh into an inbox ──
// Claude agents run: node <sabhaHome>/cth-sandesh.js --to <id> --subject <s> --body <b>

const SANDESH_SHIM_SOURCE = `// cth-sandesh.js — Takshashila sandesh shim (generated, do not edit)
// Usage: node cth-sandesh.js --to <agentId> --subject "<title>" --body "<text>"
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const args = {}
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i]
  if (a.startsWith('--') && i + 1 < process.argv.length) { args[a.slice(2)] = process.argv[++i] }
}

const sabhaHome = process.env.CLAUDE_CODE_SABHA_HOME || ''
const from = process.env.CLAUDE_CODE_AGENT_ID || 'unknown'
const { to, subject = 'message', body = '' } = args

if (!sabhaHome || !to) {
  console.error('[cth-sandesh] CLAUDE_CODE_SABHA_HOME or --to missing')
  process.exit(1)
}

const id = crypto.randomUUID()
const sandesh = { id, from, to, timestamp: new Date().toISOString(),
  speech_act: from === 'chanakya' ? 'request' : 'result', subject, body }

const inboxDir = path.join(sabhaHome, 'agents', to, 'inbox')
try { fs.mkdirSync(inboxDir, { recursive: true }) } catch {}
fs.writeFileSync(path.join(inboxDir, id + '.json'), JSON.stringify(sandesh, null, 2))
// Also write a copy to sender outbox so renderer scroll animation fires
const outboxDir = path.join(sabhaHome, 'agents', from, 'outbox')
try { fs.mkdirSync(outboxDir, { recursive: true }) } catch {}
fs.writeFileSync(path.join(outboxDir, id + '.json'), JSON.stringify(sandesh, null, 2))
console.log('[cth-sandesh] sent:', id, 'from:', from, 'to:', to)
`

export function sandeshShimPath(sabhaHome: string): string {
  return join(sabhaHome, 'cth-sandesh.js')
}

export function ensureSandeshShim(sabhaHome: string): void {
  writeFileSync(sandeshShimPath(sabhaHome), SANDESH_SHIM_SOURCE, 'utf8')
}

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
  ensureSandeshShim(sabhaHome)

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
