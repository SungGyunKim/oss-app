import { app, screen, ipcMain, BrowserWindow } from 'electron'
import path from 'path'
import { URL, MCS_ORIGIN, WINDOW_CONFIG, TOAST_DURATION_MS } from '../shared/config'
import { isLoggedIn, onAuthChange, logout } from './auth'
import * as windowManager from './window-manager'
import { createTray, updateTrayMenu, destroyTray } from './tray'
import { registerIpcHandlers } from './ipc-handlers'
import { connectWebSocket, disconnectWebSocket } from './post-websocket'
import { fetchCurrentUser, getCurrentUser, isBusiness, clearCurrentUser } from './current-user'
import { ToastData } from '../shared/types'

let loggedIn = false

function showLogin(): void {
  windowManager.createWindow(
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


function showPostRoom(roomId: string): void {
  const postRoomUrl = `${MCS_ORIGIN}/talk/?roomId=${roomId}`
  const windowId = `chat-${roomId}`

  windowManager.createWindow(
    windowId,
    {
      width: WINDOW_CONFIG.chat.width,
      height: WINDOW_CONFIG.chat.height
    },
    postRoomUrl
  )
}

function showToast(data: ToastData): void {
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
      preload: path.join(__dirname, '../preload/index.js'),
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

  const onToastClicked = (): void => {
    clicked = true
    if (!win.isDestroyed()) win.close()
  }
  ipcMain.on('toast-clicked', onToastClicked)

  win.on('closed', () => {
    ipcMain.removeListener('toast-clicked', onToastClicked)
    if (clicked) {
      showPostRoom(data.roomId)
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

  // Fetch profile and connect WebSocket for notifications
  await fetchCurrentUser()
  const currentUser = getCurrentUser()!
  const memId = isBusiness() ? currentUser.customerId : String(currentUser.integrationMemberNumber)
  await connectWebSocket(memId, showToast)
}

async function handleLogout(): Promise<void> {
  loggedIn = false
  disconnectWebSocket()
  clearCurrentUser()
  updateTrayMenu(false)
  await logout()
  windowManager.closeAll()
  showLogin()
}

async function handleSessionExpired(): Promise<void> {
  await handleLogout()
}

// Single instance lock — prevent duplicate processes
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', async () => {
    if (await isLoggedIn()) {
      const main = windowManager.getWindow('main')
      if (main) {
        if (main.isMinimized()) main.restore()
        main.show()
        main.focus()
      } else {
        showMain()
      }
    } else {
      showLogin()
    }
  })
}

app.whenReady().then(async () => {
  // Register IPC handlers
  registerIpcHandlers({
    onSessionExpired: handleSessionExpired,
    onShowPostRoom: showPostRoom
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
    await fetchCurrentUser()
    const currentUser = getCurrentUser()!
    const memId = isBusiness()
      ? currentUser.customerId
      : String(currentUser.integrationMemberNumber)
    await connectWebSocket(memId, showToast)
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
