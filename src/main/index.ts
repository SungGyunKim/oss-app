import { app, Menu, screen, ipcMain, BrowserWindow } from 'electron'
import path from 'path'
import { URL, MCS_ORIGIN, WINDOW_CONFIG, TOAST_DURATION_MS } from '../shared/config'
import { isLoggedIn, onAuthChange, logout, hasKeepLogin, refreshToken } from './auth'
import * as windowManager from './window-manager'
import { createTray, updateTrayMenu, destroyTray } from './tray'
import { incrementUnread, resetUnread } from './badge'
import { registerIpcHandlers } from './ipc-handlers'
import { disconnectWebSocket, initPostWebSocket, startPostWebSocket } from './post-websocket'
import { fetchCurrentUser, clearCurrentUser } from './current-user'
import { ToastData } from '../shared/types'
import { getSettings, updateSettings } from './settings'

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
  const existing = windowManager.getWindow('main')
  if (existing) {
    existing.show()
    existing.focus()
    return
  }

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

  // Reset badge when window gains focus
  win.on('focus', () => {
    resetUnread()
  })
}

function showSettings(): void {
  const existing = windowManager.getWindow('settings')
  if (existing) {
    existing.focus()
    return
  }

  const win = windowManager.createWindow('settings', {
    width: WINDOW_CONFIG.settings.width,
    height: WINDOW_CONFIG.settings.height,
    resizable: false,
    title: '환경설정'
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/settings/`)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/settings/index.html'))
  }
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

const TOAST_GAP = 10
const activeToasts = new Map<string, { win: BrowserWindow; timer: ReturnType<typeof setTimeout> }>()

function repositionToasts(): void {
  const { workArea } = screen.getPrimaryDisplay()
  let index = 0
  for (const [, entry] of activeToasts) {
    if (entry.win.isDestroyed()) continue
    const y = workArea.y + workArea.height - (WINDOW_CONFIG.toast.height + TOAST_GAP) * (index + 1)
    entry.win.setPosition(workArea.x + workArea.width - WINDOW_CONFIG.toast.width - TOAST_GAP, y)
    index++
  }
}

function showToast(data: ToastData): void {
  const settings = getSettings()
  if (!settings.notification.showToast) return

  // 해당 대화방 전용 창이 포커스 상태면 알림 억제
  const chatWin = windowManager.getWindow(`chat-${data.roomId}`)
  if (chatWin && chatWin.isFocused()) return

  data.playSound = settings.notification.playSound !== false
  incrementUnread()

  // Reuse existing toast for same roomId
  const existing = activeToasts.get(data.roomId)
  if (existing && !existing.win.isDestroyed()) {
    existing.win.webContents.postMessage('toast-data', data)
    clearTimeout(existing.timer)
    existing.timer = setTimeout(() => {
      if (!existing.win.isDestroyed()) existing.win.close()
    }, TOAST_DURATION_MS)
    return
  }

  const { workArea } = screen.getPrimaryDisplay()
  const stackIndex = activeToasts.size
  const y =
    workArea.y + workArea.height - (WINDOW_CONFIG.toast.height + TOAST_GAP) * (stackIndex + 1)
  let clicked = false

  const win = new BrowserWindow({
    width: WINDOW_CONFIG.toast.width,
    height: WINDOW_CONFIG.toast.height,
    x: workArea.x + workArea.width - WINDOW_CONFIG.toast.width - TOAST_GAP,
    y,
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

  const timer = setTimeout(() => {
    if (!win.isDestroyed()) win.close()
  }, TOAST_DURATION_MS)

  activeToasts.set(data.roomId, { win, timer })

  win.on('closed', () => {
    ipcMain.removeListener('toast-clicked', onToastClicked)
    activeToasts.delete(data.roomId)
    if (clicked) {
      resetUnread()
      showPostRoom(data.roomId)
    }
    repositionToasts()
  })
}

async function handleLogin(): Promise<void> {
  updateTrayMenu(true)

  // Close login window if open
  const loginWin = windowManager.getWindow('login')
  if (loginWin) {
    loginWin.removeAllListeners('close')
    loginWin.close()
  }

  showMain()

  // Fetch profile and connect WebSocket if MFA verified
  await fetchCurrentUser()
  startPostWebSocket()
}

async function handleLogout(): Promise<void> {
  resetUnread()
  disconnectWebSocket()
  clearCurrentUser()
  updateTrayMenu(false)
  await logout()
  windowManager.closeAll()
  showLogin()
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
  // 운영 모드에서 기본 메뉴 제거 (DevTools 메뉴 접근 차단)
  if (app.isPackaged) {
    Menu.setApplicationMenu(null)
  }

  // 첫 설치 시 자동 실행 활성화
  const settings = getSettings()
  if (!settings.general.autoLaunchInitialized) {
    app.setLoginItemSettings({ openAtLogin: true })
    updateSettings({ general: { autoLaunchInitialized: true } })
  }

  // Register IPC handlers
  registerIpcHandlers({
    onShowPostRoom: showPostRoom
  })

  // Create system tray
  createTray({
    onLogin: async () => {
      if (!(await isLoggedIn())) showLogin()
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
    onLogout: () => handleLogout(),
    onSettings: () => showSettings()
  })

  // Listen for auth changes
  onAuthChange(async (isNowLoggedIn, isTokenRefresh) => {
    if (isNowLoggedIn) {
      // 토큰 갱신에 의한 재설정이면 handleLogin 생략 (이미 로그인 상태)
      if (!isTokenRefresh) {
        await handleLogin()
      }
    } else {
      // 토큰 갱신 중 제거 이벤트는 무시 (갱신 과정에서 기존 토큰이 먼저 제거됨)
      if (isTokenRefresh) return
      // osstem_token 만료 — 로그인 유지 여부 확인 후 갱신 시도
      if (await hasKeepLogin()) {
        console.log('[main] keep-login enabled - attempting token refresh')
        const refreshed = await refreshToken()
        if (!refreshed) {
          console.log('[main] token refresh failed - logging out')
          await handleLogout()
        }
      } else {
        console.log('[main] keep-login not set - logging out')
        await handleLogout()
      }
    }
  })

  // Check initial login state
  const initiallyLoggedIn = await isLoggedIn()
  updateTrayMenu(initiallyLoggedIn)

  initPostWebSocket(showToast)

  if (initiallyLoggedIn) {
    showMain()
    await fetchCurrentUser()
    startPostWebSocket()
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
