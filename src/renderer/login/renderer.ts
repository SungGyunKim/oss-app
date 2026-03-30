import { URL } from '../../shared/config'

const backBtn = document.getElementById('back-btn')!
const loginBtn = document.getElementById('login-btn')!
const webview = document.getElementById('webview') as Electron.WebviewTag

webview.src = URL.LOGIN

function updateBackButton(): void {
  ;(backBtn as HTMLButtonElement).disabled = !webview.canGoBack()
}

backBtn.addEventListener('click', () => {
  if (webview.canGoBack()) webview.goBack()
})

loginBtn.addEventListener('click', () => {
  webview.src = URL.LOGIN
})

webview.addEventListener('did-navigate', updateBackButton)
webview.addEventListener('did-navigate-in-page', updateBackButton)
