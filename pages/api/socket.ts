import { Server as NetServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as ServerIO } from 'socket.io'
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
}

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: Date
  type: 'message' | 'system'
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
    this.admin = user
    return true
  }

  addGuest(user: User): 'approved' | 'pending' | 'full' {
    if (this.guest) {
      return 'full'
    }
    
    // Add to pending list
    this.pendingGuests.push(user)
    return 'pending'
  }

  approveGuest(guestId: string): boolean {
    const pendingIndex = this.pendingGuests.findIndex(g => g.id === guestId)
    if (pendingIndex === -1) return false
    
    const guest = this.pendingGuests.splice(pendingIndex, 1)[0]
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
}

const chatRoom = new ChatRoom()

const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!res.socket.server.io) {
    const httpServer: NetServer = res.socket.server as any
    const io = new ServerIO(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
    })
    res.socket.server.io = io

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id)

      // Join room
      socket.on('join', (data: { name: string; type: 'admin' | 'guest'; password?: string }) => {
        const user: User = {
          id: socket.id,
          name: data.name,
          type: data.type,
          socketId: socket.id
        }

        if (data.type === 'admin') {
          const success = chatRoom.addAdmin(user, data.password)
          if (success) {
            const users = chatRoom.getUsers()
            socket.emit('joined', { 
              success: true, 
              userType: 'admin',
              users: users,
              messages: chatRoom.getMessages()
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
          } else {
            socket.emit('joined', { success: false, error: 'Invalid admin password or admin already exists' })
          }
        } else {
          const result = chatRoom.addGuest(user)
          if (result === 'approved') {
            socket.emit('joined', { 
              success: true, 
              userType: 'guest',
              users: chatRoom.getUsers(),
              messages: chatRoom.getMessages()
            })
            socket.broadcast.emit('userJoined', { user, type: 'guest' })
          } else if (result === 'pending') {
            socket.emit('joined', { 
              success: true, 
              userType: 'pending',
              users: chatRoom.getUsers()
            })
            socket.broadcast.emit('guestRequest', { user })
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
          const chatMessage: ChatMessage = {
            id: Date.now().toString(),
            user: user.name,
            message,
            timestamp: new Date(),
            type: 'message'
          }
          
          chatRoom.addMessage(chatMessage)
          io.emit('newMessage', chatMessage)
        }
      })

      // Typing indicators
      socket.on('typingStart', () => {
        const users = chatRoom.getUsers()
        const user = users.admin?.id === socket.id ? users.admin : 
                    users.guest?.id === socket.id ? users.guest : null
        
        if (user && chatRoom.isUserInRoom(socket.id)) {
          socket.broadcast.emit('userTyping', { 
            userId: user.id, 
            userName: user.name,
            userType: user.type 
          })
        }
      })

      socket.on('typingStop', () => {
        const users = chatRoom.getUsers()
        const user = users.admin?.id === socket.id ? users.admin : 
                    users.guest?.id === socket.id ? users.guest : null
        
        if (user && chatRoom.isUserInRoom(socket.id)) {
          socket.broadcast.emit('userStoppedTyping', { 
            userId: user.id 
          })
        }
      })

      // Get room state
      socket.on('getRoomState', () => {
        if (chatRoom.isUserInRoom(socket.id)) {
          socket.emit('roomState', {
            users: chatRoom.getUsers(),
            messages: chatRoom.getMessages()
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
              console.log(`Approving guest: ${guest.name} (${guest.socketId})`)
              io.to(guest.socketId).emit('approved', { userName: guest.name })
              io.emit('userJoined', { user: guest, type: 'guest' })
              io.emit('newMessage', {
                id: Date.now().toString(),
                user: 'System',
                message: `${guest.name} has been approved to join the chat`,
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
            console.log(`Rejecting guest: ${rejectedGuest.name} (${rejectedGuest.socketId})`)
            const success = chatRoom.rejectGuest(guestId)
            if (success) {
              // Emit to the specific guest
              io.to(rejectedGuest.socketId).emit('rejected')
              console.log(`Rejected event sent to socket: ${rejectedGuest.socketId}`)
              
              // Also emit to all clients for the system message
              io.emit('newMessage', {
                id: Date.now().toString(),
                user: 'System',
                message: `${rejectedGuest.name}'s request has been rejected`,
                timestamp: new Date(),
                type: 'system'
              })
            }
          } else {
            console.log(`Guest with ID ${guestId} not found in pending list`)
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
        const userType = chatRoom.removeUser(socket.id)
        if (userType === 'pending') {
          console.log('Guest cancelled their request:', socket.id)
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
        }
        console.log('User disconnected:', socket.id)
      })
    })
  }
  res.end()
}

export default ioHandler 