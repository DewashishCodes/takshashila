import { ipcMain, app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

export interface HarnessConfig {
  sabhaHome: string
  defaultCommand: string
  defaultShell: string
  onboarded: boolean
}

function configDir(): string {
  return join(app.getPath('appData'), 'Takshashila')
}

function configFile(): string {
  return join(configDir(), 'config.json')
}

function defaults(): HarnessConfig {
  return {
    sabhaHome: join(configDir(), 'sabha'),
    defaultCommand: 'claude',
    defaultShell: process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/bash'),
    onboarded: false
  }
}

let _config: HarnessConfig | null = null

export function loadConfig(): HarnessConfig {
  const file = configFile()
  if (!existsSync(file)) {
    _config = defaults()
    return _config
  }
  try {
    _config = { ...defaults(), ...JSON.parse(readFileSync(file, 'utf8')) }
  } catch {
    _config = defaults()
  }
  return _config ?? defaults()
}

export function getConfig(): HarnessConfig {
  if (!_config) return defaults()
  return _config
}

function save(cfg: HarnessConfig): void {
  const dir = configDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(configFile(), JSON.stringify(cfg, null, 2), 'utf8')
}

export function registerConfigHandlers(): void {
  ipcMain.handle('config:get', () => _config ?? defaults())
  ipcMain.handle('config:set', (_event, partial: Partial<HarnessConfig>) => {
    _config = { ...(_config ?? defaults()), ...partial }
    save(_config)
  })
}
