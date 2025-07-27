import React from 'react'

interface SubmitButtonProps {
  isLoading: boolean
  isDisabled: boolean
}

export default function SubmitButton({ isLoading, isDisabled }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isDisabled}
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
  )
} 