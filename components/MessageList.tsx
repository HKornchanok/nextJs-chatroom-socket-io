import React from 'react'
import { Message, Users } from './types'

interface MessageListProps {
  messages: Message[]
  userName: string
  userType: string
  typingUsers: Set<string>
  users: Users
  messagesEndRef: React.RefObject<HTMLDivElement>
}

export default function MessageList({
  messages,
  userName,
  userType,
  typingUsers,
  users,
  messagesEndRef
}: MessageListProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

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

  return (
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
  )
} 