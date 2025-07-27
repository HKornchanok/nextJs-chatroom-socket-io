export interface Message {
  id: string
  user: string
  message: string
  timestamp: Date
  type: 'message' | 'system'
}

export interface User {
  id: string
  name: string
  type: 'admin' | 'guest'
  socketId: string
  joinedAt?: Date
  lastActivity?: Date
  sessionStartTime?: Date
  sessionWarningSent?: boolean
}

export interface Users {
  admin: User | null
  guest: User | null
  pendingGuests: User[]
} 