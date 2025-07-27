import React from 'react'

interface LoginFormFieldsProps {
  name: string
  password: string
  userType: 'admin' | 'guest'
  isLoading: boolean
  onNameChange: (value: string) => void
  onPasswordChange: (value: string) => void
}

export default function LoginFormFields({
  name,
  password,
  userType,
  isLoading,
  onNameChange,
  onPasswordChange
}: LoginFormFieldsProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="Enter your name"
          disabled={isLoading}
        />
      </div>

      {userType === 'admin' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Admin Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Enter admin password"
            disabled={isLoading}
          />
        </div>
      )}
    </>
  )
} 