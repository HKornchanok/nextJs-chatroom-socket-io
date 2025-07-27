import React, { useState, useContext, useEffect } from 'react'
import { ChatContext } from '../pages/_app'
import LoginHeader from './LoginHeader'
import ConnectionStatus from './ConnectionStatus'
import LoginFormFields from './LoginFormFields'
import UserTypeSelector from './UserTypeSelector'
import ErrorDisplay from './ErrorDisplay'
import SubmitButton from './SubmitButton'

export default function LoginForm() {
  const { socket, isConnected, setUserType, setUserName } = useContext(ChatContext)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setLocalUserType] = useState<'admin' | 'guest'>('guest')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Clear error when connection status changes
  useEffect(() => {
    if (!isConnected) {
      setError('Not connected to server. Please wait...')
    } else {
      setError('')
    }
  }, [isConnected])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    if (userType === 'admin' && !password.trim()) {
      setError('Please enter admin password')
      return
    }

    if (!socket || !isConnected) {
      setError('Not connected to server. Please wait for connection...')
      return
    }

    setIsLoading(true)
    setError('')

    // Remove any existing listeners to prevent duplicates
    socket.off('joined')
    socket.off('approved')
    socket.off('rejected')

    // Set up event listeners
    socket.once('joined', (data: { success: boolean; userType?: string; error?: string }) => {
      setIsLoading(false)
      if (data.success) {
        setUserName(name.trim())
        setUserType(data.userType as 'admin' | 'guest' | 'pending')
        setPassword('') // Clear password after successful login
      } else {
        setError(data.error || 'Failed to join chat')
      }
    })

    // Listen for approval (for guests)
    socket.once('approved', (data: { userName: string }) => {
      setIsLoading(false)
      setUserName(name.trim())
      setUserType('guest')
    })

    // Listen for rejection (for guests)
    socket.once('rejected', () => {
      setIsLoading(false)
      setError('Your request was rejected by the admin')
    })

    // Emit join event
    
    socket.emit('join', { 
      name: name.trim(), 
      type: userType,
      password: userType === 'admin' ? password.trim() : undefined
    })

    // Set a timeout in case the server doesn't respond
    setTimeout(() => {
      if (isLoading) {
        setIsLoading(false)
        setError('Server timeout. Please try again.')
        socket.off('joined')
        socket.off('approved')
        socket.off('rejected')
      }
    }, 10000) // 10 second timeout
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <LoginHeader />

        <ConnectionStatus isConnected={isConnected} />

        <form onSubmit={handleSubmit} className="space-y-6">
          <LoginFormFields
            name={name}
            password={password}
            userType={userType}
            isLoading={isLoading}
            onNameChange={setName}
            onPasswordChange={setPassword}
          />

          <UserTypeSelector
            userType={userType}
            onUserTypeChange={setLocalUserType}
            isLoading={isLoading}
          />

          <ErrorDisplay error={error} />

          <SubmitButton
            isLoading={isLoading}
            isDisabled={isLoading || !name.trim() || (userType === 'admin' && !password.trim()) || !isConnected}
          />
        </form>
      </div>
    </div>
  )
} 