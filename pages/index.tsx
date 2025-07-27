import React, { useContext, useState, useEffect } from 'react';
import { ChatContext } from './_app';
import ChatRoom from '../components/ChatRoom';
import LoginForm from '../components/LoginForm';

export default function Home() {
  const { userType, socket, isConnected, setUserType, setUserName, setUserId } =
    useContext(ChatContext);
  const [isLoading, setIsLoading] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    // Listen for approved event (for guests)
    const handleApproved = (data: { userName: string }) => {
      setUserType('guest');
      setUserName(data.userName);
      setUserId(socket?.id || '');
    };

    // Listen for kicked event (for guests)
    const handleKicked = () => {
      // Don't immediately set userType to null - let ChatRoom handle the kicked event
      // The ChatRoom component will show a modal and handle the redirect
    };

    // Listen for rejected event (for guests)
    const handleRejected = () => {
      setShowRejectedModal(true);
    };

    // Listen for pending guest count updates
    const handlePendingGuestCount = (data: { count: number }) => {
      setPendingUsersCount(data.count);
    };

    // Listen for joined event to get initial pending count
    const handleJoined = (data: {
      success: boolean;
      userType?: string;
      users?: any;
    }) => {
      if (data.success && data.userType === 'pending' && data.users) {
        setPendingUsersCount(data.users.pendingGuests?.length || 0);
      }
    };

    // Add debugging for all socket events
    socket.on('connect', () => {
      // Socket connected
    });

    socket.on('disconnect', () => {
      // Socket disconnected
    });

    socket.on('approved', handleApproved);
    socket.on('kicked', handleKicked);
    socket.on('rejected', handleRejected);
    socket.on('pendingGuestCount', handlePendingGuestCount);
    socket.on('joined', handleJoined);

    // Add a general event listener for debugging
    const originalEmit = socket.emit;
    socket.emit = function (event: string, ...args: any[]) {
      return originalEmit.apply(this, [event, ...args]);
    };

    return () => {
      socket.off('approved', handleApproved);
      socket.off('kicked', handleKicked);
      socket.off('rejected', handleRejected);
      socket.off('pendingGuestCount', handlePendingGuestCount);
      socket.off('joined', handleJoined);
      // Restore original emit
      socket.emit = originalEmit;
    };
  }, [socket, setUserType, setUserName, userType]);

  // Add timeout for pending users
  useEffect(() => {
    if (userType === 'pending') {
      const interval = setInterval(() => {
        setWaitingTime(prev => {
          const newTime = prev + 1;
          // Auto-redirect after 5 minutes (300 seconds)
          if (newTime >= 300) {
            setShowTimeoutModal(true);
            // Emit cancelRequest to remove user from pending list
            if (socket) {
              socket.emit('cancelRequest');
            }
            setUserType(null);
            setUserName('');
            return 0;
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setWaitingTime(0);
    }
  }, [userType, setUserType, setUserName, socket]);

  if (!socket) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Connecting to chat server...</p>
          <p className="mt-2 text-sm text-gray-500">
            Please wait while we establish a connection
          </p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Connection failed</p>
          <p className="mt-2 text-sm text-gray-500">
            Unable to connect to the chat server
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!userType) {
    return <LoginForm />;
  }

  if (userType === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl text-center max-w-md w-full border border-white/20">
          {/* Animated loading indicator */}
          <div className="relative mb-6">
            <div className="w-16 h-16 mx-auto relative">
              <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
              <div className="absolute inset-2 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Title with gradient text */}
          <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Waiting for Approval
          </h2>

          {/* Pending users count with better styling */}
          <div className="mb-4">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-red-100 border border-orange-200">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm font-medium text-orange-700">
                {pendingUsersCount} user{pendingUsersCount !== 1 ? 's' : ''}{' '}
                waiting
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            Please wait while the admin reviews your request to join the chat
            room.
          </p>

          {/* Timer with better styling */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Waiting time</div>
              <div className="text-lg font-mono font-semibold text-gray-800">
                {Math.floor(waitingTime / 60)}:
                {(waitingTime % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${Math.min((waitingTime / 300) * 100, 100)}%`,
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {Math.min(Math.floor((waitingTime / 300) * 100), 100)}% of timeout
            </div>
          </div>

          {/* Cancel button with better styling */}
          <div className="space-y-3">
            <button
              onClick={() => {
                if (socket) {
                  socket.emit('cancelRequest');
                }
                setUserType(null);
                setUserName('');
              }}
              className="w-full px-6 py-3 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 hover:border-red-300 transition-all duration-200 flex items-center justify-center group"
            >
              <svg
                className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Cancel Request
            </button>
          </div>
        </div>

        {/* Rejected Modal with improved design */}
        {showRejectedModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-4 duration-300">
              <div className="text-center">
                {/* Icon with animation */}
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-red-100 to-pink-100 mb-6 animate-bounce">
                  <svg
                    className="h-8 w-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Request Rejected
                </h3>

                {/* Message */}
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Your request to join the chat has been rejected by the admin.
                  You can try again later or contact support for assistance.
                </p>

                {/* Action button */}
                <button
                  onClick={() => {
                    setShowRejectedModal(false);
                    // Emit cancelRequest to remove user from pending list
                    if (socket) {
                      socket.emit('cancelRequest');
                    }
                    setUserType(null);
                    setUserName('');
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Return to Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Timeout Modal */}
        {showTimeoutModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-4 duration-300">
              <div className="text-center">
                {/* Icon with animation */}
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-orange-100 to-red-100 mb-6 animate-bounce">
                  <svg
                    className="h-8 w-8 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Request Timeout
                </h3>

                {/* Message */}
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Your request to join the chat has timed out after 5 minutes.
                  The admin may be busy or unavailable. You can try again later.
                </p>

                {/* Action button */}
                <button
                  onClick={() => {
                    setShowTimeoutModal(false);
                    // Emit cancelRequest to remove user from pending list (in case it wasn't already emitted)
                    if (socket) {
                      socket.emit('cancelRequest');
                    }
                    setUserType(null);
                    setUserName('');
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Return to Login
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return <ChatRoom />;
}
