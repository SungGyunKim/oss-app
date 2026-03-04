import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('osstemDesktopApp', {
  sessionExpired: (): void => {
    ipcRenderer.send('session-expired')
  },
  openPostRoom: (roomId: string): void => {
    if (typeof roomId !== 'string' || roomId.trim() === '') return
    ipcRenderer.send('open-post-room', roomId)
  },
  onToastData: (callback: (data: unknown) => void): void => {
    ipcRenderer.on('toast-data', (_event, data) => callback(data))
  }
})
