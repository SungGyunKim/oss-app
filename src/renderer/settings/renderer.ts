declare const osstemDesktopApp: {
  getAutoLaunch: () => Promise<boolean>
  setAutoLaunch: (enabled: boolean) => Promise<void>
  getSettings: () => Promise<Record<string, unknown>>
  updateSettings: (partial: Record<string, unknown>) => Promise<Record<string, unknown>>
}

interface Category {
  id: string
  label: string
}

const categories: Category[] = [
  { id: 'general', label: '일반' },
  { id: 'notifications', label: '알림' }
]

const menu = document.getElementById('settings-menu')!
const content = document.getElementById('settings-content')!

let activeCategory = categories[0].id

function renderMenu(): void {
  menu.innerHTML = ''
  for (const cat of categories) {
    const li = document.createElement('li')
    li.textContent = cat.label
    li.dataset.category = cat.id
    if (cat.id === activeCategory) li.classList.add('active')
    li.addEventListener('click', () => switchCategory(cat.id))
    menu.appendChild(li)
  }
}

function switchCategory(id: string): void {
  activeCategory = id

  for (const li of menu.querySelectorAll('li')) {
    li.classList.toggle('active', li.dataset.category === id)
  }

  for (const section of content.querySelectorAll('section')) {
    const el = section as HTMLElement
    el.classList.toggle('hidden', el.dataset.category !== id)
  }
}

async function initAutoLaunch(): Promise<void> {
  const toggle = document.getElementById('auto-launch-toggle') as HTMLInputElement
  const current = await osstemDesktopApp.getAutoLaunch()
  toggle.checked = current

  toggle.addEventListener('change', () => {
    osstemDesktopApp.setAutoLaunch(toggle.checked)
  })
}

async function initNotification(): Promise<void> {
  const toggle = document.getElementById('notification-toggle') as HTMLInputElement
  const settings = await osstemDesktopApp.getSettings()
  const notification = (settings.notification ?? {}) as Record<string, unknown>
  toggle.checked = notification.showToast !== false

  toggle.addEventListener('change', () => {
    osstemDesktopApp.updateSettings({
      notification: { ...notification, showToast: toggle.checked }
    })
  })
}

renderMenu()
initAutoLaunch()
initNotification()
