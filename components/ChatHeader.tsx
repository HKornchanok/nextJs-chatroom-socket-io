import React from 'react'

interface ChatHeaderProps {
  userName: string
  userType: string
  notificationPermission: NotificationPermission
  onRequestNotificationPermission: () => void
  onLeaveChat: () => void
}

export default function ChatHeader({
  userName,
  userType,
  notificationPermission,
  onRequestNotificationPermission,
  onLeaveChat
}: ChatHeaderProps) {
  return (
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
                    onClick={onRequestNotificationPermission}
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
              onClick={onLeaveChat}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              Leave Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 