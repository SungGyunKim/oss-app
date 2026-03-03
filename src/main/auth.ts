import { session } from 'electron'

const TOKEN_NAME = 'osstem_token'

export async function isLoggedIn(): Promise<boolean> {
  const [denallCookies, osstemCookies] = await Promise.all([
    session.defaultSession.cookies.get({ domain: '.denall.com' }),
    session.defaultSession.cookies.get({ domain: '.osstem.com' })
  ])
  return [...denallCookies, ...osstemCookies].some((c) => c.name === TOKEN_NAME)
}

export function onAuthChange(callback: (loggedIn: boolean) => void): void {
  session.defaultSession.cookies.on('changed', (_event, cookie, _cause, removed) => {
    if (cookie.name === TOKEN_NAME) {
      callback(!removed)
    }
  })
}

export async function getAuthCookie(): Promise<string | undefined> {
  const [denallCookies, osstemCookies] = await Promise.all([
    session.defaultSession.cookies.get({ domain: '.denall.com' }),
    session.defaultSession.cookies.get({ domain: '.osstem.com' })
  ])
  const token = [...denallCookies, ...osstemCookies].find((c) => c.name === TOKEN_NAME)
  return token ? `${token.name}=${token.value}` : undefined
}
