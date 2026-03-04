import { URL } from '../../shared/config'

interface MenuItem {
  id: string
  icon: string
  label: string
  url: string
}

const MENUS: MenuItem[] = [
  { id: 'book', icon: 'bi-calendar-check', label: 'BOOK', url: URL.BOOK },
  { id: 'crm', icon: 'bi-people-fill', label: 'CRM', url: URL.CRM },
  { id: 'post', icon: 'bi-chat-dots-fill', label: 'POST', url: URL.POST },
  { id: 'job', icon: 'bi-briefcase-fill', label: 'JOB', url: URL.JOB },
  { id: 'mypage', icon: 'bi-person-circle', label: 'MY PAGE', url: URL.MY_PAGE }
]

const menuList = document.getElementById('menu-list')!
const webview = document.getElementById('webview') as Electron.WebviewTag

let activeId = ''

function setActive(id: string): void {
  const menu = MENUS.find((m) => m.id === id)
  if (!menu) return

  activeId = id
  webview.src = menu.url

  document.querySelectorAll('.menu-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-id') === id)
  })
}

MENUS.forEach((menu) => {
  const btn = document.createElement('button')
  btn.className = 'menu-btn'
  btn.setAttribute('data-id', menu.id)

  const icon = document.createElement('i')
  icon.className = `bi ${menu.icon}`
  btn.appendChild(icon)

  const tooltip = document.createElement('span')
  tooltip.className = 'tooltip'
  tooltip.textContent = menu.label
  btn.appendChild(tooltip)

  btn.addEventListener('click', () => setActive(menu.id))
  menuList.appendChild(btn)
})

// Open webview DevTools when enabled via env
if (import.meta.env.VITE_OPEN_WEBVIEW_DEVTOOLS === 'true') {
  webview.addEventListener('dom-ready', () => {
    webview.openDevTools()
  })
}

// Default to POST
setActive('post')
