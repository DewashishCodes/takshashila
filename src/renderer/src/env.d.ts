/// <reference types="vite/client" />

// ─── Shared IPC types (mirrored in src/preload/index.ts) ─────────────────────

type Avastha = 'idle' | 'working' | 'processing' | 'vighna' | 'siddhi'

interface AgentIdentity {
  id: string
  name: string
  domain: string
  persona: string
  kshetra: string
  avastha: Avastha
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
  avastha: Avastha
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

interface SmritiResult {
  agentId: string
  excerpt: string
  score: number
}

interface FsEntry {
  name: string
  path: string
  isDir: boolean
  size?: number
}

interface GitStatus {
  modified: string[]
  staged: string[]
  untracked: string[]
}

interface GitCommit {
  hash: string
  message: string
  author: string
  timestamp: string
}

interface HarnessConfig {
  sabhaHome: string
  defaultCommand: string
  defaultShell: string
  onboarded: boolean
}

interface SystemCheckItem {
  id: string
  label: string
  found: boolean
  detail: string
  required: boolean
}

interface SpawnOpts {
  command?: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
}

// ─── window.takshashila ───────────────────────────────────────────────────────

interface TakshashilaAPI {
  pty: {
    spawn: (agentId: string, opts: SpawnOpts) => Promise<string>
    write: (id: string, data: string) => void
    resize: (id: string, cols: number, rows: number) => void
    kill: (id: string) => Promise<void>
    onData: (id: string, cb: (data: string) => void) => () => void
    onExit: (id: string, cb: (code: number) => void) => () => void
  }
  sabha: {
    getAgents: () => Promise<AgentIdentity[]>
    sendAadesh: (text: string) => Promise<string>
    getBlackboard: () => Promise<string>
    getItihas: (limit?: number) => Promise<ItihasEntry[]>
    onSandesh: (cb: (msg: Sandesh) => void) => () => void
    onAvashtaChange: (cb: (update: AvashtaUpdate) => void) => () => void
    addAgent: (name: string, domain: string, persona: string) => Promise<AgentIdentity>
  }
  anumati: {
    getPending: () => Promise<AnumatiItem[]>
    respond: (id: string, approved: boolean) => Promise<void>
    onNew: (cb: (item: AnumatiItem) => void) => () => void
  }
  smriti: {
    getAgentSmriti: (agentId: string) => Promise<string>
    search: (query: string) => Promise<SmritiResult[]>
    update: (agentId: string, content: string) => Promise<void>
  }
  fs: {
    listDir: (agentId: string, rel: string) => Promise<FsEntry[]>
    readFile: (agentId: string, rel: string) => Promise<string>
    writeFile: (agentId: string, rel: string, content: string) => Promise<void>
  }
  git: {
    status: (agentId: string) => Promise<GitStatus>
    log: (agentId: string, limit?: number) => Promise<GitCommit[]>
    branches: (agentId: string) => Promise<string[]>
  }
  config: {
    get: () => Promise<HarnessConfig>
    set: (partial: Partial<HarnessConfig>) => Promise<void>
  }
  system: {
    check: () => Promise<SystemCheckItem[]>
  }
  chanakya: {
    status: () => Promise<string>
    restart: () => Promise<void>
    anumatiRespond: (approved: boolean) => Promise<void>
  }
}

interface Window {
  takshashila: TakshashilaAPI
  electron: unknown
}
