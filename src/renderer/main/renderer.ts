const MCS_ORIGIN = import.meta.env.VITE_MCS_ORIGIN
const JOB_ORIGIN = import.meta.env.VITE_JOB_ORIGIN

interface MenuItem {
  id: string
  icon: string
  label: string
  url: string
}

const MENUS: MenuItem[] = [
  { id: 'book', icon: 'bi-calendar-check', label: 'BOOK', url: `${MCS_ORIGIN}/desktop/book` },
  { id: 'crm', icon: 'bi-people-fill', label: 'CRM', url: `${MCS_ORIGIN}/desktop/crm` },
  { id: 'post', icon: 'bi-chat-dots-fill', label: 'POST', url: `${MCS_ORIGIN}/mobile/talk` },
  { id: 'job', icon: 'bi-briefcase-fill', label: 'JOB', url: `${JOB_ORIGIN}` },
  {
    id: 'mypage',
    icon: 'bi-person-circle',
    label: 'MY PAGE',
    url: `${MCS_ORIGIN}/desktop/editInfoHost`
  }
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

// Default to POST
setActive('post')
