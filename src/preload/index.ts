import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Typed stub — each method will be wired to an IPC handler as milestones progress.
// The shape here is the source of truth for window.takshashila.
const takshashila = {
  pty: {
    spawn: (_opts: SpawnOpts): Promise<string> => Promise.resolve(''),
    write: (_id: string, _data: string): void => {},
    resize: (_id: string, _cols: number, _rows: number): void => {},
    kill: (_id: string): Promise<void> => Promise.resolve(),
    onData: (_id: string, _cb: (data: string) => void): (() => void) => () => {}
  },

  sabha: {
    getAgents: (): Promise<AgentIdentity[]> => Promise.resolve([]),
    sendAadesh: (_text: string): Promise<string> => Promise.resolve(''),
    getBlackboard: (): Promise<string> => Promise.resolve(''),
    getItihas: (_limit?: number): Promise<ItihasEntry[]> => Promise.resolve([]),
    onSandesh: (_cb: (msg: Sandesh) => void): (() => void) => () => {},
    onAvashtaChange: (_cb: (update: AvashtaUpdate) => void): (() => void) => () => {}
  },

  anumati: {
    getPending: (): Promise<AnumatiItem[]> => Promise.resolve([]),
    respond: (_id: string, _approved: boolean): Promise<void> => Promise.resolve(),
    onNew: (_cb: (item: AnumatiItem) => void): (() => void) => () => {}
  },

  smriti: {
    getAgentSmriti: (_agentId: string): Promise<string> => Promise.resolve(''),
    search: (_query: string): Promise<SmritiResult[]> => Promise.resolve([])
  },

  fs: {
    listDir: (_agentId: string, _rel: string): Promise<FsEntry[]> => Promise.resolve([]),
    readFile: (_agentId: string, _rel: string): Promise<string> => Promise.resolve(''),
    writeFile: (_agentId: string, _rel: string, _content: string): Promise<void> =>
      Promise.resolve()
  },

  git: {
    status: (_agentId: string): Promise<GitStatus> =>
      Promise.resolve({ modified: [], staged: [], untracked: [] }),
    log: (_agentId: string, _limit?: number): Promise<GitCommit[]> => Promise.resolve([]),
    branches: (_agentId: string): Promise<string[]> => Promise.resolve([])
  },

  config: {
    get: (): Promise<HarnessConfig> =>
      Promise.resolve({ sabhaHome: '', defaultCommand: 'claude', defaultShell: 'powershell.exe' }),
    set: (_partial: Partial<HarnessConfig>): Promise<void> => Promise.resolve()
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('takshashila', takshashila)
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.takshashila = takshashila
}

// ─── Shared types (also in src/renderer/src/types.ts) ───────────────────────

interface SpawnOpts {
  agentId: string
  command: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
}

interface AgentIdentity {
  id: string
  name: string
  domain: string
  persona: string
  kshetra: string
  avastha: 'idle' | 'working' | 'processing' | 'vighna' | 'siddhi'
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
}
