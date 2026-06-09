import { ipcMain, WebContents } from 'electron'
import { join } from 'path'
import {
  existsSync, readdirSync, readFileSync, writeFileSync,
  unlinkSync, appendFileSync, watch, FSWatcher, mkdirSync
} from 'fs'
import { execSync } from 'child_process'
import { spawnSession, addDataListener, removeDataListener, writeToSession } from './pty'
import type { HarnessConfig } from './config'

// ─── Resolve the claude binary regardless of Electron's stripped PATH ─────────
function resolveClaudeCommand(command: string): string {
  if (command !== 'claude') return command

  try {
    const found = execSync('where.exe claude', { encoding: 'utf8', timeout: 4000 })
    const first = found.split('\n')[0].trim()
    if (first) return first
  } catch { /* fall through */ }

  const home = process.env.USERPROFILE || process.env.HOME || ''
  const candidates = [
    join(home, '.local', 'bin', 'claude.exe'),
    join(home, '.local', 'bin', 'claude'),
    join(process.env.APPDATA || '', 'npm', 'claude.cmd'),
    join(home, 'AppData', 'Roaming', 'npm', 'claude.cmd'),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }

  return command
}

type Avastha = 'idle' | 'working' | 'processing' | 'vighna' | 'siddhi'

const SILENCE_MS  = 4000
const WATCHDOG_MS = 30000

// ─── State ────────────────────────────────────────────────────────────────────
let sabhaHome = ''
let getSender: () => WebContents | null = () => null
let currentAvastha: Avastha = 'idle'
let silenceTimer: NodeJS.Timeout | null = null
let watchdogTimer: NodeJS.Timeout | null = null
let promptSilenceTimer: NodeJS.Timeout | null = null
let inboxWatcher: FSWatcher | null = null

// Claude Code is at the '>' prompt → safe to write
let promptReady = false
const aadeshQueue: string[] = []

// ─── Path helpers ─────────────────────────────────────────────────────────────
const identityPath = (): string => join(sabhaHome, 'agents', 'chanakya', 'identity.json')
const inboxDir     = (): string => join(sabhaHome, 'agents', 'chanakya', 'inbox')
const itihasPath   = (): string => join(sabhaHome, 'itihas.jsonl')
const anumatiDir   = (): string => join(sabhaHome, 'anumati')

// ─── CLAUDE.md — persona injected silently via Claude Code's project context ──
// Writing this file means Claude Code reads it on startup without echoing
// anything to the terminal, avoiding the "system prompt visible" problem.
function ensureChanakyaClaudeMd(kshetra: string): void {
  const mdPath = join(kshetra, 'CLAUDE.md')
  if (existsSync(mdPath)) return
  mkdirSync(kshetra, { recursive: true })
  writeFileSync(mdPath, [
    '# Chanakya — Orchestrator of Takshashila',
    '',
    'You are Chanakya, the GOD orchestrator of Takshashila, an ancient Indian university of AI agents.',
    '',
    '## Mandate format',
    'Samrat (the user) sends mandates as: `[Aadesh from samrat]: <text>`',
    'Process each mandate: handle it directly, or name the specialist agent to delegate to and why.',
    'Always be concise. Do not ask clarifying questions unless strictly necessary.',
    '',
    '## Available specialists',
    '- **Aaruni** — long-running tasks, retries, persistence',
    '- **Nachiketa** — web search, research, information gathering',
    '- **Gargi** — code review, validation, quality checks',
    '- **Bharadwaja** — code writing, builds, technical implementation',
    '- **Chandragupta** — quick tasks, deployments, rapid execution',
    '- **Vishnu Sharma** — documentation, reports, structured writing',
  ].join('\n'), 'utf8')
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function startChanakya(
  config: HarnessConfig,
  sender: () => WebContents | null
): void {
  sabhaHome = config.sabhaHome
  getSender = sender
  promptReady = false
  aadeshQueue.length = 0

  const kshetra = join(sabhaHome, 'agents', 'chanakya', 'workspace')
  ensureChanakyaClaudeMd(kshetra)

  const command = resolveClaudeCommand(config.defaultCommand)
  log('chanakya:spawn-attempt', { command })

  try {
    spawnSession('chanakya', {
      command,
      args: [],
      cwd:  kshetra,
      cols: 220,
      rows: 50,
      env: {
        CLAUDE_CODE_AGENT_ID:   'chanakya',
        CLAUDE_CODE_SABHA_HOME: sabhaHome,
        CLAUDE_CODE_AGENT_ROLE: 'orchestrator'
      }
    }, getSender)
  } catch (err) {
    const msg = (err as Error).message ?? String(err)
    log('chanakya:spawn-error', { command, error: msg })
    const s = getSender()
    const errLine =
      `\r\n\x1b[31m[Takshashila] Could not start Claude: ${msg}\x1b[0m\r\n` +
      `\x1b[33m  resolved command: ${command}\x1b[0m\r\n` +
      `\x1b[33m  Set defaultCommand in config to the full path of claude.exe\x1b[0m\r\n`
    if (s && !s.isDestroyed()) s.send('pty:data:chanakya', errLine)
    return
  }

  addDataListener('chanakya', onOutput)

  // Watch inbox — new .json files = new sandesh to process
  const inbox = inboxDir()
  if (existsSync(inbox)) {
    inboxWatcher = watch(inbox, (event, filename) => {
      if (event === 'rename' && filename?.endsWith('.json')) {
        setTimeout(processInbox, 150)
      }
    })
  }

  log('sabha:chanakya-started', {})
}

// ─── Output handler ───────────────────────────────────────────────────────────

function stripAnsi(s: string): string {
  return s
    // CSI sequences — parameter bytes include 0x30-0x3f which covers ?, <, =, >
    // This handles \x1b[?25h, \x1b[?1049h, \x1b[>c etc. that the old regex missed
    .replace(/\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/g, '')
    // OSC sequences
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    // Character set, DCS, and any remaining ESC + one char
    .replace(/\x1b[()][AB012]/g, '')
    .replace(/\x1b./g, '')
}

function markPromptReady(): void {
  if (promptSilenceTimer) { clearTimeout(promptSilenceTimer); promptSilenceTimer = null }
  if (!promptReady) {
    promptReady = true
    if (aadeshQueue.length > 0) setTimeout(flushAadesh, 50)
  }
}

function onOutput(data: string): void {
  if (currentAvastha === 'idle' || currentAvastha === 'siddhi') {
    setAvastha('working')
  }

  // Avastha silence — 4s no output → idle
  if (silenceTimer) clearTimeout(silenceTimer)
  silenceTimer = setTimeout(() => {
    if (currentAvastha === 'working') setAvastha('idle')
  }, SILENCE_MS)

  // Prompt-ready silence fallback — 1.5s of no output means Claude is at '> '.
  // This fires even when the regex below misses due to residual escape codes.
  if (promptSilenceTimer) clearTimeout(promptSilenceTimer)
  promptSilenceTimer = setTimeout(markPromptReady, 1500)

  const plain = stripAnsi(data)

  // Direct pattern detection (faster path, fires before 1.5s when regex matches)
  if (/(?:^|[\r\n])\s*>\s*$/.test(plain.trimEnd())) {
    markPromptReady()
  }

  // Detect tool-permission prompts
  if (/\(y\/n\b|\bYes\b.*\bNo\b/i.test(plain) && !/\[Aadesh/i.test(plain)) {
    createAnumati(plain)
  }
}

// ─── Aadesh queue + flush ─────────────────────────────────────────────────────

function flushAadesh(): void {
  if (aadeshQueue.length === 0 || !promptReady) return
  const msg = aadeshQueue.shift()!
  promptReady = false
  writeToSession('chanakya', msg + '\r\n')
  setAvastha('working')
  resetWatchdog()
  log('aadesh:sent', { preview: msg.slice(0, 100) })
}

// ─── Avastha ──────────────────────────────────────────────────────────────────

function setAvastha(state: Avastha): void {
  if (currentAvastha === state) return
  currentAvastha = state

  try {
    const path = identityPath()
    if (!existsSync(path)) return
    const identity = JSON.parse(readFileSync(path, 'utf8'))
    identity.avastha = state
    writeFileSync(path, JSON.stringify(identity, null, 2), 'utf8')
  } catch { /* non-fatal */ }

  log('avastha:change', { avastha: state })
}

// ─── Inbox processing (Stop-loop) ─────────────────────────────────────────────

function processInbox(): void {
  let files: string[]
  try {
    files = readdirSync(inboxDir()).filter((f) => f.endsWith('.json'))
  } catch { return }
  if (files.length === 0) return

  for (const file of files) {
    const filePath = join(inboxDir(), file)
    try {
      const sandesh = JSON.parse(readFileSync(filePath, 'utf8'))
      const prompt = `[Aadesh from ${sandesh.from}]: ${sandesh.body}`
      unlinkSync(filePath)

      if (promptReady) {
        promptReady = false
        writeToSession('chanakya', prompt + '\r\n')
        setAvastha('working')
        resetWatchdog()
        log('sandesh:sent', { id: sandesh.id, subject: sandesh.subject })
      } else {
        aadeshQueue.push(prompt)
        log('sandesh:queued', { id: sandesh.id, queueLen: aadeshQueue.length })
      }
    } catch { /* skip malformed */ }
  }
}

// ─── Watchdog ─────────────────────────────────────────────────────────────────

function resetWatchdog(): void {
  if (watchdogTimer) clearTimeout(watchdogTimer)
  watchdogTimer = setTimeout(() => {
    if (currentAvastha !== 'working') return
    log('chanakya:watchdog-fired', {})
    try {
      const pending = readdirSync(inboxDir()).filter((f) => f.endsWith('.json'))
      if (pending.length > 0) {
        processInbox()
      } else {
        setAvastha('vighna')
      }
    } catch { setAvastha('vighna') }
  }, WATCHDOG_MS)
}

// ─── Anumati ──────────────────────────────────────────────────────────────────

function createAnumati(context: string): void {
  if (currentAvastha === 'processing') return

  const id = crypto.randomUUID()
  const item = {
    id,
    from:      'chanakya',
    timestamp: new Date().toISOString(),
    decision:  'tool-permission',
    context:   context.slice(-600).trim()
  }

  try {
    mkdirSync(anumatiDir(), { recursive: true })
    writeFileSync(join(anumatiDir(), `${id}.json`), JSON.stringify(item, null, 2), 'utf8')
    setAvastha('processing')
    log('anumati:created', { id })
    const s = getSender()
    if (s && !s.isDestroyed()) s.send('anumati:new', item)
  } catch { /* non-fatal */ }
}

// ─── Hook-driven Stop-loop ────────────────────────────────────────────────────
// Fired by index.ts when the hook server receives a Stop event from Chanakya's
// Claude Code session. This is the authoritative "finished responding" signal —
// more reliable than output-silence heuristics, which remain as fallback.

export function notifyChanakyaStop(): void {
  markPromptReady()
  setTimeout(processInbox, 100)  // pick up anything that arrived while working
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export function drainInbox(): void {
  setTimeout(processInbox, 50)
}

export function stopChanakya(): void {
  inboxWatcher?.close()
  inboxWatcher = null
  if (silenceTimer)        { clearTimeout(silenceTimer);        silenceTimer        = null }
  if (watchdogTimer)       { clearTimeout(watchdogTimer);       watchdogTimer       = null }
  if (promptSilenceTimer)  { clearTimeout(promptSilenceTimer);  promptSilenceTimer  = null }
  removeDataListener('chanakya', onOutput)
  promptReady = false
  aadeshQueue.length = 0
  log('sabha:chanakya-stopped', {})
}

// ─── IPC ──────────────────────────────────────────────────────────────────────

export function registerChanakyaHandlers(): void {
  ipcMain.handle('chanakya:status', () => currentAvastha)

  ipcMain.handle('chanakya:restart', () => {
    stopChanakya()
  })

  ipcMain.handle('chanakya:anumati-respond', (_event, approved: boolean) => {
    writeToSession('chanakya', approved ? 'y\r\n' : 'N\r\n')
    setAvastha('working')
    log('anumati:responded', { approved })
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(event: string, payload: object): void {
  try {
    const entry = JSON.stringify({ timestamp: new Date().toISOString(), event, agentId: 'chanakya', payload })
    appendFileSync(itihasPath(), entry + '\n', 'utf8')
  } catch { /* non-fatal */ }
}
