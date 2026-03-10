import { ipcMain, app } from 'electron'
import { getSettings, updateSettings, Settings } from './settings'

interface IpcCallbacks {
  onSessionExpired: () => void
  onShowPostRoom: (roomId: string) => void
}

export function registerIpcHandlers(callbacks: IpcCallbacks): void {
  ipcMain.on('session-expired', () => {
    callbacks.onSessionExpired()
  })

  ipcMain.on('open-post-room', (_event, roomId: unknown) => {
    if (typeof roomId !== 'string' || roomId.trim() === '') return
    if (!/^[\w-]+$/.test(roomId)) return
    callbacks.onShowPostRoom(roomId)
  })

  ipcMain.handle('get-auto-launch', () => {
    return app.getLoginItemSettings().openAtLogin
  })

  ipcMain.handle('set-auto-launch', (_event, enabled: unknown) => {
    if (typeof enabled !== 'boolean') return
    app.setLoginItemSettings({ openAtLogin: enabled })
  })

  ipcMain.handle('get-settings', () => {
    return getSettings()
  })

  ipcMain.handle('update-settings', (_event, partial: unknown) => {
    if (typeof partial !== 'object' || partial === null || Array.isArray(partial)) return
    return updateSettings(partial as Partial<Settings>)
  })
}
