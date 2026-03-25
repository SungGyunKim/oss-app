import { BrowserWindow, session } from 'electron'
import { URL } from '../shared/config'

export const TOKEN_NAME = 'osstem_token'
const PLYN_NAME = 'plyn'

let isRefreshing = false
let isLoggingOut = false

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

export async function getAuthToken(): Promise<string | undefined> {
  const cookies = await getAllCookies()
  return cookies.find((c) => c.name === TOKEN_NAME)?.value
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookies = await getAllCookies()
  if (!cookies.find((c) => c.name === TOKEN_NAME)) return undefined
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

export function onAuthChange(
  callback: (isNowLoggedIn: boolean, isTokenRefresh: boolean) => void
): void {
  session.defaultSession.cookies.on('changed', (_event, cookie, _cause, removed) => {
    if (!cookie.name.startsWith('_ga')) {
      console.log('[onAuthChange] cookie changed:', cookie.name, removed ? 'removed' : 'set')
    }
    if (cookie.name === TOKEN_NAME) {
      callback(!removed, isRefreshing || isLoggingOut)
    }
  })
}

/** 숨겨진 BrowserWindow에서 URL을 로드하고, osstem_token 쿠키 변경을 감지하여 완료 처리 */
function loadWithCookieWatch(
  url: string,
  tokenRemoved: boolean,
  timeoutMs: number
): Promise<boolean> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      cleanup()
      resolve(false)
    }, timeoutMs)

    const onCookieChanged = (
      _event: Electron.Event,
      cookie: Electron.Cookie,
      _cause: string,
      removed: boolean
    ): void => {
      if (cookie.name === TOKEN_NAME && removed === tokenRemoved) {
        cleanup()
        resolve(true)
      }
    }

    function cleanup(): void {
      clearTimeout(timeout)
      session.defaultSession.cookies.removeListener('changed', onCookieChanged)
      if (!win.isDestroyed()) win.close()
    }

    session.defaultSession.cookies.on('changed', onCookieChanged)
    win.loadURL(url)
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
    const success = await loadWithCookieWatch(URL.SSO_REFRESH, false, 1_000)
    console.log('[auth] token refresh', success ? 'succeeded' : 'timed out')
    return success
  } finally {
    isRefreshing = false
  }
}

export async function logout(): Promise<void> {
  if (isLoggingOut) return
  isLoggingOut = true
  console.log('[auth] attempting logout')

  try {
    const success = await loadWithCookieWatch(URL.LOGOUT, true, 1_000)
    console.log('[auth] logout', success ? 'succeeded' : 'timed out')
  } finally {
    isLoggingOut = false
  }
}
