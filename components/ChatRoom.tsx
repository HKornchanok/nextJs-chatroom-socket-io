import React, { useState, useEffect, useContext, useRef } from 'react'
import { ChatContext } from '../pages/_app'

interface Message {
  id: string
  user: string
  message: string
  timestamp: Date
  type: 'message' | 'system'
}

interface User {
  id: string
  name: string
  type: 'admin' | 'guest'
  socketId: string
}

interface Users {
  admin: User | null
  guest: User | null
  pendingGuests: User[]
}

export default function ChatRoom() {
  const { socket, userType, userName } = useContext(ChatContext)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [users, setUsers] = useState<Users>({ admin: null, guest: null, pendingGuests: [] })
  const [pendingGuests, setPendingGuests] = useState<User[]>([])
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle typing indicators
  const handleTypingStart = () => {
    if (!socket) return
    socket.emit('typingStart')
  }

  const handleTypingStop = () => {
    if (!socket) return
    socket.emit('typingStop')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Start typing indicator
    handleTypingStart()
    
    // Stop typing indicator after 1 second of no input
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop()
    }, 1000)
  }

  useEffect(() => {
    if (!socket) return

    // Listen for new messages
    socket.on('newMessage', (message: Message) => {
      setMessages(prev => [...prev, message])
    })

    // Listen for typing indicators
    socket.on('userTyping', (data: { userId: string; userName: string; userType: string }) => {
      setTypingUsers(prev => new Set(prev).add(data.userId))
    })

    socket.on('userStoppedTyping', (data: { userId: string }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(data.userId)
        return newSet
      })
    })

    // Listen for user joined events
    socket.on('userJoined', (data: { user: User; type: string }) => {
      setUsers(prev => {
        if (data.type === 'admin') {
          return { ...prev, admin: data.user }
        } else if (data.type === 'guest') {
          return { ...prev, guest: data.user }
        }
        return prev
      })
    })

    // Listen for user left events
    socket.on('userLeft', (data: { userId: string; userType: string }) => {
      console.log('User left:', data)
      setUsers(prev => {
        if (data.userType === 'admin') {
          return { ...prev, admin: null }
        } else if (data.userType === 'guest') {
          return { ...prev, guest: null }
        }
        return prev
      })
      
      // Also remove from pending guests if they were there
      setPendingGuests(prev => prev.filter(guest => guest.id !== data.userId))
      
      // Remove from typing users
      setTypingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(data.userId)
        return newSet
      })
    })

    // Listen for guest requests (admin only)
    socket.on('guestRequest', (data: { user: User }) => {
      setPendingGuests(prev => [...prev, data.user])
    })

    // Request current room state when joining
    socket.emit('getRoomState')

    // Listen for room state update
    socket.on('roomState', (data: { users: Users; messages: Message[] }) => {
      setUsers(data.users)
      setMessages(data.messages)
      // Also set pending guests from the room state
      setPendingGuests(data.users.pendingGuests || [])
    })

    return () => {
      socket.off('newMessage')
      socket.off('userTyping')
      socket.off('userStoppedTyping')
      socket.off('userJoined')
      socket.off('userLeft')
      socket.off('guestRequest')
      socket.off('roomState')
    }
  }, [socket])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket) return

    // Clear typing timeout and stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    handleTypingStop()

    socket.emit('sendMessage', newMessage.trim())
    setNewMessage('')
  }

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const getTypingIndicatorText = () => {
    const typingUserIds = Array.from(typingUsers)
    if (typingUserIds.length === 0) return null
    
    const typingUsersList = typingUserIds.map(userId => {
      const user = users.admin?.id === userId ? users.admin : 
                   users.guest?.id === userId ? users.guest : null
      return user?.name || 'Someone'
    })
    
    if (typingUsersList.length === 1) {
      return `${typingUsersList[0]} is typing...`
    } else if (typingUsersList.length === 2) {
      return `${typingUsersList[0]} and ${typingUsersList[1]} are typing...`
    } else {
      return 'Multiple people are typing...'
    }
  }

  const handleApproveGuest = (guestId: string) => {
    if (!socket) return
    socket.emit('approveGuest', guestId)
    setPendingGuests(prev => prev.filter(g => g.id !== guestId))
  }

  const handleRejectGuest = (guestId: string) => {
    if (!socket) return
    socket.emit('rejectGuest', guestId)
    setPendingGuests(prev => prev.filter(g => g.id !== guestId))
  }

  const handleKickGuest = () => {
    if (!socket) return
    socket.emit('kickGuest')
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-800">Chat Room</h1>
              <p className="text-sm text-gray-600">
                {userName} ({userType})
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Connected
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex max-w-4xl mx-auto w-full">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((message) => {
              const isOwnMessage = message.user === userName
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl px-4 py-3 rounded-2xl ${
                      message.type === 'system'
                        ? 'bg-yellow-50 text-yellow-800 mx-auto text-center border border-yellow-200'
                        : isOwnMessage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                    }`}
                  >
                    {message.type === 'message' && !isOwnMessage && (
                      <div className="text-xs font-medium text-gray-500 mb-1">{message.user}</div>
                    )}
                    <div className="text-sm leading-relaxed">{message.message}</div>
                    <div className="text-xs opacity-75 mt-2 text-right">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Typing Indicator */}
            {getTypingIndicatorText() && (
              <div className="flex justify-start">
                <div className="max-w-2xl px-4 py-2 bg-gray-100 border border-gray-200 rounded-2xl">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-gray-600">{getTypingIndicatorText()}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="bg-white border-t p-4">
            <form onSubmit={handleSendMessage} className="flex space-x-3">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={userType === 'pending'}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || userType === 'pending'}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar - Admin Controls Only */}
        {userType === 'admin' && (
          <div className="w-80 bg-white border-l border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-4">Admin Controls</h3>
            
            {/* Current Users */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Users</h4>
              <div className="space-y-2">
                {users.admin && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium text-blue-800">👑 {users.admin.name}</div>
                      <div className="text-xs text-blue-600">Admin</div>
                    </div>
                  </div>
                )}
                {users.guest && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium text-green-800">👤 {users.guest.name}</div>
                      <div className="text-xs text-green-600">Guest</div>
                    </div>
                    <button
                      onClick={handleKickGuest}
                      className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Kick
                    </button>
                  </div>
                )}
                {!users.guest && (
                  <div className="text-sm text-gray-500 italic p-3">No guest in chat</div>
                )}
              </div>
            </div>

            {/* Pending Requests */}
            {pendingGuests.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Pending Requests</h4>
                <div className="space-y-2">
                  {pendingGuests.map((guest) => (
                    <div key={guest.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div>
                        <div className="font-medium text-yellow-800">👤 {guest.name}</div>
                        <div className="text-xs text-yellow-600">Waiting for approval</div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleApproveGuest(guest.id)}
                          className="px-3 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectGuest(guest.id)}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 