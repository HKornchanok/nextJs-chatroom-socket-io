import React from 'react'

interface MessageInputProps {
  newMessage: string
  userType: string
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSendMessage: (e: React.FormEvent) => void
}

export default function MessageInput({
  newMessage,
  userType,
  onInputChange,
  onSendMessage
}: MessageInputProps) {
  return (
    <div className="bg-white border-t p-4 min-w-0">
      <form onSubmit={onSendMessage} className="flex space-x-3 min-w-0">
        <input
          type="text"
          value={newMessage}
          onChange={onInputChange}
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
  )
} 