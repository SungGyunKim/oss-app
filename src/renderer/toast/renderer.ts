interface ToastData {
  sender: string
  sentAt: string
  message: string
  roomId: string
}

const senderEl = document.getElementById('sender')!
const timeEl = document.getElementById('time')!
const messageEl = document.getElementById('message')!
const avatarLetter = document.getElementById('avatar-letter')!
const toast = document.getElementById('toast')!

// Receive data from main process via preload (ipcRenderer)
declare const osstemDesktopApp: { onToastData: (cb: (data: ToastData) => void) => void }

osstemDesktopApp.onToastData((data) => {
  console.log('[Toast] Received:', data)
  if (!data?.sender) return

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
  // Signal main process that toast was clicked
  document.title = 'toast-clicked'
  window.close()
})
