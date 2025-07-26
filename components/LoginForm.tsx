import React, { useState, useContext, useEffect } from 'react'
import { ChatContext } from '../pages/_app'

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
      console.log('Received joined response:', data)
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
      console.log('Guest approved:', data)
      setIsLoading(false)
      setUserName(name.trim())
      setUserType('guest')
    })

    // Listen for rejection (for guests)
    socket.once('rejected', () => {
      console.log('Guest rejected')
      setIsLoading(false)
      setError('Your request was rejected by the admin')
    })

    // Emit join event
    console.log('Emitting join event:', { 
      name: name.trim(), 
      type: userType,
      password: userType === 'admin' ? password.trim() : undefined
    })
    
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to Chat Room</h1>
          <p className="text-gray-600">Choose your role and enter your name to start chatting</p>
        </div>

        {/* Connection Status */}
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          isConnected 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`}>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            {isConnected ? 'Connected to server' : 'Connecting to server...'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter admin password"
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Join as
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLocalUserType('admin')}
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
                onClick={() => setLocalUserType('guest')}
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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !name.trim() || (userType === 'admin' && !password.trim()) || !isConnected}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Joining...
              </div>
            ) : (
              'Join Chat Room'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <div className="text-sm text-gray-500 space-y-1">
            <p>• Admin can approve/kick guests</p>
            <p>• Only one guest allowed at a time</p>
            <p>• Guests need admin approval to join</p>
            <p>• Admin requires password verification</p>
          </div>
        </div>
      </div>
    </div>
  )
} 