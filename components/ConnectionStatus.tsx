import React from 'react'

interface ConnectionStatusProps {
  isConnected: boolean
}

export default function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
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
  )
} 