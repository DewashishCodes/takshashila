import { ipcMain } from 'electron'
import { execFile } from 'child_process'
import type { HarnessConfig } from './config'

export interface SystemCheckItem {
  id: string
  label: string
  found: boolean
  detail: string
  required: boolean
}

function run(cmd: string, args: string[]): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolve) => {
    // shell:true so PATH resolution matches what a PTY session will see
    // (claude is a .cmd shim on Windows — execFile can't run it directly)
    execFile(cmd, args, { shell: true, timeout: 5000, windowsHide: true }, (err, stdout) => {
      resolve({ ok: !err, out: (stdout || '').trim().split('\n')[0]?.trim() ?? '' })
    })
  })
}

async function checkTool(
  id: string, label: string, bin: string, required: boolean, missingHint: string
): Promise<SystemCheckItem> {
  const version = await run(bin, ['--version'])
  return {
    id, label, required,
    found: version.ok,
    detail: version.ok ? version.out : missingHint
  }
}

export async function runSystemChecks(config: HarnessConfig): Promise<SystemCheckItem[]> {
  const [claude, node, git] = await Promise.all([
    checkTool(
      'claude', 'Claude Code CLI', config.defaultCommand || 'claude', true,
      'Not found on PATH — install with: npm install -g @anthropic-ai/claude-code'
    ),
    checkTool(
      'node', 'Node.js (hook shim)', 'node', true,
      'Not found on PATH — hooks cannot report agent avastha without it'
    ),
    checkTool(
      'git', 'Git', 'git', false,
      'Not found — the Git tab will stay empty until agents init repos'
    )
  ])
  return [claude, node, git]
}

export function registerSystemHandlers(getConfig: () => HarnessConfig): void {
  ipcMain.handle('system:check', () => runSystemChecks(getConfig()))
}
