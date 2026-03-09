import { net, session } from 'electron'
import { URL } from '../shared/config'

const TOKEN_NAME = 'osstem_token'

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

export function onAuthChange(callback: (loggedIn: boolean) => void): void {
  session.defaultSession.cookies.on('changed', (_event, cookie, _cause, removed) => {
    console.log('[onAuthChange] cookie changed:', cookie.name, removed ? 'removed' : 'set')
    if (cookie.name === TOKEN_NAME) {
      callback(!removed)
    }
  })
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
