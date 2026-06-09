import { ipcMain } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import * as nodeFs from 'fs'
import git from 'isomorphic-git'
import type { HarnessConfig } from './config'

function kshetra(sabhaHome: string, agentId: string): string {
  return join(sabhaHome, 'agents', agentId, 'workspace')
}

export function registerGitHandlers(getConfig: () => HarnessConfig): void {
  const fs = nodeFs

  ipcMain.handle('git:status', async (_event, agentId: string) => {
    const dir = kshetra(getConfig().sabhaHome, agentId)
    if (!existsSync(join(dir, '.git'))) return { modified: [], staged: [], untracked: [] }
    try {
      const matrix = await git.statusMatrix({ fs, dir })
      const modified: string[] = []
      const staged: string[] = []
      const untracked: string[] = []
      for (const [filepath, head, workdir, stage] of matrix) {
        if (head === 0 && workdir === 2 && stage === 0) untracked.push(filepath as string)
        else if (stage !== head) staged.push(filepath as string)
        else if (workdir !== head) modified.push(filepath as string)
      }
      return { modified, staged, untracked }
    } catch { return { modified: [], staged: [], untracked: [] } }
  })

  ipcMain.handle('git:log', async (_event, agentId: string, limit = 20) => {
    const dir = kshetra(getConfig().sabhaHome, agentId)
    if (!existsSync(join(dir, '.git'))) return []
    try {
      const commits = await git.log({ fs, dir, depth: limit })
      return commits.map(c => ({
        hash: c.oid.slice(0, 7),
        message: c.commit.message.split('\n')[0].trim(),
        author: c.commit.author.name,
        timestamp: new Date(c.commit.author.timestamp * 1000).toISOString()
      }))
    } catch { return [] }
  })

  ipcMain.handle('git:branches', async (_event, agentId: string) => {
    const dir = kshetra(getConfig().sabhaHome, agentId)
    if (!existsSync(join(dir, '.git'))) return []
    try { return await git.listBranches({ fs, dir }) }
    catch { return [] }
  })
}
