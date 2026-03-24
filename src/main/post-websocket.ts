import { Client } from '@stomp/stompjs'
import { session } from 'electron'
import WebSocket from 'ws'
import { WS_POST_URL } from '../shared/config'
import { ToastData } from '../shared/types'
import { getAuthCookie, getAuthToken } from './auth'
import { fetchCurrentUser, getCurrentUser, isBusiness } from './current-user'

let stompClient: Client | null = null

export interface ChatMessage {
  msgId: string
  roomId: string
  roomName?: string
  roomTypeCd?: string
  msgTypeCd: string
  msgText: { text: string }
  msgDate: string
  senderProfile: {
    memName: string
    intnMemNo: number
    custId?: string
    memDvCd: string
  }
}

export async function connectWebSocket(
  memId: string,
  onMessage: (data: ToastData) => void
): Promise<void> {
  if (stompClient?.active) return

  const cookie = await getAuthCookie()
  const token = await getAuthToken()
  if (!cookie || !token) return

  stompClient = new Client({
    webSocketFactory: () => {
      return new WebSocket(WS_POST_URL, {
        headers: { Cookie: cookie }
      }) as unknown as globalThis.WebSocket
    },
    connectHeaders: {
      memId
    },
    reconnectDelay: 5000,
    debug: (msg) => console.log('[STOMP]', msg),
    onWebSocketError: (err) => console.error('[WS Error]', err),
    onStompError: (frame) => console.error('[STOMP Error]', frame.headers.message, frame.body),
    onConnect: () => {
      console.log('[STOMP] Connected successfully')
      stompClient!.subscribe(`/topic/all-message/${memId}`, (frame) => {
        console.log('[STOMP] Received message:', frame.body)
        try {
          const msg: ChatMessage = JSON.parse(frame.body)

          // 같은 사업자(BIZMN) 간 메시지는 토스트 알림 억제
          if (
            isBusiness() &&
            msg.senderProfile.memDvCd === 'BIZMN' &&
            msg.senderProfile.custId === getCurrentUser()?.customerId
          ) {
            return
          }

          onMessage({
            sender: msg.senderProfile.memName,
            sentAt: msg.msgDate,
            message: msg.msgText.text,
            roomId: msg.roomId
          })
        } catch (err) {
          console.error('[STOMP] Failed to parse message:', err)
        }
      })
    }
  })

  stompClient.activate()
}

export function disconnectWebSocket(): void {
  if (stompClient?.active) {
    stompClient.deactivate()
  }
  stompClient = null
}

const TOKEN_NAME = 'osstem_token'

/** 로그인 후 호출. isMfa면 즉시 연결, 아니면 토큰 변경 대기 후 연결 */
export function startPostWebSocket(onMessage: (data: ToastData) => void): void {
  const user = getCurrentUser()
  if (!user) {
    console.log('[STOMP] No currentUser, skipping WebSocket connection')
    return
  }

  console.log('[STOMP] isMfa:', user.isMfa)

  if (user.isMfa) {
    const memId = isBusiness() ? user.customerId : String(user.integrationMemberNumber)
    console.log('[STOMP] MFA verified, connecting WebSocket (memId:', memId, ')')
    connectWebSocket(memId, onMessage)
    return
  }

  console.log('[STOMP] MFA not verified, waiting for token change...')
  let lastToken: string | undefined
  const listener = async (
    _event: Electron.Event,
    cookie: Electron.Cookie,
    _cause: string,
    removed: boolean
  ): Promise<void> => {
    if (cookie.name !== TOKEN_NAME || removed) return
    if (lastToken && cookie.value !== lastToken) {
      console.log('[STOMP] Token changed, re-fetching profile...')
      await fetchCurrentUser()
      const updatedUser = getCurrentUser()
      console.log('[STOMP] Profile re-fetched, isMfa:', updatedUser?.isMfa)
      if (updatedUser?.isMfa) {
        const memId = isBusiness()
          ? updatedUser.customerId
          : String(updatedUser.integrationMemberNumber)
        console.log('[STOMP] MFA confirmed, connecting WebSocket (memId:', memId, ')')
        await connectWebSocket(memId, onMessage)
        session.defaultSession.cookies.removeListener('changed', listener)
      }
    }
    lastToken = cookie.value
  }
  session.defaultSession.cookies.on('changed', listener)
}
