import { ToastData } from '../../shared/types'
import toastSoundUrl from '../../../assets/toast.mp3'

const senderEl = document.getElementById('sender')!
const timeEl = document.getElementById('time')!
const messageEl = document.getElementById('message')!
const avatarLetter = document.getElementById('avatar-letter')!
const toast = document.getElementById('toast')!
const toastAudio = new Audio(toastSoundUrl)

// Receive data from main process via preload (ipcRenderer)
declare const osstemDesktopApp: {
  onToastData: (cb: (data: ToastData) => void) => void
  toastClicked: () => void
}

osstemDesktopApp.onToastData((data) => {
  console.log('[Toast] Received:', data)
  if (!data?.sender) return

  if (data.playSound) {
    toastAudio.currentTime = 0
    toastAudio.play().catch(() => {})
  }

  senderEl.textContent = data.sender
  avatarLetter.textContent = data.sender.charAt(0)
  messageEl.textContent = data.message

  try {
    const date = new Date(data.sentAt)
    timeEl.textContent = date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    timeEl.textContent = ''
  }
})

toast.addEventListener('click', () => {
  osstemDesktopApp.toastClicked()
})
