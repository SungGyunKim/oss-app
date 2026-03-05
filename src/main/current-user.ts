import { net, session } from 'electron'
import { API_URL } from '../shared/config'
import { UserProfile } from '../shared/types'

let currentUser: UserProfile | null = null

export async function fetchCurrentUser(): Promise<UserProfile> {
  const cookies = await session.defaultSession.cookies.get({})
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

  const response = await net.fetch(API_URL.MEMBER_PROFILE, {
    headers: { Cookie: cookieHeader }
  })

  if (!response.ok) {
    throw new Error(`Profile API failed: ${response.status}`)
  }

  const json = await response.json()
  currentUser = json.data as UserProfile
  console.log('[Profile] Fetched:', currentUser.memberName, currentUser.integrationMemberNumber)
  return currentUser
}

export function getCurrentUser(): UserProfile | null {
  return currentUser
}

export function isPersonal(): boolean {
  return currentUser?.authorities.includes('ROLE_INDV') ?? false
}

export function isBusiness(): boolean {
  const auth = currentUser?.authorities ?? []
  return auth.includes('ROLE_BIZMN') || auth.includes('ROLE_STAFF')
}

export function clearCurrentUser(): void {
  currentUser = null
}
