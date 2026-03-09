import { Tray, Menu, nativeImage, NativeImage, app } from 'electron'
import path from 'path'

let tray: Tray | null = null
let originalIcon: NativeImage

interface TrayCallbacks {
  onLogin: () => void
  onOpenApp: () => void
  onLogout: () => void
  onSettings: () => void
}

let callbacks: TrayCallbacks

export function createTray(cbs: TrayCallbacks): Tray {
  callbacks = cbs

  const iconPath =
    process.platform === 'darwin'
      ? path.join(__dirname, '../../assets/icon.png')
      : path.join(__dirname, '../../assets/icon.ico')

  const icon = nativeImage.createFromPath(iconPath)
  originalIcon = icon.isEmpty() ? nativeImage.createEmpty() : icon
  tray = new Tray(originalIcon)

  tray.setToolTip('OSSTEM')

  tray.on('double-click', () => {
    callbacks.onOpenApp()
  })

  updateTrayMenu(false)
  return tray
}

export function updateTrayMenu(loggedIn: boolean): void {
  if (!tray) return

  const menu = loggedIn
    ? Menu.buildFromTemplate([
        { label: '열기', click: () => callbacks.onOpenApp() },
        { type: 'separator' },
        { label: '환경설정', click: () => callbacks.onSettings() },
        { label: '로그아웃', click: () => callbacks.onLogout() },
        { type: 'separator' },
        { label: '종료', click: () => app.exit() }
      ])
    : Menu.buildFromTemplate([
        { label: '로그인', click: () => callbacks.onLogin() },
        { type: 'separator' },
        { label: '환경설정', click: () => callbacks.onSettings() },
        { type: 'separator' },
        { label: '종료', click: () => app.exit() }
      ])

  tray.setContextMenu(menu)
}

export function updateTrayIcon(image: NativeImage | null, unreadCount: number = 0): void {
  if (!tray) return
  tray.setImage(image ?? originalIcon)
  tray.setToolTip(unreadCount > 0 ? `OSSTEM (${unreadCount}개의 새 메시지)` : 'OSSTEM')
}

export function getOriginalTrayIcon(): NativeImage {
  return originalIcon
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
