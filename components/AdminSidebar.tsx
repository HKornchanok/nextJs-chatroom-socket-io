import React from 'react'
import { User, Users } from './types'

interface AdminSidebarProps {
  userType: string
  notificationPermission: NotificationPermission
  currentTime: Date
  users: Users
  pendingGuests: User[]
  onRequestNotificationPermission: () => void
  onApproveGuest: (guestId: string) => void
  onRejectGuest: (guestId: string) => void
  onKickGuest: () => void
}

export default function AdminSidebar({
  userType,
  notificationPermission,
  currentTime,
  users,
  pendingGuests,
  onRequestNotificationPermission,
  onApproveGuest,
  onRejectGuest,
  onKickGuest
}: AdminSidebarProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (userType !== 'admin') {
    return null
  }

  return (
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
              onClick={onRequestNotificationPermission}
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
                  onClick={onKickGuest}
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
                    onClick={() => onApproveGuest(guest.id)}
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
                    onClick={() => onRejectGuest(guest.id)}
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
  )
} 