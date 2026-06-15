import { ipcMain, WebContents } from 'electron'
import { join } from 'path'
import {
  existsSync, mkdirSync, writeFileSync, readFileSync,
  readdirSync, unlinkSync, appendFileSync, watch, FSWatcher
} from 'fs'
import { writeFile, readFile, mkdir } from 'fs/promises'
import type { HarnessConfig } from './config'
import { ensureHookSettings, sandeshShimPath, type HookEvent } from './hooks'

// ─── Types (mirrored in preload) ──────────────────────────────────────────────

interface AgentIdentity {
  id: string
  name: string
  domain: string
  persona: string
  kshetra: string
  avastha: 'idle' | 'working' | 'processing' | 'vighna' | 'siddhi'
  lastKriya?: string
}

interface Sandesh {
  id: string
  from: string
  to: string
  timestamp: string
  speech_act: 'request' | 'inform' | 'result' | 'escalate'
  subject: string
  body: string
  aadesh_ref?: string
}

interface AvashtaUpdate {
  agentId: string
  avastha: AgentIdentity['avastha']
  lastKriya?: string
}

interface ItihasEntry {
  timestamp: string
  event: string
  agentId?: string
  payload?: unknown
}

interface AnumatiItem {
  id: string
  from: string
  timestamp: string
  decision: string
  context: string
}

// ─── Agent seeds ──────────────────────────────────────────────────────────────

const AGENT_SEEDS: Omit<AgentIdentity, 'kshetra'>[] = [
  { id: 'chanakya',      name: 'Chanakya',      domain: 'Orchestrator',   persona: 'GOD orchestrator — routes aadesh, adjudicates, escalates', avastha: 'idle' },
  { id: 'aaruni',        name: 'Aaruni',         domain: 'Executor',       persona: 'Long-running tasks, retries, persistence',                  avastha: 'idle' },
  { id: 'nachiketa',     name: 'Nachiketa',      domain: 'Researcher',     persona: 'Web search, research, information gathering',               avastha: 'idle' },
  { id: 'gargi',         name: 'Gargi',          domain: 'Analyst',        persona: 'Code review, validation, quality checks',                   avastha: 'idle' },
  { id: 'bharadwaja',    name: 'Bharadwaja',     domain: 'Engineer',       persona: 'Code writing, builds, technical implementation',            avastha: 'idle' },
  { id: 'chandragupta',  name: 'Chandragupta',   domain: 'Executor-fast',  persona: 'Quick tasks, deployments, rapid execution',                 avastha: 'idle' },
  { id: 'vishnu_sharma', name: 'Vishnu Sharma',  domain: 'Scribe',         persona: 'Documentation, reports, structured writing',                avastha: 'idle' }
]

// ─── Path helpers ─────────────────────────────────────────────────────────────

let sabhaHome = ''

const p = {
  home:        ()                    => sabhaHome,
  blackboard:  ()                    => join(sabhaHome, 'blackboard.md'),
  itihas:      ()                    => join(sabhaHome, 'itihas.jsonl'),
  anumati:     ()                    => join(sabhaHome, 'anumati'),
  agentDir:    (id: string)          => join(sabhaHome, 'agents', id),
  identity:    (id: string)          => join(sabhaHome, 'agents', id, 'identity.json'),
  smriti:      (id: string)          => join(sabhaHome, 'agents', id, 'smriti.md'),
  inbox:       (id: string)          => join(sabhaHome, 'agents', id, 'inbox'),
  outbox:      (id: string)          => join(sabhaHome, 'agents', id, 'outbox'),
  workspace:   (id: string)          => join(sabhaHome, 'agents', id, 'workspace'),
  inboxMsg:    (id: string, s: string) => join(sabhaHome, 'agents', id, 'inbox', `${s}.json`),
  outboxMsg:   (id: string, s: string) => join(sabhaHome, 'agents', id, 'outbox', `${s}.json`),
  anumatiItem: (id: string)          => join(sabhaHome, 'anumati', `${id}.json`)
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initSabha(home: string): Promise<void> {
  sabhaHome = home
  mkdirSync(home, { recursive: true })
  mkdirSync(p.anumati(), { recursive: true })

  if (!existsSync(p.blackboard())) {
    writeFileSync(p.blackboard(), '# Sabha Blackboard\n\nShared context for all Shishyas.\n', 'utf8')
  }
  if (!existsSync(p.itihas())) {
    writeFileSync(p.itihas(), '', 'utf8')
  }

  for (const seed of AGENT_SEEDS) {
    mkdirSync(p.inbox(seed.id),     { recursive: true })
    mkdirSync(p.outbox(seed.id),    { recursive: true })
    mkdirSync(p.workspace(seed.id), { recursive: true })

    if (!existsSync(p.identity(seed.id))) {
      const identity: AgentIdentity = { ...seed, kshetra: p.workspace(seed.id) }
      writeFileSync(p.identity(seed.id), JSON.stringify(identity, null, 2), 'utf8')
    }
    if (!existsSync(p.smriti(seed.id))) {
      writeFileSync(p.smriti(seed.id), `# ${seed.name} — Smriti\n\n`, 'utf8')
    }

    // Hook wiring: .claude/settings.json in each workspace points at the shim
    ensureHookSettings(p.workspace(seed.id), home)

    // Persona file for specialists (chanakya's CLAUDE.md is managed by chanakya.ts)
    if (seed.id !== 'chanakya') {
      const identity: AgentIdentity = { ...seed, kshetra: p.workspace(seed.id) }
      writeShishyaClaudeMd(identity)
    }
  }

  appendItihas({ timestamp: new Date().toISOString(), event: 'sabha:init', payload: { home } })
}

// ─── Itihas ───────────────────────────────────────────────────────────────────

function appendItihas(entry: ItihasEntry): void {
  try {
    appendFileSync(p.itihas(), JSON.stringify(entry) + '\n', 'utf8')
  } catch { /* non-fatal */ }
}

function readItihas(limit = 100): ItihasEntry[] {
  try {
    const raw = readFileSync(p.itihas(), 'utf8')
    const lines = raw.split('\n').filter(Boolean)
    const tail = lines.slice(-limit)
    return tail.map(l => JSON.parse(l) as ItihasEntry)
  } catch { return [] }
}

// ─── Agents ───────────────────────────────────────────────────────────────────

function readAgent(id: string): AgentIdentity | null {
  try { return JSON.parse(readFileSync(p.identity(id), 'utf8')) as AgentIdentity }
  catch { return null }
}

/** All agent ids on disk — seeds first (stable order), custom shishyas after. */
function listAgentIds(): string[] {
  const seedIds = AGENT_SEEDS.map(s => s.id)
  let extra: string[] = []
  try {
    extra = readdirSync(join(sabhaHome, 'agents'), { withFileTypes: true })
      .filter(d => d.isDirectory() && !seedIds.includes(d.name) && existsSync(p.identity(d.name)))
      .map(d => d.name)
      .sort()
  } catch { /* agents dir missing */ }
  return [...seedIds, ...extra]
}

function readAllAgents(): AgentIdentity[] {
  return listAgentIds()
    .map(id => readAgent(id))
    .filter((a): a is AgentIdentity => a !== null)
}

// ─── Per-shishya CLAUDE.md ────────────────────────────────────────────────────
// Gives each specialist an identity so a spawned claude session knows who it is,
// how to receive work (via inbox), and how to report back (via cth-sandesh).

function writeShishyaClaudeMd(identity: AgentIdentity): void {
  const kshetra = identity.kshetra
  mkdirSync(kshetra, { recursive: true })
  const sandeshCmd = `node "${sandeshShimPath(sabhaHome)}"`
  const lines = [
    `# ${identity.name} — ${identity.domain}`,
    '',
    `You are **${identity.name}**, a specialist Shishya of Takshashila.`,
    `**Domain:** ${identity.domain}`,
    `**Persona:** ${identity.persona}`,
    '',
    '## Receiving work',
    'Chanakya sends tasks to your inbox as `[Aadesh from chanakya]: <text>`. Work on them diligently.',
    '',
    '## Reporting results',
    'When your work is done, send results back to Chanakya:',
    '```bash',
    `${sandeshCmd} --to chanakya --subject "<result title>" --body "<summary of what you accomplished>"`,
    '```',
    '',
    '## Smriti (memory) conventions',
    '- Keep smriti.md under 2000 words.',
    '- Record key decisions, findings, and persistent context — not transient task steps.',
    '',
    '## Conduct',
    '- Work within your domain.',
    '- Complete tasks precisely. Report obstacles clearly.',
    '- Do not initiate unsolicited communication.',
  ]
  writeFileSync(join(kshetra, 'CLAUDE.md'), lines.join('\n'), 'utf8')
}

// ─── Add Shishya (M8) ─────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/['']/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function createAgent(name: string, domain: string, persona: string): AgentIdentity {
  const id = slugify(name)
  if (!id) throw new Error('Name must contain letters or digits')
  if (existsSync(p.agentDir(id))) throw new Error(`A shishya named "${id}" already exists`)

  mkdirSync(p.inbox(id),     { recursive: true })
  mkdirSync(p.outbox(id),    { recursive: true })
  mkdirSync(p.workspace(id), { recursive: true })

  const identity: AgentIdentity = { id, name, domain, persona, avastha: 'idle', kshetra: p.workspace(id) }
  writeFileSync(p.identity(id), JSON.stringify(identity, null, 2), 'utf8')
  writeFileSync(p.smriti(id), `# ${name} — Smriti\n\n`, 'utf8')
  ensureHookSettings(p.workspace(id), sabhaHome)
  writeShishyaClaudeMd(identity)

  appendItihas({ timestamp: new Date().toISOString(), event: 'shishya:added', agentId: id, payload: { name, domain } })
  watchAgent(id) // live immediately — no restart needed
  return identity
}

// ─── Sandesh / Mailbox ────────────────────────────────────────────────────────

function newId(): string {
  return crypto.randomUUID()
}

function putInbox(agentId: string, sandesh: Sandesh): void {
  const file = p.inboxMsg(agentId, sandesh.id)
  writeFileSync(file, JSON.stringify(sandesh, null, 2), 'utf8')
}

// ─── Anumati ──────────────────────────────────────────────────────────────────

function readAnumatiItems(): AnumatiItem[] {
  try {
    return readdirSync(p.anumati())
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try { return JSON.parse(readFileSync(join(p.anumati(), f), 'utf8')) as AnumatiItem }
        catch { return null }
      })
      .filter((x): x is AnumatiItem => x !== null)
  } catch { return [] }
}

// ─── Hook events → avastha ────────────────────────────────────────────────────
// Lifecycle events from Claude Code (via the cth-hook shim) drive accurate
// agent states. Writing identity.json triggers the file watcher, which pushes
// the update (including lastKriya) to the renderer — single source of truth.

const HOOK_AVASTHA: Record<string, AgentIdentity['avastha'] | undefined> = {
  SessionStart:     'idle',
  UserPromptSubmit: 'working',
  PreToolUse:       'working',
  PostToolUse:      'working',
  Stop:             'idle'
}

export function applyHookEvent(evt: HookEvent): void {
  const avastha = HOOK_AVASTHA[evt.event]
  appendItihas({
    timestamp: evt.timestamp,
    event: `hook:${evt.event}`,
    agentId: evt.agentId,
    payload: evt.toolName ? { toolName: evt.toolName } : undefined
  })
  if (!avastha) return

  try {
    const idFile = p.identity(evt.agentId)
    if (!existsSync(idFile)) return
    const identity = JSON.parse(readFileSync(idFile, 'utf8')) as AgentIdentity
    identity.avastha = avastha
    if (evt.toolName) identity.lastKriya = evt.toolName
    if (evt.event === 'Stop') identity.lastKriya = undefined
    writeFileSync(idFile, JSON.stringify(identity, null, 2), 'utf8')
  } catch { /* non-fatal */ }
}

// ─── Watchers ─────────────────────────────────────────────────────────────────

const watchers: FSWatcher[] = []
let senderGetter: () => WebContents | null = () => null

/** Watch one agent's outbox (sandesh) + identity.json (avastha) — used at
    startup for every agent on disk and again when a shishya is added live. */
function watchAgent(id: string): void {
  const outboxDir = p.outbox(id)
  if (existsSync(outboxDir)) {
    try {
      const w = watch(outboxDir, (event, filename) => {
        if (event !== 'rename' || !filename?.endsWith('.json')) return
        const file = join(outboxDir, filename)
        if (!existsSync(file)) return
        try {
          const sandesh = JSON.parse(readFileSync(file, 'utf8')) as Sandesh
          const sender = senderGetter()
          if (sender && !sender.isDestroyed()) sender.send('sabha:sandesh', sandesh)
        } catch { /* skip malformed */ }
      })
      watchers.push(w)
    } catch { /* skip if dir unavailable */ }
  }

  const idFile = p.identity(id)
  if (existsSync(idFile)) {
    try {
      const w = watch(idFile, () => {
        const agent = readAgent(id)
        if (!agent) return
        const sender = senderGetter()
        if (sender && !sender.isDestroyed()) {
          const update: AvashtaUpdate = {
            agentId: id,
            avastha: agent.avastha,
            lastKriya: agent.lastKriya
          }
          sender.send('sabha:avastha-change', update)
        }
      })
      watchers.push(w)
    } catch { /* skip */ }
  }
}

function startWatchers(getSender: () => WebContents | null): void {
  senderGetter = getSender

  for (const id of listAgentIds()) watchAgent(id)

  // Watch anumati/ dir for new approval requests
  const anumatiDir = p.anumati()
  if (existsSync(anumatiDir)) {
    try {
      const w = watch(anumatiDir, (event, filename) => {
        if (event !== 'rename' || !filename?.endsWith('.json')) return
        const file = join(anumatiDir, filename)
        if (!existsSync(file)) return
        try {
          const item = JSON.parse(readFileSync(file, 'utf8')) as AnumatiItem
          const sender = getSender()
          if (sender && !sender.isDestroyed()) sender.send('anumati:new', item)
        } catch { /* skip */ }
      })
      watchers.push(w)
    } catch { /* skip */ }
  }
}

export function closeSabhaWatchers(): void {
  for (const w of watchers) { try { w.close() } catch { /* already closed */ } }
  watchers.length = 0
}

// ─── IPC registration ─────────────────────────────────────────────────────────

export function registerSabhaHandlers(
  getSender: () => WebContents | null,
  getConfig: () => HarnessConfig,
  onAadesh?: () => void,
  onAgentAdded?: (id: string) => void
): void {
  // Sabha
  ipcMain.handle('sabha:getAgents', () => readAllAgents())

  ipcMain.handle('sabha:sendAadesh', async (_event, text: string) => {
    const id = newId()
    const now = new Date().toISOString()
    const sandesh: Sandesh = {
      id,
      from: 'samrat',
      to: 'chanakya',
      timestamp: now,
      speech_act: 'request',
      subject: 'aadesh',
      body: text,
      aadesh_ref: id
    }
    putInbox('chanakya', sandesh)
    appendItihas({ timestamp: now, event: 'aadesh:received', agentId: 'chanakya', payload: { id, text } })
    onAadesh?.()  // wake chanakya directly — don't rely on fs.watch
    return id
  })

  ipcMain.handle('sabha:getBlackboard', () => {
    try { return readFileSync(p.blackboard(), 'utf8') } catch { return '' }
  })

  ipcMain.handle('sabha:getItihas', (_event, limit = 100) => readItihas(limit))

  // Anumati
  ipcMain.handle('anumati:getPending', () => readAnumatiItems())

  ipcMain.handle('anumati:respond', (_event, id: string, approved: boolean) => {
    const file = p.anumatiItem(id)
    let item: AnumatiItem | null = null
    try { item = JSON.parse(readFileSync(file, 'utf8')) as AnumatiItem } catch { /* already gone */ }
    if (existsSync(file)) { try { unlinkSync(file) } catch { /* non-fatal */ } }
    appendItihas({
      timestamp: new Date().toISOString(),
      event: approved ? 'anumati:approved' : 'anumati:denied',
      agentId: item?.from,
      payload: { id, decision: item?.decision }
    })
  })

  // Smriti
  ipcMain.handle('smriti:getAgentSmriti', async (_event, agentId: string) => {
    try { return await readFile(p.smriti(agentId), 'utf8') } catch { return '' }
  })

  ipcMain.handle('smriti:search', (_event, query: string) => {
    const q = query.toLowerCase()
    const results: Array<{ agentId: string; excerpt: string; score: number }> = []
    for (const id of listAgentIds()) {
      try {
        const text = readFileSync(p.smriti(id), 'utf8')
        if (!text.toLowerCase().includes(q)) continue
        const idx = text.toLowerCase().indexOf(q)
        const start = Math.max(0, idx - 60)
        const end = Math.min(text.length, idx + 120)
        results.push({ agentId: id, excerpt: text.slice(start, end).trim(), score: 1 })
      } catch { /* skip */ }
    }
    return results
  })

  // Add Shishya (M8)
  ipcMain.handle('sabha:addAgent', (_event, name: string, domain: string, persona: string) => {
    const identity = createAgent(name, domain, persona)
    onAgentAdded?.(identity.id)
    return identity
  })

  // Sabha write helpers (used by future M3+ modules)
  ipcMain.handle('sabha:updateSmriti', async (_event, agentId: string, content: string) => {
    const lines = content.split('\n')
    const capped = lines.slice(-2000).join('\n')
    await writeFile(p.smriti(agentId), capped, 'utf8')
    appendItihas({ timestamp: new Date().toISOString(), event: 'smriti:updated', agentId })
  })

  ipcMain.handle('sabha:updateBlackboard', async (_event, content: string) => {
    await writeFile(p.blackboard(), content, 'utf8')
    appendItihas({ timestamp: new Date().toISOString(), event: 'blackboard:updated' })
  })

  ipcMain.handle('sabha:putAnumati', async (_event, item: AnumatiItem) => {
    await mkdir(p.anumati(), { recursive: true })
    await writeFile(p.anumatiItem(item.id), JSON.stringify(item, null, 2), 'utf8')
    appendItihas({ timestamp: new Date().toISOString(), event: 'anumati:new', agentId: item.from, payload: { id: item.id } })
  })

  void getConfig

  startWatchers(getSender)
}
