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
    const socketInstance = io({
      path: '/api/socket',
    })

    socketInstance.on('connect', () => {
      console.log('Connected to server')
      setIsConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server')
      setIsConnected(false)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.close()
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