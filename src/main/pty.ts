import { ipcMain, WebContents } from 'electron'
import * as pty from 'node-pty'
import { platform } from 'os'

interface PtySession {
  process: pty.IPty
  agentId: string
}

type DataListener = (data: string) => void

const sessions = new Map<string, PtySession>()
const extraListeners = new Map<string, Set<DataListener>>()

const DEFAULT_SHELL = platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash'

// ─── Exported helpers (used by chanakya.ts and other supervisors) ─────────────

export function spawnSession(
  agentId: string,
  opts: SpawnOpts,
  getSender?: () => WebContents | null
): string {
  if (sessions.has(agentId)) {
    sessions.get(agentId)!.process.kill()
    sessions.delete(agentId)
  }

  const shell = opts.command || DEFAULT_SHELL
  const proc = pty.spawn(shell, opts.args || [], {
    name: 'xterm-256color',
    cols: opts.cols ?? 220,
    rows: opts.rows ?? 50,
    cwd: opts.cwd || process.env.USERPROFILE || process.env.HOME || 'C:\\',
    env: { ...process.env, ...opts.env } as Record<string, string>
  })

  proc.onData((data) => {
    const sender = getSender?.()
    if (sender && !sender.isDestroyed()) sender.send(`pty:data:${agentId}`, data)
    extraListeners.get(agentId)?.forEach((cb) => cb(data))
  })

  proc.onExit(({ exitCode }) => {
    sessions.delete(agentId)
    const sender = getSender?.()
    if (sender && !sender.isDestroyed()) sender.send(`pty:exit:${agentId}`, exitCode)
  })

  sessions.set(agentId, { process: proc, agentId })
  return agentId
}

export function writeToSession(agentId: string, data: string): void {
  sessions.get(agentId)?.process.write(data)
}

export function addDataListener(agentId: string, cb: DataListener): void {
  if (!extraListeners.has(agentId)) extraListeners.set(agentId, new Set())
  extraListeners.get(agentId)!.add(cb)
}

export function removeDataListener(agentId: string, cb: DataListener): void {
  extraListeners.get(agentId)?.delete(cb)
}

export function hasSession(agentId: string): boolean {
  return sessions.has(agentId)
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

export function registerPtyHandlers(getSender: () => WebContents | null): void {
  ipcMain.handle('pty:spawn', (_event, agentId: string, opts: SpawnOpts) => {
    // If chanakya (or any supervisor) already spawned this session, just attach
    if (sessions.has(agentId)) return agentId
    return spawnSession(agentId, opts, getSender)
  })

  ipcMain.on('pty:write', (_event, agentId: string, data: string) => {
    sessions.get(agentId)?.process.write(data)
  })

  ipcMain.on('pty:resize', (_event, agentId: string, cols: number, rows: number) => {
    sessions.get(agentId)?.process.resize(cols, rows)
  })

  ipcMain.handle('pty:kill', (_event, agentId: string) => {
    const session = sessions.get(agentId)
    if (session) {
      session.process.kill()
      sessions.delete(agentId)
    }
  })
}

export function killAllSessions(): void {
  for (const session of sessions.values()) {
    try { session.process.kill() } catch { /* already dead */ }
  }
  sessions.clear()
}

interface SpawnOpts {
  command?: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
}
