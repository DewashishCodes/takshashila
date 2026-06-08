import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const takshashila = {
  pty: {
    spawn: (agentId: string, opts: SpawnOpts): Promise<string> =>
      ipcRenderer.invoke('pty:spawn', agentId, opts),

    write: (id: string, data: string): void =>
      ipcRenderer.send('pty:write', id, data),

    resize: (id: string, cols: number, rows: number): void =>
      ipcRenderer.send('pty:resize', id, cols, rows),

    kill: (id: string): Promise<void> =>
      ipcRenderer.invoke('pty:kill', id),

    onData: (id: string, cb: (data: string) => void): (() => void) => {
      const channel = `pty:data:${id}`
      const listener = (_: Electron.IpcRendererEvent, data: string): void => cb(data)
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    },

    onExit: (id: string, cb: (code: number) => void): (() => void) => {
      const channel = `pty:exit:${id}`
      const listener = (_: Electron.IpcRendererEvent, code: number): void => cb(code)
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    }
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
