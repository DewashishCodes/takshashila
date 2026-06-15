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
    getAgents: (): Promise<AgentIdentity[]> =>
      ipcRenderer.invoke('sabha:getAgents'),

    sendAadesh: (text: string): Promise<string> =>
      ipcRenderer.invoke('sabha:sendAadesh', text),

    getBlackboard: (): Promise<string> =>
      ipcRenderer.invoke('sabha:getBlackboard'),

    updateBlackboard: (content: string): Promise<void> =>
      ipcRenderer.invoke('sabha:updateBlackboard', content),

    getItihas: (limit?: number): Promise<ItihasEntry[]> =>
      ipcRenderer.invoke('sabha:getItihas', limit),

    onSandesh: (cb: (msg: Sandesh) => void): (() => void) => {
      const listener = (_: Electron.IpcRendererEvent, msg: Sandesh): void => cb(msg)
      ipcRenderer.on('sabha:sandesh', listener)
      return () => ipcRenderer.removeListener('sabha:sandesh', listener)
    },

    onAvashtaChange: (cb: (update: AvashtaUpdate) => void): (() => void) => {
      const listener = (_: Electron.IpcRendererEvent, update: AvashtaUpdate): void => cb(update)
      ipcRenderer.on('sabha:avastha-change', listener)
      return () => ipcRenderer.removeListener('sabha:avastha-change', listener)
    },

    addAgent: (name: string, domain: string, persona: string): Promise<AgentIdentity> =>
      ipcRenderer.invoke('sabha:addAgent', name, domain, persona)
  },

  anumati: {
    getPending: (): Promise<AnumatiItem[]> =>
      ipcRenderer.invoke('anumati:getPending'),

    respond: (id: string, approved: boolean): Promise<void> =>
      ipcRenderer.invoke('anumati:respond', id, approved),

    onNew: (cb: (item: AnumatiItem) => void): (() => void) => {
      const listener = (_: Electron.IpcRendererEvent, item: AnumatiItem): void => cb(item)
      ipcRenderer.on('anumati:new', listener)
      return () => ipcRenderer.removeListener('anumati:new', listener)
    }
  },

  smriti: {
    getAgentSmriti: (agentId: string): Promise<string> =>
      ipcRenderer.invoke('smriti:getAgentSmriti', agentId),

    search: (query: string): Promise<SmritiResult[]> =>
      ipcRenderer.invoke('smriti:search', query),

    update: (agentId: string, content: string): Promise<void> =>
      ipcRenderer.invoke('sabha:updateSmriti', agentId, content)
  },

  fs: {
    listDir: (agentId: string, rel: string): Promise<FsEntry[]> =>
      ipcRenderer.invoke('fs:listDir', agentId, rel),

    readFile: (agentId: string, rel: string): Promise<string> =>
      ipcRenderer.invoke('fs:readFile', agentId, rel),

    writeFile: (agentId: string, rel: string, content: string): Promise<void> =>
      ipcRenderer.invoke('fs:writeFile', agentId, rel, content)
  },

  git: {
    status: (agentId: string): Promise<GitStatus> =>
      ipcRenderer.invoke('git:status', agentId),

    log: (agentId: string, limit?: number): Promise<GitCommit[]> =>
      ipcRenderer.invoke('git:log', agentId, limit),

    branches: (agentId: string): Promise<string[]> =>
      ipcRenderer.invoke('git:branches', agentId)
  },

  config: {
    get: (): Promise<HarnessConfig> =>
      ipcRenderer.invoke('config:get'),

    set: (partial: Partial<HarnessConfig>): Promise<void> =>
      ipcRenderer.invoke('config:set', partial)
  },

  system: {
    check: (): Promise<SystemCheckItem[]> =>
      ipcRenderer.invoke('system:check')
  },

  chanakya: {
    status: (): Promise<string> =>
      ipcRenderer.invoke('chanakya:status'),

    restart: (): Promise<void> =>
      ipcRenderer.invoke('chanakya:restart'),

    anumatiRespond: (approved: boolean): Promise<void> =>
      ipcRenderer.invoke('chanakya:anumati-respond', approved)
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
  command?: string
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
  onboarded: boolean
}

interface SystemCheckItem {
  id: string
  label: string
  found: boolean
  detail: string
  required: boolean
}
