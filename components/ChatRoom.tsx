import React, { useState, useEffect, useContext, useRef } from 'react'
import { ChatContext } from '../pages/_app'
import { Message, User, Users } from './types'
import ChatHeader from './ChatHeader'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import AdminSidebar from './AdminSidebar'
import KickedModal from './KickedModal'

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
    console.log('sending notification', userType, Notification.permission)
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
    console.log('requesting notification permission')
      Notification.requestPermission().then((permission) => {
        console.log('notification permission', permission)
        setNotificationPermission(permission)
      })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ChatHeader
        userName={userName || ''}
        userType={userType || ''}
        notificationPermission={notificationPermission}
        onRequestNotificationPermission={requestNotificationPermission}
        onLeaveChat={handleLeaveChat}
      />

      <div className="flex-1 flex mx-auto w-full">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col w-full">
          <MessageList
            messages={messages}
            userName={userName || ''}
            userType={userType || ''}
            typingUsers={typingUsers}
            users={users}
            messagesEndRef={messagesEndRef}
          />

          <MessageInput
            newMessage={newMessage}
            userType={userType || ''}
            onInputChange={handleInputChange}
            onSendMessage={handleSendMessage}
          />
        </div>

        <AdminSidebar
          userType={userType || ''}
          notificationPermission={notificationPermission}
          currentTime={currentTime}
          users={users}
          pendingGuests={pendingGuests}
          onRequestNotificationPermission={requestNotificationPermission}
          onApproveGuest={handleApproveGuest}
          onRejectGuest={handleRejectGuest}
          onKickGuest={handleKickGuest}
        />
      </div>

      <KickedModal
        showKickedModal={showKickedModal}
        onClose={() => {
          setShowKickedModal(false)
          // Set userType to null to redirect to login form
          setUserType(null)
          setUserName('')
        }}
      />
    </div>
  )
}