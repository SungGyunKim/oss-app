export const MEMBER_ORIGIN = import.meta.env.VITE_MEMBER_ORIGIN
export const MCS_ORIGIN = import.meta.env.VITE_MCS_ORIGIN
const JOB_ORIGIN = import.meta.env.VITE_JOB_ORIGIN

export const URL = {
  LOGIN: `${MEMBER_ORIGIN}/sso-login?channel-id=Mcs`,
  LOGOUT: `${MEMBER_ORIGIN}/sso-logout?channel-id=Mcs`,
  SSO_REFRESH: `${MEMBER_ORIGIN}/sso-refresh?channel-id=Mcs`,
  BOOK: `${MCS_ORIGIN}/desktop/book`,
  CRM: `${MCS_ORIGIN}/desktop/crm`,
  POST: `${MCS_ORIGIN}/talk`,
  JOB: `${JOB_ORIGIN}`,
  MY_PAGE: `${MCS_ORIGIN}/desktop/editInfoHost`
}

export const WS_POST_URL = `${MCS_ORIGIN.replace(/^http/, 'ws')}/mcs/ws`

export const API_URL = {
  MEMBER_PROFILE: `${MEMBER_ORIGIN}/api/mem/member/getProfile`
}

export const TOAST_DURATION_MS = 5000

export const WINDOW_CONFIG = {
  main: { width: 1200, height: 800, minWidth: 800, minHeight: 600 },
  login: { width: 480, height: 750 },
  chat: { width: 500, height: 700 },
  toast: { width: 360, height: 75 },
  settings: { width: 640, height: 440 }
} as const
