import { WebContents } from 'electron'
import { join } from 'path'
import {
  existsSync, readdirSync, readFileSync, writeFileSync,
  unlinkSync, appendFileSync, watch, FSWatcher, mkdirSync
} from 'fs'
import { spawnSession, addDataListener, removeDataListener, writeToSession } from './pty'
import { resolveClaudeCommand } from './chanakya'
import type { HarnessConfig } from './config'

// ─── Types ────────────────────────────────────────────────────────────────────

type Avastha = 'idle' | 'working' | 'processing' | 'vighna' | 'siddhi'

// ─── Per-agent runtime ────────────────────────────────────────────────────────
// Mirrors the chanakya.ts pattern for any non-chanakya specialist.
// Lazy: the claude session is only spawned when the first sandesh arrives.

interface RuntimeState {
  agentId:    string
  kshetra:    string
  spawned:    boolean
  spawnedAt:  number   // Date.now() at spawn — used to enforce boot grace period
  promptReady: boolean
  queue:      string[]
  inboxWatcher: FSWatcher | null
  silenceTimer: NodeJS.Timeout | null
  promptSilenceTimer: NodeJS.Timeout | null
  watchdogTimer: NodeJS.Timeout | null
}

const SILENCE_MS        = 4000
const WATCHDOG_MS       = 30_000
// How long after spawn before we trust prompt-ready signals.
// Claude Code's startup animation can contain `>` characters that look like the
// interactive prompt. We ignore regex matches and use a longer silence window
// during this period so the TUI is fully interactive before delivery.
const BOOT_GRACE_MS     = 5000
const BOOT_SILENCE_MS   = 4000  // silence window used during boot phase
const NORMAL_SILENCE_MS = 1500  // silence window after boot settled

const runtimes = new Map<string, RuntimeState>()

let sabhaHome = ''
let resolvedCmd = 'claude'
let getSender: () => WebContents | null = () => null

// ─── Helpers ──────────────────────────────────────────────────────────────────

function itihasPath(): string { return join(sabhaHome, 'itihas.jsonl') }
function inboxDir(id: string): string { return join(sabhaHome, 'agents', id, 'inbox') }
function identityPath(id: string): string { return join(sabhaHome, 'agents', id, 'identity.json') }

function log(agentId: string, event: string, payload: object = {}): void {
  try {
    appendFileSync(itihasPath(),
      JSON.stringify({ timestamp: new Date().toISOString(), event, agentId, payload }) + '\n', 'utf8')
  } catch { /* non-fatal */ }
}

function stripAnsi(s: string): string {
  return s
    .replace(/\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/g, '')
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b[()][AB012]/g, '')
    .replace(/\x1b./g, '')
}

function setAvastha(agentId: string, avastha: Avastha): void {
  try {
    const file = identityPath(agentId)
    if (!existsSync(file)) return
    const identity = JSON.parse(readFileSync(file, 'utf8'))
    identity.avastha = avastha
    writeFileSync(file, JSON.stringify(identity, null, 2), 'utf8')
  } catch { /* non-fatal */ }
}

// ─── Spawn ────────────────────────────────────────────────────────────────────

function spawnShishya(st: RuntimeState): void {
  if (st.spawned) return
  st.spawned = true
  st.spawnedAt = Date.now()
  log(st.agentId, 'shishya:spawn-attempt', { command: resolvedCmd })

  try {
    spawnSession(st.agentId, {
      command: resolvedCmd,
      args: [],
      cwd: st.kshetra,
      cols: 220,
      rows: 50,
      env: {
        CLAUDE_CODE_AGENT_ID:   st.agentId,
        CLAUDE_CODE_SABHA_HOME: sabhaHome,
        CLAUDE_CODE_AGENT_ROLE: 'specialist'
      }
    }, getSender)
    addDataListener(st.agentId, (data) => onOutput(st, data))
  } catch (err) {
    log(st.agentId, 'shishya:spawn-error', { error: (err as Error).message })
    st.spawned = false
  }
}

// ─── Output ───────────────────────────────────────────────────────────────────

function markPromptReady(st: RuntimeState): void {
  if (st.promptSilenceTimer) { clearTimeout(st.promptSilenceTimer); st.promptSilenceTimer = null }
  if (!st.promptReady) {
    st.promptReady = true
    if (st.queue.length > 0) setTimeout(() => flushQueue(st), 50)
  }
}

function onOutput(st: RuntimeState, data: string): void {
  if (st.silenceTimer) clearTimeout(st.silenceTimer)
  st.silenceTimer = setTimeout(() => setAvastha(st.agentId, 'idle'), SILENCE_MS)

  const msSinceSpawn = Date.now() - st.spawnedAt
  const inBootPhase  = msSinceSpawn < BOOT_GRACE_MS

  if (st.promptSilenceTimer) clearTimeout(st.promptSilenceTimer)
  st.promptSilenceTimer = setTimeout(
    () => markPromptReady(st),
    inBootPhase ? BOOT_SILENCE_MS : NORMAL_SILENCE_MS
  )

  // Only trust the `>` regex outside the boot phase; during startup Claude Code's
  // TUI can print `>` characters that aren't the interactive input prompt.
  if (!inBootPhase) {
    const plain = stripAnsi(data)
    if (/(?:^|[\r\n])\s*>\s*$/.test(plain.trimEnd())) markPromptReady(st)
  }
}

// ─── Queue + flush ────────────────────────────────────────────────────────────

function submitToShishya(st: RuntimeState, text: string): void {
  writeToSession(st.agentId, text)
  // 400ms gap gives the TUI time to render the typed text before Enter arrives.
  // On a freshly spawned session this is more reliable than 200ms.
  setTimeout(() => writeToSession(st.agentId, '\r'), 400)
}

function flushQueue(st: RuntimeState): void {
  if (st.queue.length === 0 || !st.promptReady) return
  const msg = st.queue.shift()!
  st.promptReady = false
  submitToShishya(st, msg)
  setAvastha(st.agentId, 'working')
  resetWatchdog(st)
  log(st.agentId, 'shishya:sandesh-sent', { preview: msg.slice(0, 80) })
}

function resetWatchdog(st: RuntimeState): void {
  if (st.watchdogTimer) clearTimeout(st.watchdogTimer)
  st.watchdogTimer = setTimeout(() => {
    try {
      const pending = readdirSync(inboxDir(st.agentId)).filter(f => f.endsWith('.json'))
      if (pending.length > 0) processInbox(st)
      else setAvastha(st.agentId, 'vighna')
    } catch { setAvastha(st.agentId, 'vighna') }
  }, WATCHDOG_MS)
}

// ─── Inbox processing ─────────────────────────────────────────────────────────

function processInbox(st: RuntimeState): void {
  let files: string[]
  try { files = readdirSync(inboxDir(st.agentId)).filter(f => f.endsWith('.json')) }
  catch { return }
  if (files.length === 0) return

  if (!st.spawned) spawnShishya(st)

  for (const file of files) {
    const filePath = join(inboxDir(st.agentId), file)
    try {
      const sandesh = JSON.parse(readFileSync(filePath, 'utf8'))
      const prompt = `[Aadesh from ${sandesh.from}]: ${sandesh.body}`
      unlinkSync(filePath)

      if (st.promptReady) {
        st.promptReady = false
        submitToShishya(st, prompt)
        setAvastha(st.agentId, 'working')
        resetWatchdog(st)
        log(st.agentId, 'shishya:sandesh-delivered', { id: sandesh.id })
      } else {
        st.queue.push(prompt)
        log(st.agentId, 'shishya:sandesh-queued', { id: sandesh.id })
      }
    } catch { /* skip malformed */ }
  }
}

// ─── Runtime lifecycle ────────────────────────────────────────────────────────

function createRuntime(agentId: string): RuntimeState {
  const kshetra = join(sabhaHome, 'agents', agentId, 'workspace')
  mkdirSync(inboxDir(agentId), { recursive: true })

  const st: RuntimeState = {
    agentId, kshetra, spawned: false, spawnedAt: 0, promptReady: false,
    queue: [], inboxWatcher: null, silenceTimer: null,
    promptSilenceTimer: null, watchdogTimer: null
  }

  const inbox = inboxDir(agentId)
  if (existsSync(inbox)) {
    st.inboxWatcher = watch(inbox, (event, filename) => {
      if (event === 'rename' && filename?.endsWith('.json')) {
        setTimeout(() => processInbox(st), 150)
      }
    })
  }

  // Deliver any messages that arrived before the runtime started
  setTimeout(() => processInbox(st), 200)

  runtimes.set(agentId, st)
  log(agentId, 'shishya:runtime-started', {})
  return st
}

function destroyRuntime(st: RuntimeState): void {
  st.inboxWatcher?.close()
  if (st.silenceTimer)       clearTimeout(st.silenceTimer)
  if (st.promptSilenceTimer) clearTimeout(st.promptSilenceTimer)
  if (st.watchdogTimer)      clearTimeout(st.watchdogTimer)
  if (st.spawned) removeDataListener(st.agentId, (data) => onOutput(st, data))
  runtimes.delete(st.agentId)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function startShishyaRuntimes(
  config: HarnessConfig,
  sender: () => WebContents | null
): void {
  sabhaHome = config.sabhaHome
  resolvedCmd = resolveClaudeCommand(config.defaultCommand)
  getSender = sender

  const agentsDir = join(sabhaHome, 'agents')
  try {
    readdirSync(agentsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== 'chanakya')
      .filter(d => existsSync(identityPath(d.name)))
      .forEach(d => createRuntime(d.name))
  } catch { /* agents dir not ready */ }
}

/** Call when a new shishya is added live (from sabha:addAgent). */
export function addShishyaRuntime(agentId: string): void {
  if (!sabhaHome || runtimes.has(agentId)) return
  createRuntime(agentId)
}

/** Fired by the hook server on Stop events — drives the prompt-ready loop. */
export function notifyShishyaStop(agentId: string): void {
  const st = runtimes.get(agentId)
  if (!st) return
  markPromptReady(st)
  setTimeout(() => processInbox(st), 100)
}

export function stopAllShishyas(): void {
  for (const st of runtimes.values()) destroyRuntime(st)
}
