import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('osstemDesktopApp', {
  sessionExpired: (): void => {
    ipcRenderer.send('session-expired')
  },
  openPostRoom: (roomId: string): void => {
    if (typeof roomId !== 'string' || roomId.trim() === '') return
    ipcRenderer.send('open-post-room', roomId)
  }
})
