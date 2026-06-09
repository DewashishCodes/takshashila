import { app, shell, BrowserWindow, WebContents } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerPtyHandlers, killAllSessions } from './pty'
import { loadConfig, getConfig, registerConfigHandlers } from './config'
import { initSabha, closeSabhaWatchers, registerSabhaHandlers, applyHookEvent } from './sabha'
import { registerFsHandlers } from './fs'
import { registerGitHandlers } from './git'
import { startChanakya, stopChanakya, drainInbox, notifyChanakyaStop, registerChanakyaHandlers } from './chanakya'
import { startHookServer, stopHookServer, onHook } from './hooks'

let mainWebContents: WebContents | null = null

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#2C1810',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => {
    win.show()
    mainWebContents = win.webContents
  })

  win.on('closed', () => {
    mainWebContents = null
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.dewashish.takshashila')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const config = loadConfig()

  // Hook server must start BEFORE initSabha (which writes per-agent hook
  // settings) and before any PTY spawn (which injects the pipe path into env)
  startHookServer(config.sabhaHome)

  await initSabha(config.sabhaHome)

  const getSender = (): WebContents | null => mainWebContents

  registerPtyHandlers(getSender)
  registerConfigHandlers()
  registerSabhaHandlers(getSender, getConfig, () => drainInbox())
  registerFsHandlers(getConfig)
  registerGitHandlers(getConfig)
  registerChanakyaHandlers()

  // Hook events: lifecycle signals from Claude Code sessions → avastha + itihas.
  // Chanakya's Stop event also drives the Stop-loop (flush queued aadesh).
  onHook((evt) => {
    applyHookEvent(evt)
    if (evt.event === 'Stop' && evt.agentId === 'chanakya') notifyChanakyaStop()
  })

  // Boot Chanakya — persistent claude session starts here
  startChanakya(config, getSender)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  stopChanakya()
  killAllSessions()
  closeSabhaWatchers()
  stopHookServer()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
