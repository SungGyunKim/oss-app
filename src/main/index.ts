import { app, screen, session, net, BrowserWindow } from 'electron'
import path from 'path'
import { URL, WINDOW_CONFIG, TOAST_DURATION_MS, APP_USER_AGENT } from './config'
import { isLoggedIn, onAuthChange } from './auth'
import * as windowManager from './window-manager'
import { createTray, updateTrayMenu, destroyTray } from './tray'
import { registerIpcHandlers } from './ipc-handlers'
import { connectWebSocket, disconnectWebSocket, NotificationData } from './websocket'

let loggedIn = false

function showLogin(): void {
  const win = windowManager.createWindow(
    'login',
    {
      width: WINDOW_CONFIG.login.width,
      height: WINDOW_CONFIG.login.height,
      resizable: false
    },
    URL.LOGIN
  )
}

function showMain(): void {
  const win = windowManager.createWindow('main', {
    width: WINDOW_CONFIG.main.width,
    height: WINDOW_CONFIG.main.height,
    minWidth: WINDOW_CONFIG.main.minWidth,
    minHeight: WINDOW_CONFIG.main.minHeight,
    webPreferences: {
      webviewTag: true
    }
  })

  // Load local renderer HTML
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/main/`)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/main/index.html'))
  }

  // X button hides instead of closing
  win.on('close', (e) => {
    e.preventDefault()
    win.hide()
  })
}

function showProfile(): void {
  windowManager.createWindow(
    'profile',
    {
      width: WINDOW_CONFIG.profile.width,
      height: WINDOW_CONFIG.profile.height,
      resizable: false
    },
    URL.PROFILE
  )
}

function openPostRoom(roomId: string): void {
  const MCS_ORIGIN = import.meta.env.VITE_MCS_ORIGIN
  const chatUrl = `${MCS_ORIGIN}/talk/?roomId=${roomId}`
  const windowId = `chat-${roomId}`

  windowManager.createWindow(
    windowId,
    {
      width: WINDOW_CONFIG.chat.width,
      height: WINDOW_CONFIG.chat.height
    },
    chatUrl
  )
}

function showToast(data: NotificationData): void {
  const { workArea } = screen.getPrimaryDisplay()
  let clicked = false

  const win = new BrowserWindow({
    width: WINDOW_CONFIG.toast.width,
    height: WINDOW_CONFIG.toast.height,
    x: workArea.x + workArea.width - WINDOW_CONFIG.toast.width - 10,
    y: workArea.y + workArea.height - WINDOW_CONFIG.toast.height - 10,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/toast/`)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/toast/index.html'))
  }

  win.webContents.on('did-finish-load', () => {
    win.webContents.postMessage('toast-data', data)
  })

  win.webContents.on('page-title-updated', (_e, title) => {
    if (title === 'toast-clicked') {
      clicked = true
    }
  })

  win.on('closed', () => {
    if (clicked) {
      openPostRoom(data.roomId)
    }
  })

  setTimeout(() => {
    if (!win.isDestroyed()) win.close()
  }, TOAST_DURATION_MS)
}

async function handleLogin(): Promise<void> {
  loggedIn = true
  updateTrayMenu(true)

  // Close login window if open
  const loginWin = windowManager.getWindow('login')
  if (loginWin) {
    loginWin.removeAllListeners('close')
    loginWin.close()
  }

  showMain()

  // Connect WebSocket for notifications
  await connectWebSocket((data) => {
    showToast(data)
  })
}

async function handleLogout(): Promise<void> {
  loggedIn = false
  disconnectWebSocket()
  updateTrayMenu(false)

  // Call logout URL
  const request = net.request(URL.LOGOUT)
  request.on('error', () => {})
  request.end()

  windowManager.closeAll()
  showLogin()
}

function handleSessionExpired(): void {
  handleLogout()
}

app.whenReady().then(async () => {
  // Set User-Agent globally
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] =
      (details.requestHeaders['User-Agent'] || '') + ' ' + APP_USER_AGENT
    callback({ requestHeaders: details.requestHeaders })
  })

  // Register IPC handlers
  registerIpcHandlers({
    onSessionExpired: handleSessionExpired,
    onOpenPostRoom: openPostRoom
  })

  // Create system tray
  createTray({
    onLogin: () => {
      if (!loggedIn) showLogin()
    },
    onOpenApp: async () => {
      if (await isLoggedIn()) {
        const main = windowManager.getWindow('main')
        if (main) {
          main.show()
          main.focus()
        } else {
          showMain()
        }
      } else {
        showLogin()
      }
    },
    onProfile: () => showProfile(),
    onLogout: () => handleLogout()
  })

  // Listen for auth changes
  onAuthChange(async (isNowLoggedIn) => {
    if (isNowLoggedIn && !loggedIn) {
      await handleLogin()
    }
  })

  // Check initial login state
  loggedIn = await isLoggedIn()
  updateTrayMenu(loggedIn)

  if (loggedIn) {
    showMain()
    await connectWebSocket((data) => showToast(data))
  } else {
    showLogin()
  }
})

// Keep app running in tray when all windows closed
app.on('window-all-closed', () => {
  // Do nothing - stay in tray
})

// macOS: hide dock icon (tray-only app)
if (process.platform === 'darwin') {
  app.dock?.hide()
}

app.on('before-quit', () => {
  disconnectWebSocket()
  destroyTray()
  windowManager.closeAll()
})
