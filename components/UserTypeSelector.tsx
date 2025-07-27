import React from 'react'

interface UserTypeSelectorProps {
  userType: 'admin' | 'guest'
  onUserTypeChange: (type: 'admin' | 'guest') => void
  isLoading: boolean
}

export default function UserTypeSelector({
  userType,
  onUserTypeChange,
  isLoading
}: UserTypeSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Join as
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onUserTypeChange('admin')}
          className={`p-4 rounded-lg border-2 transition-all ${
            userType === 'admin'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          disabled={isLoading}
        >
          <div className="text-center">
            <div className="text-lg font-semibold">👑 Admin</div>
            <div className="text-sm text-gray-500">Manage chat room</div>
          </div>
        </button>
        
        <button
          type="button"
          onClick={() => onUserTypeChange('guest')}
          className={`p-4 rounded-lg border-2 transition-all ${
            userType === 'guest'
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          disabled={isLoading}
        >
          <div className="text-center">
            <div className="text-lg font-semibold">👤 Guest</div>
            <div className="text-sm text-gray-500">Request to join</div>
          </div>
        </button>
      </div>
    </div>
  )
} 