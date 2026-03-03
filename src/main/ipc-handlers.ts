import { ipcMain } from 'electron'

interface IpcCallbacks {
  onSessionExpired: () => void
  onOpenPostRoom: (roomId: string) => void
}

export function registerIpcHandlers(callbacks: IpcCallbacks): void {
  ipcMain.on('session-expired', () => {
    callbacks.onSessionExpired()
  })

  ipcMain.on('open-post-room', (_event, roomId: unknown) => {
    if (typeof roomId !== 'string' || roomId.trim() === '') return
    if (!/^[\w-]+$/.test(roomId)) return
    callbacks.onOpenPostRoom(roomId)
  })
}
