import { contextBridge, ipcRenderer } from 'electron'
import { ToastData } from '../shared/types'

contextBridge.exposeInMainWorld('osstemDesktopApp', {
  openPostRoom: (roomId: string): void => {
    if (typeof roomId !== 'string' || roomId.trim() === '') return
    ipcRenderer.send('open-post-room', roomId)
  },
  onToastData: (callback: (data: ToastData) => void): void => {
    ipcRenderer.on('toast-data', (_event, data) => callback(data))
  },
  toastClicked: (): void => {
    ipcRenderer.send('toast-clicked')
  },
  getAutoLaunch: (): Promise<boolean> => ipcRenderer.invoke('get-auto-launch'),
  setAutoLaunch: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke('set-auto-launch', enabled),
  getSettings: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('get-settings'),
  updateSettings: (partial: Record<string, unknown>): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('update-settings', partial)
})
