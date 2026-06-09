import { ipcMain } from 'electron'
import { join, resolve, sep } from 'path'
import { readdir, readFile, writeFile, mkdir, stat } from 'fs/promises'
import type { HarnessConfig } from './config'

function kshetra(sabhaHome: string, agentId: string): string {
  return join(sabhaHome, 'agents', agentId, 'workspace')
}

function safeResolve(root: string, rel: string): string | null {
  const normalRoot = resolve(root)
  const full = resolve(normalRoot, rel || '.')
  if (full !== normalRoot && !full.startsWith(normalRoot + sep)) return null
  return full
}

export function registerFsHandlers(getConfig: () => HarnessConfig): void {
  ipcMain.handle('fs:listDir', async (_event, agentId: string, rel: string) => {
    const root = kshetra(getConfig().sabhaHome, agentId)
    const target = safeResolve(root, rel || '.')
    if (!target) return []
    try {
      const entries = await readdir(target, { withFileTypes: true })
      return entries.map(e => ({
        name: e.name,
        path: join(rel || '.', e.name).replace(/\\/g, '/'),
        isDir: e.isDirectory(),
        size: undefined as number | undefined
      }))
    } catch { return [] }
  })

  ipcMain.handle('fs:readFile', async (_event, agentId: string, rel: string) => {
    const root = kshetra(getConfig().sabhaHome, agentId)
    const target = safeResolve(root, rel)
    if (!target) return ''
    try { return await readFile(target, 'utf8') }
    catch { return '' }
  })

  ipcMain.handle('fs:writeFile', async (_event, agentId: string, rel: string, content: string) => {
    const root = kshetra(getConfig().sabhaHome, agentId)
    const target = safeResolve(root, rel)
    if (!target) throw new Error('Path traversal denied')
    await mkdir(join(target, '..'), { recursive: true })
    await writeFile(target, content, 'utf8')
  })

  ipcMain.handle('fs:stat', async (_event, agentId: string, rel: string) => {
    const root = kshetra(getConfig().sabhaHome, agentId)
    const target = safeResolve(root, rel)
    if (!target) return null
    try {
      const s = await stat(target)
      return { size: s.size, isDir: s.isDirectory(), mtime: s.mtime.toISOString() }
    } catch { return null }
  })
}
