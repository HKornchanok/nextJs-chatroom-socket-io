import { Server as NetServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as ServerIO, Socket } from 'socket.io'
import { ADMIN_CONFIG } from '../../config/admin'

export const config = {
  api: {
    bodyParser: false,
  },
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

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: Date
  type: 'message' | 'system'
  senderId?: string // Optional sender ID to identify the message sender
}

class ChatRoom {
  private admin: User | null = null
  private guest: User | null = null
  private pendingGuests: User[] = []
  private messages: ChatMessage[] = []
  private adminPassword: string = ADMIN_CONFIG.password

  addAdmin(user: User, password?: string) {
    if (password && password !== this.adminPassword) {
      return false
    }
    // Add timestamp when admin joins
    user.joinedAt = new Date()
    user.lastActivity = new Date()
    // If there's already an admin, kick them out
    const previousAdmin = this.admin
    this.admin = user
    return { success: true, previousAdmin }
  }

  addGuest(user: User): 'approved' | 'pending' | 'full' {
    // Add timestamp when guest is added to pending list
    user.joinedAt = new Date()

      this.pendingGuests.push(user)
      return 'pending'
    
  
  }

  approveGuest(guestId: string): boolean {
    // Check if there's already a guest in the room
    if (this.guest) {
      return false // Cannot approve when room is full
    }
    
    const pendingIndex = this.pendingGuests.findIndex(g => g.id === guestId)
    if (pendingIndex === -1) return false
    
    const guest = this.pendingGuests.splice(pendingIndex, 1)[0]
    // Update timestamp when guest is approved and joins
    guest.joinedAt = new Date()
    guest.lastActivity = new Date()
    guest.sessionStartTime = new Date() // Start session timer
    this.guest = guest
    return true
  }

  kickGuest(): boolean {
    if (!this.guest) return false
    const kickedGuest = this.guest
    this.guest = null
    // Also remove from pending guests if they were there
    this.pendingGuests = this.pendingGuests.filter(g => g.id !== kickedGuest.id)
    return true
  }

  rejectGuest(guestId: string): boolean {
    const pendingIndex = this.pendingGuests.findIndex(g => g.id === guestId)
    if (pendingIndex === -1) return false
    
    this.pendingGuests.splice(pendingIndex, 1)
    return true
  }

  removeUser(userId: string): 'admin' | 'guest' | 'pending' | null {
    if (this.admin?.id === userId) {
      this.admin = null
      return 'admin'
    }
    if (this.guest?.id === userId) {
      this.guest = null
      return 'guest'
    }
    const pendingIndex = this.pendingGuests.findIndex(g => g.id === userId)
    if (pendingIndex !== -1) {
      this.pendingGuests.splice(pendingIndex, 1)
      return 'pending'
    }
    return null
  }

  getUsers() {
    return {
      admin: this.admin,
      guest: this.guest,
      pendingGuests: this.pendingGuests
    }
  }

  addMessage(message: ChatMessage) {
    this.messages.push(message)
    if (this.messages.length > 100) {
      this.messages.shift()
    }
  }

  getMessages() {
    return this.messages
  }

  isUserInRoom(userId: string): boolean {
    return !!(this.admin?.id === userId || this.guest?.id === userId)
  }

  updateUserActivity(userId: string): void {
    if (this.admin?.id === userId) {
      this.admin.lastActivity = new Date()
    }
    if (this.guest?.id === userId) {
      this.guest.lastActivity = new Date()
    }
  }

  checkInactiveGuests(): string[] {
    const now = new Date()
    const inactiveGuests: string[] = []
    
    if (this.guest && this.guest.lastActivity) {
      const timeDiff = now.getTime() - this.guest.lastActivity.getTime()
      if (timeDiff > 90000) { // 90 seconds in milliseconds
        inactiveGuests.push(this.guest.id)
      }
    }
    
    return inactiveGuests
  }

  checkSessionTimeouts(): string[] {
    const now = new Date()
    const expiredSessions: string[] = []
    
    if (this.guest && this.guest.sessionStartTime) {
      const sessionTime = now.getTime() - this.guest.sessionStartTime.getTime()
      if (sessionTime > 300000) { // 300 seconds (5 minutes) in milliseconds
        expiredSessions.push(this.guest.id)
      }
    }
    
    return expiredSessions
  }

  shouldWarnSessionExpiry(): boolean {
    if (this.guest && this.guest.sessionStartTime) {
      const sessionTime = new Date().getTime() - this.guest.sessionStartTime.getTime()
      return sessionTime > 240000 && sessionTime <= 300000 // Between 4-5 minutes
    }
    return false
  }
}

const chatRoom = new ChatRoom()

const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!(res.socket as any).server.io) {
    const httpServer: NetServer = (res.socket as any).server as any
    const io = new ServerIO(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? [process.env.NEXT_PUBLIC_SITE_URL || '*', 'https://*.railway.app', 'https://*.render.com', 'https://*.digitalocean.app']
          : '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
      },
      // Use both polling and WebSocket for Railway (full support)
      transports: ['polling', 'websocket'],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e6
    })
    ;(res.socket as any).server.io = io

    // Set up periodic check for inactive guests and session timeouts (every 30 seconds)
    const inactivityCheckInterval = setInterval(() => {
      const inactiveGuests = chatRoom.checkInactiveGuests()
      const expiredSessions = chatRoom.checkSessionTimeouts()
      
      // Handle inactive guests
      inactiveGuests.forEach(guestId => {
        const users = chatRoom.getUsers()
        const guest = users.guest
        
        if (guest && guest.id === guestId) {
          // Kick the inactive guest
          const success = chatRoom.kickGuest()
          if (success) {
            io.to(guest.socketId).emit('kicked', { reason: 'Inactive for 90 seconds' })
            io.emit('userLeft', { userId: guest.id, userType: 'guest' })
            io.emit('newMessage', {
              id: Date.now().toString(),
              user: 'System',
              message: `${guest.name} has been kicked due to inactivity`,
              timestamp: new Date(),
              type: 'system'
            })
          }
        }
      })
      
      // Handle session warnings (1 minute remaining)
      const users = chatRoom.getUsers()
      if (users.guest && chatRoom.shouldWarnSessionExpiry() && !users.guest.sessionWarningSent) {
        users.guest.sessionWarningSent = true
        io.to(users.guest.socketId).emit('newMessage', {
          id: Date.now().toString(),
          user: 'System',
          message: '⚠️ Warning: Your session will expire in 1 minute!',
          timestamp: new Date(),
          type: 'system'
        })
      }
      
      // Handle expired sessions
      expiredSessions.forEach(guestId => {
        const users = chatRoom.getUsers()
        const guest = users.guest
        
        if (guest && guest.id === guestId) {
          // Kick the guest due to session timeout
          const success = chatRoom.kickGuest()
          if (success) {
            io.to(guest.socketId).emit('kicked', { reason: 'Session expired (5 minutes)' })
            io.emit('userLeft', { userId: guest.id, userType: 'guest' })
            io.emit('newMessage', {
              id: Date.now().toString(),
              user: 'System',
              message: `${guest.name}'s session has expired (5 minutes)`,
              timestamp: new Date(),
              type: 'system'
            })
          }
        }
      })
    }, 30000) // Check every 30 seconds

    // Clean up interval when server shuts down
    process.on('SIGTERM', () => {
      clearInterval(inactivityCheckInterval)
    })
    process.on('SIGINT', () => {
      clearInterval(inactivityCheckInterval)
    })

    io.on('connection', (socket) => {
      // Join room
      socket.on('join', (data: { name: string; type: 'admin' | 'guest'; password?: string }) => {
        const user: User = {
          id: socket.id,
          name: data.name,
          type: data.type,
          socketId: socket.id
        }

        if (data.type === 'admin') {
          const result = chatRoom.addAdmin(user, data.password)
          
          if (result && result.success) {
            const users = chatRoom.getUsers()
            
            // If there was a previous admin, kick them
            if (result.previousAdmin) {
              io.to(result.previousAdmin.socketId).emit('kicked', { reason: 'Another admin has joined' })
              io.emit('userLeft', { userId: result.previousAdmin.id, userType: 'admin' })
              io.emit('newMessage', {
                id: Date.now().toString(),
                user: 'System',
                message: `${result.previousAdmin.name} has been kicked because another admin joined`,
                timestamp: new Date(),
                type: 'system'
              })
            }
            
            socket.emit('joined', { 
              success: true, 
              userType: 'admin',
              users: users,
              messages: [] // Don't send previous messages to new users
            })
            socket.broadcast.emit('userJoined', { user, type: 'admin' })
            
            // If there are pending guests, send a system message
            if (users.pendingGuests.length > 0) {
              io.emit('newMessage', {
                id: Date.now().toString(),
                user: 'System',
                message: `Admin joined. ${users.pendingGuests.length} guest request(s) waiting for approval.`,
                timestamp: new Date(),
                type: 'system'
              })
            }
            
            // Emit pending guest count
            io.emit('pendingGuestCount', { count: users.pendingGuests.length })
          } else {
            socket.emit('joined', { success: false, error: 'Invalid admin password' })
          }
        } else {
          const result = chatRoom.addGuest(user)
          
          if (result === 'approved') {
            socket.emit('joined', { 
              success: true, 
              userType: 'guest',
              users: chatRoom.getUsers(),
              messages: [] // Don't send previous messages to new users
            })
            socket.broadcast.emit('userJoined', { user, type: 'guest' })
            
            // Emit updated pending guest count
            const users = chatRoom.getUsers()
            io.emit('pendingGuestCount', { count: users.pendingGuests.length })
          } else if (result === 'pending') {
            socket.emit('joined', { 
              success: true, 
              userType: 'pending',
              users: chatRoom.getUsers()
            })
            socket.broadcast.emit('guestRequest', { user })
            
            // Emit updated pending guest count
            const users = chatRoom.getUsers()
            io.emit('pendingGuestCount', { count: users.pendingGuests.length })
          } else {
            socket.emit('joined', { success: false, error: 'Room is full' })
          }
        }
      })

      // Send message
      socket.on('sendMessage', (message: string) => {
        const users = chatRoom.getUsers()
        const user = users.admin?.id === socket.id ? users.admin : 
                    users.guest?.id === socket.id ? users.guest : null
        
        if (user && chatRoom.isUserInRoom(socket.id)) {
          // Update user activity
          chatRoom.updateUserActivity(socket.id)
          
          const chatMessage: ChatMessage = {
            id: Date.now().toString(),
            user: user.name,
            message,
            timestamp: new Date(),
            type: 'message',
            senderId: user.id // Add sender ID to identify the message sender
          }
          
          chatRoom.addMessage(chatMessage)
          io.emit('newMessage', chatMessage)
          
          // Emit user activity update
          const updatedUsers = chatRoom.getUsers()
          io.emit('userActivityUpdate', { users: updatedUsers })
        }
      })

      // Typing indicators
      socket.on('typingStart', () => {
        const users = chatRoom.getUsers()
        const user = users.admin?.id === socket.id ? users.admin : 
                    users.guest?.id === socket.id ? users.guest : null
        
        if (user && chatRoom.isUserInRoom(socket.id)) {
          // Update user activity
          chatRoom.updateUserActivity(socket.id)
          
          socket.broadcast.emit('userTyping', { 
            userId: user.id, 
            userName: user.name,
            userType: user.type 
          })
          
          // Emit user activity update
          const updatedUsers = chatRoom.getUsers()
          io.emit('userActivityUpdate', { users: updatedUsers })
        }
      })

      socket.on('typingStop', () => {
        const users = chatRoom.getUsers()
        const user = users.admin?.id === socket.id ? users.admin : 
                    users.guest?.id === socket.id ? users.guest : null
        
        if (user && chatRoom.isUserInRoom(socket.id)) {
          // Update user activity
          chatRoom.updateUserActivity(socket.id)
          
          socket.broadcast.emit('userStoppedTyping', { 
            userId: user.id 
          })
          
          // Emit user activity update
          const updatedUsers = chatRoom.getUsers()
          io.emit('userActivityUpdate', { users: updatedUsers })
        }
      })

      // Get room state
      socket.on('getRoomState', () => {
        if (chatRoom.isUserInRoom(socket.id)) {
          socket.emit('roomState', {
            users: chatRoom.getUsers(),
            messages: [] // Don't send previous messages to new users
          })
        }
      })

      // Admin actions
      socket.on('approveGuest', (guestId: string) => {
        const users = chatRoom.getUsers()
        if (users.admin?.id === socket.id) {
          const success = chatRoom.approveGuest(guestId)
          if (success) {
            const guest = chatRoom.getUsers().guest
            if (guest) {
              io.to(guest.socketId).emit('approved', { userName: guest.name })
              io.emit('userJoined', { user: guest, type: 'guest' })
              io.emit('newMessage', {
                id: Date.now().toString(),
                user: 'System',
                message: `${guest.name} has been approved to join the chat`,
                timestamp: new Date(),
                type: 'system'
              })
              // Send session limit message to the guest
              io.to(guest.socketId).emit('newMessage', {
                id: Date.now().toString(),
                user: 'System',
                message: 'Your session will expire in 5 minutes. Make the most of your time!',
                timestamp: new Date(),
                type: 'system'
              })
            }
            
            // Emit updated pending guest count
            const updatedUsers = chatRoom.getUsers()
            io.emit('pendingGuestCount', { count: updatedUsers.pendingGuests.length })
          } else {
            // Room is full, cannot approve guest
            const pendingGuest = users.pendingGuests.find(g => g.id === guestId)
            if (pendingGuest) {
              io.emit('newMessage', {
                id: Date.now().toString(),
                user: 'System',
                message: `Cannot approve ${pendingGuest.name} - room is full. Please kick the current guest first.`,
                timestamp: new Date(),
                type: 'system'
              })
            }
          }
        }
      })

      socket.on('rejectGuest', (guestId: string) => {
        const users = chatRoom.getUsers()
        if (users.admin?.id === socket.id) {
          // Find the guest before rejecting them
          const rejectedGuest = users.pendingGuests.find(g => g.id === guestId)
          if (rejectedGuest) {
            const success = chatRoom.rejectGuest(guestId)
            if (success) {
              // Emit to the specific guest
              io.to(rejectedGuest.socketId).emit('rejected')
              
              // Also emit to all clients for the system message
              io.emit('newMessage', {
                id: Date.now().toString(),
                user: 'System',
                message: `${rejectedGuest.name}'s request has been rejected`,
                timestamp: new Date(),
                type: 'system'
              })
              
              // Emit updated pending guest count
              const updatedUsers = chatRoom.getUsers()
              io.emit('pendingGuestCount', { count: updatedUsers.pendingGuests.length })
            }
          }
        }
      })

      socket.on('kickGuest', () => {
        const users = chatRoom.getUsers()
        if (users.admin?.id === socket.id) {
          const success = chatRoom.kickGuest()
          if (success && users.guest) {
            const kickedGuest = users.guest
            io.to(kickedGuest.socketId).emit('kicked')
            io.emit('userLeft', { userId: kickedGuest.id, userType: 'guest' })
            io.emit('newMessage', {
              id: Date.now().toString(),
              user: 'System',
                message: `${kickedGuest.name} has been kicked from the chat`,
                timestamp: new Date(),
                type: 'system'
              })
            }
          }
        })

      // Cancel request (for pending guests)
      socket.on('cancelRequest', () => {
        const users = chatRoom.getUsers()
        // Find the pending guest before removing them
        const cancelingGuest = users.pendingGuests.find(g => g.id === socket.id)
        
        const userType = chatRoom.removeUser(socket.id)
        if (userType === 'pending' && cancelingGuest) {
          // Emit userLeft event to notify admin that the pending guest has left
          io.emit('userLeft', { userId: socket.id, userType: 'pending' })
          
          // Emit system message about the cancellation
          io.emit('newMessage', {
            id: Date.now().toString(),
            user: 'System',
            message: `${cancelingGuest.name} has cancelled their request`,
            timestamp: new Date(),
            type: 'system'
          })
          
          // Emit updated pending guest count
          const updatedUsers = chatRoom.getUsers()
          io.emit('pendingGuestCount', { count: updatedUsers.pendingGuests.length })
          
          // Emit user activity update to sync admin's view
          io.emit('userActivityUpdate', { users: updatedUsers })
        }
      })

      // Disconnect
      socket.on('disconnect', () => {
        const userType = chatRoom.removeUser(socket.id)
        if (userType) {
          const users = chatRoom.getUsers()
          io.emit('userLeft', { userId: socket.id, userType })
          if (userType === 'admin') {
            io.emit('newMessage', {
              id: Date.now().toString(),
              user: 'System',
              message: 'Admin has left the chat. New admin can join.',
              timestamp: new Date(),
              type: 'system'
            })
          }
          
          // Emit updated pending guest count if a pending guest disconnected
          if (userType === 'pending') {
            io.emit('pendingGuestCount', { count: users.pendingGuests.length })
            // Emit user activity update to sync admin's view
            io.emit('userActivityUpdate', { users: users })
            // Note: We don't emit a system message here because we don't know the guest's name
            // The cancelRequest event already handles the system message for intentional cancellations
          }
        }
      })
    })
  }
  res.end()
}

export default ioHandler 