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
  joinedAt?: Date
  lastActivity?: Date
  sessionStartTime?: Date
  sessionWarningSent?: boolean
}

interface Users {
  admin: User | null
  guest: User | null
  pendingGuests: User[]
}

export default function ChatRoom() {
  const { socket, userType, userName, setUserType, setUserName } = useContext(ChatContext)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [users, setUsers] = useState<Users>({ admin: null, guest: null, pendingGuests: [] })
  const [pendingGuests, setPendingGuests] = useState<User[]>([])
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showKickedModal, setShowKickedModal] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Request notification permission for admins
  useEffect(() => {
    if (userType === 'admin' && 'Notification' in window) {
      setNotificationPermission(Notification.permission)
      
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission)
        })
      }
    }
  }, [userType])

  // Function to send web notification
  const sendNotification = (title: string, body: string, icon?: string) => {
    if (userType !== 'admin'  || Notification.permission !== 'granted') {
      return
    }

    // Don't send notifications if the page is currently focused
    if (document.hasFocus()) {
      return
    }

    const notification = new Notification(title, {
      body,
      tag: 'chat-admin', // This prevents multiple notifications from stacking
      requireInteraction: true, // Keeps notification visible until user interacts
    })

    // Auto-close notification after 5 seconds
    setTimeout(() => {
      notification.close()
    }, 5000)

    // Focus window when notification is clicked
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  }

  // Update current time every second for activity tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

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
      // Convert timestamp string to Date object
      const messageWithDate = {
        ...message,
        timestamp: new Date(message.timestamp)
      }
      setMessages(prev => [...prev, messageWithDate])
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
      // Convert date strings to Date objects
      const userWithDates = {
        ...data.user,
        joinedAt: data.user.joinedAt ? new Date(data.user.joinedAt) : undefined,
        lastActivity: data.user.lastActivity ? new Date(data.user.lastActivity) : undefined,
        sessionStartTime: data.user.sessionStartTime ? new Date(data.user.sessionStartTime) : undefined
      }
      
      setUsers(prev => {
        if (data.type === 'admin') {
          return { ...prev, admin: userWithDates }
        } else if (data.type === 'guest') {
          // Send notification when guest joins
          if (userType === 'admin') {
            sendNotification(
              '👤 Guest Joined',
              `${userWithDates.name} has joined the chat room`
            )
          }
          return { ...prev, guest: userWithDates }
        }
        return prev
      })
    })

    // Listen for user left events
    socket.on('userLeft', (data: { userId: string; userType: string; userName?: string }) => {
      // Send notification when guest leaves
      if (data.userType === 'guest' && userType === 'admin') {
        const guestName = data.userName || users.guest?.name || 'Guest'
        sendNotification(
          '👋 Guest Left',
          `${guestName} has left the chat room`
        )
      }

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
      // Convert date strings to Date objects
      const userWithDates = {
        ...data.user,
        joinedAt: data.user.joinedAt ? new Date(data.user.joinedAt) : undefined,
        lastActivity: data.user.lastActivity ? new Date(data.user.lastActivity) : undefined,
        sessionStartTime: data.user.sessionStartTime ? new Date(data.user.sessionStartTime) : undefined
      }
      
      setPendingGuests(prev => {
        const newGuests = [...prev, userWithDates]
        
        // Send notification for new guest request
        if (userType === 'admin') {
          sendNotification(
            '🔔 New Guest Request',
            `${userWithDates.name} wants to join the chat room`,
          )
        }
        
        return newGuests
      })
    })

    // Request current room state when joining
    socket.emit('getRoomState')

    // Listen for room state update
    socket.on('roomState', (data: { users: Users; messages: Message[] }) => {
      // Convert date strings to Date objects for all users
      const usersWithDates = {
        admin: data.users.admin ? {
          ...data.users.admin,
          joinedAt: data.users.admin.joinedAt ? new Date(data.users.admin.joinedAt) : undefined,
          lastActivity: data.users.admin.lastActivity ? new Date(data.users.admin.lastActivity) : undefined,
          sessionStartTime: data.users.admin.sessionStartTime ? new Date(data.users.admin.sessionStartTime) : undefined
        } : null,
        guest: data.users.guest ? {
          ...data.users.guest,
          joinedAt: data.users.guest.joinedAt ? new Date(data.users.guest.joinedAt) : undefined,
          lastActivity: data.users.guest.lastActivity ? new Date(data.users.guest.lastActivity) : undefined,
          sessionStartTime: data.users.guest.sessionStartTime ? new Date(data.users.guest.sessionStartTime) : undefined
        } : null,
        pendingGuests: data.users.pendingGuests.map(guest => ({
          ...guest,
          joinedAt: guest.joinedAt ? new Date(guest.joinedAt) : undefined,
          lastActivity: guest.lastActivity ? new Date(guest.lastActivity) : undefined,
          sessionStartTime: guest.sessionStartTime ? new Date(guest.sessionStartTime) : undefined
        }))
      }
      
      setUsers(usersWithDates)
      // Convert message timestamps to Date objects
      const messagesWithDates = data.messages.map(message => ({
        ...message,
        timestamp: new Date(message.timestamp)
      }))
      setMessages(messagesWithDates)
      // Also set pending guests from the room state
      setPendingGuests(usersWithDates.pendingGuests || [])
    })

    // Listen for user activity updates
    socket.on('userActivityUpdate', (data: { users: Users }) => {
      // Convert date strings to Date objects for all users
      const usersWithDates = {
        admin: data.users.admin ? {
          ...data.users.admin,
          joinedAt: data.users.admin.joinedAt ? new Date(data.users.admin.joinedAt) : undefined,
          lastActivity: data.users.admin.lastActivity ? new Date(data.users.admin.lastActivity) : undefined,
          sessionStartTime: data.users.admin.sessionStartTime ? new Date(data.users.admin.sessionStartTime) : undefined
        } : null,
        guest: data.users.guest ? {
          ...data.users.guest,
          joinedAt: data.users.guest.joinedAt ? new Date(data.users.guest.joinedAt) : undefined,
          lastActivity: data.users.guest.lastActivity ? new Date(data.users.guest.lastActivity) : undefined,
          sessionStartTime: data.users.guest.sessionStartTime ? new Date(data.users.guest.sessionStartTime) : undefined
        } : null,
        pendingGuests: data.users.pendingGuests.map(guest => ({
          ...guest,
          joinedAt: guest.joinedAt ? new Date(guest.joinedAt) : undefined,
          lastActivity: guest.lastActivity ? new Date(guest.lastActivity) : undefined,
          sessionStartTime: guest.sessionStartTime ? new Date(guest.sessionStartTime) : undefined
        }))
      }
      
      setUsers(usersWithDates)
      // Also update pending guests from the activity update
      setPendingGuests(usersWithDates.pendingGuests || [])
    })

    // Listen for kicked event
    socket.on('kicked', () => {
      setShowKickedModal(true)
    })

    return () => {
      socket.off('newMessage')
      socket.off('userTyping')
      socket.off('userStoppedTyping')
      socket.off('userJoined')
      socket.off('userLeft')
      socket.off('guestRequest')
      socket.off('roomState')
      socket.off('userActivityUpdate')
      socket.off('kicked')
    }
  }, [socket, userType, users.guest])

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
    
    const guest = pendingGuests.find(g => g.id === guestId)
    socket.emit('approveGuest', guestId)
    setPendingGuests(prev => prev.filter(g => g.id !== guestId))
    
    // Send notification when guest is approved
    if (guest && userType === 'admin') {
      sendNotification(
        '✅ Guest Approved',
        `${guest.name} has been approved and joined the chat`
      )
    }
  }

  const handleRejectGuest = (guestId: string) => {
    if (!socket) {
      return
    }
    
    const guest = pendingGuests.find(g => g.id === guestId)
    socket.emit('rejectGuest', guestId)
    setPendingGuests(prev => prev.filter(g => g.id !== guestId))
    
    // Send notification when guest is rejected
    if (guest && userType === 'admin') {
      sendNotification(
        '❌ Guest Rejected',
        `${guest.name}'s request has been rejected`
      )
    }
  }

  const handleKickGuest = () => {
    if (!socket) return
    
    const guestName = users.guest?.name || 'Guest'
    socket.emit('kickGuest')
    
    // Send notification when guest is kicked
    if (userType === 'admin') {
      sendNotification(
        '🚫 Guest Kicked',
        `${guestName} has been kicked from the chat room`
      )
    }
  }

  const handleLeaveChat = () => {
    if (!socket) return
    socket.emit('leaveChat')
    // Redirect to home page or show leave message
    window.location.href = '/'
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const requestNotificationPermission = () => {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission)
      })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-800">Chat Room</h1>
              <p className="text-sm text-gray-600">
                {userName} ({userType})
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notification Status for Admins */}
              {userType === 'admin' && (
                <div className="flex items-center space-x-2">
                  {notificationPermission === 'granted' ? (
                    <div className="flex items-center text-sm text-green-600">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Notifications On
                    </div>
                  ) : notificationPermission === 'denied' ? (
                    <div className="flex items-center text-sm text-red-600">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      Notifications Blocked
                    </div>
                  ) : (
                    <button
                      onClick={requestNotificationPermission}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Enable Notifications
                    </button>
                  )}
                </div>
              )}
              <div className="text-sm text-gray-600">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Connected
              </div>
              <button
                onClick={handleLeaveChat}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Leave Chat
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex mx-auto w-full">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col w-full">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((message) => {
              const isOwnMessage = message.user === userName
              
              // Only show system messages to admins
              if (message.type === 'system' && userType !== 'admin') {
                return null
              }
              
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
          <div className="bg-white border-t p-4 min-w-0">
            <form onSubmit={handleSendMessage} className="flex space-x-3 min-w-0">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="flex-1 min-w-0 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={userType === 'pending'}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || userType === 'pending'}
                className="flex-shrink-0 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
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
            
            {/* Notification Settings */}
            {notificationPermission !== 'granted' && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">🔔 Notifications</h4>
                    <p className="text-xs text-blue-600 mt-1">
                      Enable notifications to get alerted about guest activity
                    </p>
                  </div>
                  <button
                    onClick={requestNotificationPermission}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Enable
                  </button>
                </div>
              </div>
            )}
            
            {/* Current Users */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Users</h4>
              <div className="space-y-2">
                {users.admin && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium text-blue-800">👑 {users.admin.name}</div>
                      <div className="text-xs text-blue-600">Admin</div>
                      {users.admin.joinedAt && (
                        <div className="text-xs text-blue-500 mt-1">
                          Joined at {formatTime(users.admin.joinedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {users.guest && (
                  <div className={`flex items-center justify-between p-3 rounded-lg ${
                    users.guest.sessionStartTime && 
                    (currentTime.getTime() - users.guest.sessionStartTime.getTime()) > 240000 
                      ? 'bg-red-50' : 
                    users.guest.lastActivity && 
                    (currentTime.getTime() - users.guest.lastActivity.getTime()) > 60000 
                      ? 'bg-yellow-50' : 'bg-green-50'
                  }`}>
                    <div>
                      <div className={`font-medium ${
                        users.guest.sessionStartTime && 
                        (currentTime.getTime() - users.guest.sessionStartTime.getTime()) > 240000 
                          ? 'text-red-800' :
                        users.guest.lastActivity && 
                        (currentTime.getTime() - users.guest.lastActivity.getTime()) > 60000 
                          ? 'text-yellow-800' : 'text-green-800'
                      }`}>👤 {users.guest.name}</div>
                      <div className={`text-xs ${
                        users.guest.sessionStartTime && 
                        (currentTime.getTime() - users.guest.sessionStartTime.getTime()) > 240000 
                          ? 'text-red-600' :
                        users.guest.lastActivity && 
                        (currentTime.getTime() - users.guest.lastActivity.getTime()) > 60000 
                          ? 'text-yellow-600' : 'text-green-600'
                      }`}>Guest</div>
                      {users.guest.joinedAt && (
                        <div className={`text-xs mt-1 ${
                          users.guest.sessionStartTime && 
                          (currentTime.getTime() - users.guest.sessionStartTime.getTime()) > 240000 
                            ? 'text-red-500' :
                          users.guest.lastActivity && 
                          (currentTime.getTime() - users.guest.lastActivity.getTime()) > 60000 
                            ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                          Joined at {formatTime(users.guest.joinedAt)}
                        </div>
                      )}
                      {users.guest.lastActivity && (
                        <div className={`text-xs ${
                          users.guest.sessionStartTime && 
                          (currentTime.getTime() - users.guest.sessionStartTime.getTime()) > 240000 
                            ? 'text-red-500' :
                          users.guest.lastActivity && 
                          (currentTime.getTime() - users.guest.lastActivity.getTime()) > 60000 
                            ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                          Last active: {formatTime(users.guest.lastActivity)}
                        </div>
                      )}
                      {users.guest.sessionStartTime && (
                        <div className={`text-xs ${
                          (currentTime.getTime() - users.guest.sessionStartTime.getTime()) > 240000 
                            ? 'text-red-500' : 'text-blue-500'
                        }`}>
                          Session: {Math.max(0, Math.floor((300000 - (currentTime.getTime() - users.guest.sessionStartTime.getTime())) / 1000))}s remaining
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <button
                        onClick={handleKickGuest}
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Kick
                      </button>
                      {users.guest.lastActivity && (
                        <div className="text-xs text-gray-500">
                          {Math.max(0, Math.floor((currentTime.getTime() - users.guest.lastActivity.getTime()) / 1000))}s ago
                        </div>
                      )}
                    </div>
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
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Pending Requests
                    {pendingGuests.length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                        {pendingGuests.length}
                      </span>
                    )}
                  </h4>
                  {users.guest && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      Room Full
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {pendingGuests.map((guest) => (
                    <div key={guest.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div>
                        <div className="font-medium text-yellow-800">👤 {guest.name}</div>
                        <div className="text-xs text-yellow-600">Waiting for approval</div>
                        {guest.joinedAt && (
                          <div className="text-xs text-yellow-500 mt-1">
                            Requested at {formatTime(guest.joinedAt)}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleApproveGuest(guest.id)}
                          disabled={!!users.guest}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                            users.guest 
                              ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                          title={users.guest ? 'Room is full. Kick current guest first.' : 'Approve guest'}
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
                {users.guest && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-700">
                      💡 Kick the current guest to approve pending requests
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Kicked Modal */}
      {showKickedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">You have been kicked</h3>
              <p className="text-sm text-gray-500 mb-6">
                The admin has removed you from the chat room. You will be redirected to the home page.
              </p>
              <button
                onClick={() => {
                  setShowKickedModal(false)
                  // Set userType to null to redirect to login form
                  setUserType(null)
                  setUserName('')
                }}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}