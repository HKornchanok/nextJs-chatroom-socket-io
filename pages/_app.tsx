import type { AppProps } from 'next/app'
import React, { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import '../styles/globals.css'

interface ChatContextType {
  socket: Socket | null
  isConnected: boolean
  userType: 'admin' | 'guest' | 'pending' | null
  userName: string
  setUserType: (type: 'admin' | 'guest' | 'pending' | null) => void
  setUserName: (name: string) => void
}

export const ChatContext = React.createContext<ChatContextType>({
  socket: null,
  isConnected: false,
  userType: null,
  userName: '',
  setUserType: () => {},
  setUserName: () => {}
})

export default function App({ Component, pageProps }: AppProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [userType, setUserType] = useState<'admin' | 'guest' | 'pending' | null>(null)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    console.log('Initializing Socket.IO connection...')
    
    // Create socket instance with Railway-optimized configuration
    const socketInstance = io({
      path: '/api/socket',
      // Use both polling and WebSocket for Railway (full support)
      transports: ['polling', 'websocket'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true
    })

    console.log('Socket instance created:', socketInstance)

    socketInstance.on('connect', () => {
      console.log('✅ Connected to server with ID:', socketInstance.id)
      setIsConnected(true)
    })

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason)
      setIsConnected(false)
    })

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Connection error:', error)
      setIsConnected(false)
    })

    socketInstance.on('error', (error) => {
      console.error('❌ Socket error:', error)
    })

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts')
      setIsConnected(true)
    })

    socketInstance.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error)
    })

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after all attempts')
    })

    setSocket(socketInstance)

    return () => {
      console.log('Cleaning up socket connection')
      socketInstance.disconnect()
    }
  }, [])

  return (
    <ChatContext.Provider value={{
      socket,
      isConnected,
      userType,
      userName,
      setUserType,
      setUserName
    }}>
      <Component {...pageProps} />
    </ChatContext.Provider>
  )
} 