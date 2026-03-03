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

// Receive data from main process via ipcRenderer port (webContents.postMessage)
window.addEventListener('message', (event: MessageEvent) => {
  if (!event.ports?.[0]) return
  const port = event.ports[0]
  port.onmessage = (e: MessageEvent<ToastData>) => {
    const { sender, sentAt, message } = e.data
    senderEl.textContent = sender
    avatarLetter.textContent = sender.charAt(0)
    messageEl.textContent = message

    try {
      const date = new Date(sentAt)
      timeEl.textContent = date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      timeEl.textContent = ''
    }
  }
  port.start()
})

toast.addEventListener('click', () => {
  // Signal main process that toast was clicked
  document.title = 'toast-clicked'
  window.close()
})
