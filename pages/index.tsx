import React, { useContext, useState, useEffect } from 'react'
import { ChatContext } from './_app'
import ChatRoom from '../components/ChatRoom'
import LoginForm from '../components/LoginForm'

export default function Home() {
  const { userType, socket, isConnected, setUserType, setUserName } = useContext(ChatContext)
  const [isLoading, setIsLoading] = useState(false)
  const [waitingTime, setWaitingTime] = useState(0)
  const [showRejectedModal, setShowRejectedModal] = useState(false)

  useEffect(() => {
    if (!socket) return

    // Listen for approved event (for guests)
    const handleApproved = (data: { userName: string }) => {
      setUserType('guest')
      setUserName(data.userName)
    }

    // Listen for kicked event (for guests)
    const handleKicked = () => {
      // Don't immediately set userType to null - let ChatRoom handle the kicked event
      // The ChatRoom component will show a modal and handle the redirect
    }

    // Listen for rejected event (for guests)
    const handleRejected = () => {
      setShowRejectedModal(true)
    }

    // Add debugging for all socket events
    socket.on('connect', () => {
      // Socket connected
    })

    socket.on('disconnect', () => {
      // Socket disconnected
    })

    socket.on('approved', handleApproved)
    socket.on('kicked', handleKicked)
    socket.on('rejected', handleRejected)

    // Add a general event listener for debugging
    const originalEmit = socket.emit
    socket.emit = function(event: string, ...args: any[]) {
      return originalEmit.apply(this, [event, ...args])
    }

    return () => {
      socket.off('approved', handleApproved)
      socket.off('kicked', handleKicked)
      socket.off('rejected', handleRejected)
      // Restore original emit
      socket.emit = originalEmit
    }
  }, [socket, setUserType, setUserName, userType])

  // Add timeout for pending users
  useEffect(() => {
    if (userType === 'pending') {
      const interval = setInterval(() => {
        setWaitingTime(prev => {
          const newTime = prev + 1
          // Auto-redirect after 5 minutes (300 seconds)
          if (newTime >= 300) {
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
          <p className="mt-2 text-sm text-gray-500">Please wait while we establish a connection</p>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Connection failed</p>
          <p className="mt-2 text-sm text-gray-500">Unable to connect to the chat server</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry Connection
          </button>
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

        {/* Rejected Modal */}
        {showRejectedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Request Rejected</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Your request to join the chat has been rejected by the admin. You can try again later.
                </p>
                <button
                  onClick={() => {
                    setShowRejectedModal(false)
                    setUserType(null)
                    setUserName('')
                  }}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Return to Login
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return <ChatRoom />
} 