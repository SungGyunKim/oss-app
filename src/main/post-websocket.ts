import { Client } from '@stomp/stompjs'
import WebSocket from 'ws'
import { WS_POST_URL } from '../shared/config'
import { ToastData } from '../shared/types'
import { getAuthCookie, getAuthToken } from './auth'

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

export async function connectWebSocket(onMessage: (data: ToastData) => void): Promise<void> {
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
      memId: '10523'
    },
    reconnectDelay: 5000,
    debug: (msg) => console.log('[STOMP]', msg),
    onWebSocketError: (err) => console.error('[WS Error]', err),
    onStompError: (frame) => console.error('[STOMP Error]', frame.headers.message, frame.body),
    onConnect: () => {
      console.log('[STOMP] Connected successfully')
      stompClient!.subscribe('/topic/all-message/10523', (frame) => {
        console.log('[STOMP] Received message:', frame.body)
        try {
          const msg: ChatMessage = JSON.parse(frame.body)
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
