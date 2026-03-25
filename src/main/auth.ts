import { BrowserWindow, net, session } from 'electron'
import { URL } from '../shared/config'

const TOKEN_NAME = 'osstem_token'
const PLYN_NAME = 'plyn'

let isRefreshing = false

async function getAllCookies(): Promise<Electron.Cookie[]> {
  const [denallCookies, osstemCookies] = await Promise.all([
    session.defaultSession.cookies.get({ domain: '.denall.com' }),
    session.defaultSession.cookies.get({ domain: '.osstem.com' })
  ])
  return [...denallCookies, ...osstemCookies]
}

export async function isLoggedIn(): Promise<boolean> {
  const cookies = await getAllCookies()
  return cookies.some((c) => c.name === TOKEN_NAME)
}

export async function hasKeepLogin(): Promise<boolean> {
  const cookies = await getAllCookies()
  return cookies.some((c) => c.name === PLYN_NAME && c.value === 'Y')
}

export function onAuthChange(
  callback: (isNowLoggedIn: boolean, isTokenRefresh: boolean) => void
): void {
  session.defaultSession.cookies.on('changed', (_event, cookie, _cause, removed) => {
    if (!cookie.name.startsWith('_ga')) {
      console.log('[onAuthChange] cookie changed:', cookie.name, removed ? 'removed' : 'set')
    }
    if (cookie.name === TOKEN_NAME) {
      callback(!removed, isRefreshing)
    }
  })
}

/**
 * 숨겨진 BrowserWindow에서 SSO refresh URL을 로드하여 osstem_token을 갱신한다.
 * 성공 시 true, 실패 시 false 반환.
 */
export async function refreshToken(): Promise<boolean> {
  if (isRefreshing) return false
  isRefreshing = true
  console.log('[auth] attempting token refresh')

  try {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    const success = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        console.log('[auth] token refresh timed out')
        if (!win.isDestroyed()) win.close()
        resolve(false)
      }, 15_000)

      // SSO refresh 후 새 osstem_token 쿠키가 설정되면 성공
      const onCookieChanged = (
        _event: Electron.Event,
        cookie: Electron.Cookie,
        _cause: string,
        removed: boolean
      ): void => {
        if (cookie.name === TOKEN_NAME && !removed) {
          clearTimeout(timeout)
          session.defaultSession.cookies.removeListener('changed', onCookieChanged)
          if (!win.isDestroyed()) win.close()
          resolve(true)
        }
      }

      session.defaultSession.cookies.on('changed', onCookieChanged)
      win.loadURL(URL.SSO_REFRESH)
    })

    console.log('[auth] token refresh', success ? 'succeeded' : 'failed')
    return success
  } finally {
    isRefreshing = false
  }
}

export async function getAuthToken(): Promise<string | undefined> {
  const cookies = await getAllCookies()
  return cookies.find((c) => c.name === TOKEN_NAME)?.value
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookies = await getAllCookies()
  if (!cookies.some((c) => c.name === TOKEN_NAME)) return undefined
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

export async function logout(): Promise<void> {
  await net.fetch(URL.LOGOUT)
}
