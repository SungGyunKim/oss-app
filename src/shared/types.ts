export interface ToastData {
  sender: string
  sentAt: string
  message: string
  roomId: string
  playSound?: boolean
}

export interface UserProfile {
  integrationMemberNumber: number
  memberName: string
  loginId: string
  customerId: string
  customerName: string
  countryCode: string
  languageCode: string
  authorities: string[]
  isMfa: boolean
}
