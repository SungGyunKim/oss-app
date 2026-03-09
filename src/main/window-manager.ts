import { app, BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import path from 'path'

const windows = new Map<string, BrowserWindow>()

const defaultWebPreferences: Electron.WebPreferences = {
  preload: path.join(__dirname, '../preload/index.js'),
  contextIsolation: true,
  nodeIntegration: false,
  backgroundThrottling: false
}

export function createWindow(
  id: string,
  options: BrowserWindowConstructorOptions,
  url?: string
): BrowserWindow {
  const existing = windows.get(id)
  if (existing && !existing.isDestroyed()) {
    existing.focus()
    return existing
  }

  const win = new BrowserWindow({
    title: 'OSSTEM',
    icon: path.join(__dirname, '../../assets/icon.ico'),
    ...options,
    webPreferences: {
      ...defaultWebPreferences,
      ...options.webPreferences
    }
  })

  win.setMenuBarVisibility(false)

  // 운영 모드에서 DevTools 단축키 차단
  if (app.isPackaged) {
    win.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
        event.preventDefault()
      }
    })
  }

  windows.set(id, win)

  win.on('closed', () => {
    windows.delete(id)
  })

  if (url) {
    win.loadURL(url)
  }

  return win
}

export function getWindow(id: string): BrowserWindow | undefined {
  const win = windows.get(id)
  if (win && !win.isDestroyed()) return win
  windows.delete(id)
  return undefined
}

export function closeAll(): void {
  for (const [id, win] of windows) {
    if (!win.isDestroyed()) {
      win.removeAllListeners('close')
      win.close()
    }
    windows.delete(id)
  }
}

export function hideWindow(id: string): void {
  const win = getWindow(id)
  if (win) win.hide()
}

export function showWindow(id: string): void {
  const win = getWindow(id)
  if (win) {
    win.show()
    win.focus()
  }
}
