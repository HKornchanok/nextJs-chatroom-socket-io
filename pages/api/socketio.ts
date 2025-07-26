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

// Global chat room instance (will be reset on serverless function cold starts)
let chatRoom: {
  admin: User | null
  guest: User | null
  pendingGuests: User[]
  messages: ChatMessage[]
  adminPassword: string
} = {
  admin: null,
  guest: null,
  pendingGuests: [],
  messages: [],
  adminPassword: ADMIN_CONFIG.password
}

const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!(res.socket as any).server.io) {
    console.log('Creating new Socket.IO server instance')
    
    const io = new ServerIO((res.socket as any).server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true
      },
      transports: ['polling'],
      allowEIO3: true,
      pingTimeout: 30000,
      pingInterval: 10000
    })

    ;(res.socket as any).server.io = io

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id)

      // Join room
      socket.on('join', (data: { name: string; type: 'admin' | 'guest'; password?: string }) => {
        console.log('Join request received:', { socketId: socket.id, ...data })
        
        const user: User = {
          id: socket.id,
          name: data.name,
          type: data.type,
          socketId: socket.id
        }

        if (data.type === 'admin') {
          if (data.password && data.password !== chatRoom.adminPassword) {
            socket.emit('joined', { success: false, error: 'Invalid admin password' })
            return
          }
          
          chatRoom.admin = user
          socket.emit('joined', { 
            success: true, 
            userType: 'admin',
            users: {
              admin: chatRoom.admin,
              guest: chatRoom.guest,
              pendingGuests: chatRoom.pendingGuests
            },
            messages: chatRoom.messages
          })
          socket.broadcast.emit('userJoined', { user, type: 'admin' })
          
          if (chatRoom.pendingGuests.length > 0) {
            io.emit('newMessage', {
              id: Date.now().toString(),
              user: 'System',
              message: `Admin joined. ${chatRoom.pendingGuests.length} guest request(s) waiting for approval.`,
              timestamp: new Date(),
              type: 'system'
            })
          }
        } else {
          if (chatRoom.guest) {
            socket.emit('joined', { success: false, error: 'Room is full' })
            return
          }
          
          chatRoom.pendingGuests.push(user)
          socket.emit('joined', { 
            success: true, 
            userType: 'pending',
            users: {
              admin: chatRoom.admin,
              guest: chatRoom.guest,
              pendingGuests: chatRoom.pendingGuests
            }
          })
          socket.broadcast.emit('guestRequest', { user })
        }
      })

      // Send message
      socket.on('sendMessage', (message: string) => {
        const user = chatRoom.admin?.id === socket.id ? chatRoom.admin : 
                    chatRoom.guest?.id === socket.id ? chatRoom.guest : null
        
        if (user) {
          const chatMessage: ChatMessage = {
            id: Date.now().toString(),
            user: user.name,
            message,
            timestamp: new Date(),
            type: 'message'
          }
          
          chatRoom.messages.push(chatMessage)
          if (chatRoom.messages.length > 100) {
            chatRoom.messages.shift()
          }
          
          io.emit('newMessage', chatMessage)
        }
      })

      // Typing indicators
      socket.on('typingStart', () => {
        const user = chatRoom.admin?.id === socket.id ? chatRoom.admin : 
                    chatRoom.guest?.id === socket.id ? chatRoom.guest : null
        
        if (user) {
          socket.broadcast.emit('userTyping', { 
            userId: user.id, 
            userName: user.name,
            userType: user.type 
          })
        }
      })

      socket.on('typingStop', () => {
        const user = chatRoom.admin?.id === socket.id ? chatRoom.admin : 
                    chatRoom.guest?.id === socket.id ? chatRoom.guest : null
        
        if (user) {
          socket.broadcast.emit('userStoppedTyping', { 
            userId: user.id 
          })
        }
      })

      // Admin actions
      socket.on('approveGuest', (guestId: string) => {
        if (chatRoom.admin?.id === socket.id) {
          const pendingIndex = chatRoom.pendingGuests.findIndex(g => g.id === guestId)
          if (pendingIndex !== -1) {
            const guest = chatRoom.pendingGuests.splice(pendingIndex, 1)[0]
            chatRoom.guest = guest
            
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
      })

      socket.on('rejectGuest', (guestId: string) => {
        if (chatRoom.admin?.id === socket.id) {
          const pendingIndex = chatRoom.pendingGuests.findIndex(g => g.id === guestId)
          if (pendingIndex !== -1) {
            const rejectedGuest = chatRoom.pendingGuests.splice(pendingIndex, 1)[0]
            io.to(rejectedGuest.socketId).emit('rejected')
            io.emit('newMessage', {
              id: Date.now().toString(),
              user: 'System',
              message: `${rejectedGuest.name}'s request has been rejected`,
              timestamp: new Date(),
              type: 'system'
            })
          }
        }
      })

      socket.on('kickGuest', () => {
        if (chatRoom.admin?.id === socket.id && chatRoom.guest) {
          const kickedGuest = chatRoom.guest
          chatRoom.guest = null
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
      })

      // Cancel request (for pending guests)
      socket.on('cancelRequest', () => {
        const pendingIndex = chatRoom.pendingGuests.findIndex(g => g.id === socket.id)
        if (pendingIndex !== -1) {
          chatRoom.pendingGuests.splice(pendingIndex, 1)
        }
      })

      // Disconnect
      socket.on('disconnect', () => {
        if (chatRoom.admin?.id === socket.id) {
          chatRoom.admin = null
          io.emit('userLeft', { userId: socket.id, userType: 'admin' })
          io.emit('newMessage', {
            id: Date.now().toString(),
            user: 'System',
            message: 'Admin has left the chat. New admin can join.',
            timestamp: new Date(),
            type: 'system'
          })
        } else if (chatRoom.guest?.id === socket.id) {
          chatRoom.guest = null
          io.emit('userLeft', { userId: socket.id, userType: 'guest' })
        } else {
          const pendingIndex = chatRoom.pendingGuests.findIndex(g => g.id === socket.id)
          if (pendingIndex !== -1) {
            chatRoom.pendingGuests.splice(pendingIndex, 1)
          }
        }
        console.log('User disconnected:', socket.id)
      })
    })
  }
  
  res.end()
}

export default ioHandler 