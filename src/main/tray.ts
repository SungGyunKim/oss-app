import { Tray, Menu, nativeImage, app } from 'electron'
import path from 'path'

let tray: Tray | null = null

interface TrayCallbacks {
  onLogin: () => void
  onOpenApp: () => void
  onProfile: () => void
  onLogout: () => void
}

let callbacks: TrayCallbacks

export function createTray(cbs: TrayCallbacks): Tray {
  callbacks = cbs

  const iconPath =
    process.platform === 'darwin'
      ? path.join(__dirname, '../../assets/icon.png')
      : path.join(__dirname, '../../assets/icon.ico')

  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)

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
        { label: '앱 열기', click: () => callbacks.onOpenApp() },
        { label: '계정정보 관리', click: () => callbacks.onProfile() },
        { type: 'separator' },
        { label: '로그아웃', click: () => callbacks.onLogout() },
        { type: 'separator' },
        { label: '종료', click: () => app.exit() }
      ])
    : Menu.buildFromTemplate([
        { label: '로그인', click: () => callbacks.onLogin() },
        { type: 'separator' },
        { label: '종료', click: () => app.exit() }
      ])

  tray.setContextMenu(menu)
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
