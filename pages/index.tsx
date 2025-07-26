import React, { useContext, useState, useEffect } from 'react'
import { ChatContext } from './_app'
import ChatRoom from '../components/ChatRoom'
import LoginForm from '../components/LoginForm'

export default function Home() {
  const { userType, socket, setUserType, setUserName } = useContext(ChatContext)
  const [isLoading, setIsLoading] = useState(false)
  const [waitingTime, setWaitingTime] = useState(0)

  useEffect(() => {
    if (!socket) return

    // Listen for approved event (for guests)
    const handleApproved = (data: { userName: string }) => {
      console.log('Guest approved! Redirecting to chat room...', data)
      setUserType('guest')
      setUserName(data.userName)
    }

    // Listen for kicked event (for guests)
    const handleKicked = () => {
      console.log('Guest kicked! Redirecting to login...')
      setUserType(null)
    }

    // Listen for rejected event (for guests)
    const handleRejected = () => {
      console.log('Guest rejected! Redirecting to login...')
      setUserType(null)
      setUserName('') // Clear the username as well
    }

    // Add debugging for all socket events
    socket.on('connect', () => {
      console.log('Socket connected with ID:', socket.id)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    socket.on('approved', handleApproved)
    socket.on('kicked', handleKicked)
    socket.on('rejected', handleRejected)

    return () => {
      socket.off('approved', handleApproved)
      socket.off('kicked', handleKicked)
      socket.off('rejected', handleRejected)
    }
  }, [socket, setUserType, setUserName])

  // Add timeout for pending users
  useEffect(() => {
    if (userType === 'pending') {
      const interval = setInterval(() => {
        setWaitingTime(prev => {
          const newTime = prev + 1
          // Auto-redirect after 5 minutes (300 seconds)
          if (newTime >= 300) {
            console.log('Auto-redirecting due to timeout')
            setUserType(null)
            setUserName('')
            return 0
          }
          return newTime
        })
      }, 1000)

      return () => clearInterval(interval)
    } else {
      setWaitingTime(0)
    }
  }, [userType, setUserType, setUserName])

  if (!socket) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Connecting to chat server...</p>
        </div>
      </div>
    )
  }

  if (!userType) {
    return <LoginForm />
  }

  if (userType === 'pending') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="text-xl font-semibold mt-4 mb-2">Waiting for Approval</h2>
          <p className="text-gray-600">Please wait while the admin reviews your request to join the chat.</p>
          <div className="mt-4 text-sm text-blue-600">
            You will be automatically redirected when approved or rejected!
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Waiting time: {Math.floor(waitingTime / 60)}:{(waitingTime % 60).toString().padStart(2, '0')}
          </div>
          <div className="mt-4 space-y-2">
            <button
              onClick={() => {
                if (socket) {
                  socket.emit('cancelRequest')
                }
                setUserType(null)
                setUserName('')
              }}
              className="text-sm text-red-600 hover:text-red-800 underline block"
            >
              Cancel Request
            </button>
            <button
              onClick={() => {
                // Force refresh the page as a fallback
                window.location.reload()
              }}
              className="text-sm text-gray-600 hover:text-gray-800 underline block"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <ChatRoom />
} 