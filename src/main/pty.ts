import { ipcMain, WebContents } from 'electron'
import * as pty from 'node-pty'
import { platform } from 'os'

interface PtySession {
  process: pty.IPty
  agentId: string
}

const sessions = new Map<string, PtySession>()

// Default shell per platform
const DEFAULT_SHELL = platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash'

export function registerPtyHandlers(getSender: () => WebContents | null): void {
  ipcMain.handle('pty:spawn', (_event, agentId: string, opts: SpawnOpts) => {
    if (sessions.has(agentId)) {
      sessions.get(agentId)!.process.kill()
      sessions.delete(agentId)
    }

    const shell = opts.command || DEFAULT_SHELL
    const args = opts.args || []

    const proc = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: opts.cols ?? 80,
      rows: opts.rows ?? 24,
      cwd: opts.cwd || process.env.USERPROFILE || process.env.HOME || 'C:\\',
      env: { ...process.env, ...opts.env } as Record<string, string>
    })

    proc.onData((data) => {
      const sender = getSender()
      if (sender && !sender.isDestroyed()) {
        sender.send(`pty:data:${agentId}`, data)
      }
    })

    proc.onExit(({ exitCode }) => {
      sessions.delete(agentId)
      const sender = getSender()
      if (sender && !sender.isDestroyed()) {
        sender.send(`pty:exit:${agentId}`, exitCode)
      }
    })

    sessions.set(agentId, { process: proc, agentId })
    return agentId
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
