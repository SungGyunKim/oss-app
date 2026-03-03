import { Client } from '@stomp/stompjs'
import WebSocket from 'ws'
import { WS_URL } from './config'
import { getAuthCookie } from './auth'

let stompClient: Client | null = null

export interface ChatMessage {
  msgId: string
  roomId: string
  msgTypeCd: string
  msgText: { text: string }
  readCnt: number
  msgDate: string
  senderProfile: {
    memName: string
    intnMemNo: number
    memDvCd: string
    memTlNo: string
    memBirth: string
    memSexDvcd: string
  }
}

export interface NotificationData {
  sender: string
  sentAt: string
  message: string
  roomId: string
}

export async function connectWebSocket(
  onMessage: (data: NotificationData) => void
): Promise<void> {
  if (stompClient?.active) return

  const cookie = await getAuthCookie()
  if (!cookie) return

  stompClient = new Client({
    webSocketFactory: () => {
      return new WebSocket(WS_URL, {
        headers: { Cookie: cookie }
      }) as unknown as globalThis.WebSocket
    },
    reconnectDelay: 5000,
    onConnect: () => {
      stompClient!.subscribe('/topic/all-message', (frame) => {
        try {
          const msg: ChatMessage = JSON.parse(frame.body)
          onMessage({
            sender: msg.senderProfile.memName,
            sentAt: msg.msgDate,
            message: msg.msgText.text,
            roomId: msg.roomId
          })
        } catch {
          // ignore malformed messages
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
