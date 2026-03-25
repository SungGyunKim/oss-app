import { Client } from '@stomp/stompjs'
import { session } from 'electron'
import WebSocket from 'ws'
import { WS_POST_URL } from '../shared/config'
import { ToastData } from '../shared/types'
import { getAuthCookie, getAuthToken, TOKEN_NAME } from './auth'
import { fetchCurrentUser, getCurrentUser, isBusiness } from './current-user'

let stompClient: Client | null = null
let onMessageCallback: ((data: ToastData) => void) | null = null

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

export async function connectWebSocket(): Promise<void> {
  if (stompClient?.active) return

  const user = getCurrentUser()
  if (!user?.isMfa || !onMessageCallback) return

  const memId = isBusiness() ? user.customerId : String(user.integrationMemberNumber)
  console.log('[STOMP] Connecting WebSocket (memId:', memId, ')')

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

          onMessageCallback!({
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
    console.log('[STOMP] Disconnecting WebSocket')
  }
  stompClient = null
}

/** 앱 시작 시 1회 호출. 쿠키 변경 리스너를 등록하여 토큰 변경 시 WebSocket 연결/해제 처리 */
export function initPostWebSocket(onMessage: (data: ToastData) => void): void {
  onMessageCallback = onMessage
  session.defaultSession.cookies.on('changed', async (_event, cookie, _cause, removed) => {
    if (cookie.name !== TOKEN_NAME) return
    if (removed) {
      disconnectWebSocket()
      return
    }
    console.log('[STOMP] Token changed, re-fetching profile...')
    await fetchCurrentUser()
    const user = getCurrentUser()
    console.log('[STOMP] Profile re-fetched, isMfa:', user?.isMfa)
    if (user?.isMfa) {
      await connectWebSocket()
    } else {
      console.log('[STOMP] MFA not verified, disconnecting WebSocket')
      disconnectWebSocket()
    }
  })
}
