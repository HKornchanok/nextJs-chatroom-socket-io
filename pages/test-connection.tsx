import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export default function TestConnection() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    const socketInstance = io({
      path: '/api/socket',
      // Use both polling and WebSocket for Railway (full support)
      transports: ['polling', 'websocket'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      setMessages(prev => [...prev, `✅ Connected: ${socketInstance.id}`]);
    });

    socketInstance.on('disconnect', reason => {
      setIsConnected(false);
      setMessages(prev => [...prev, `❌ Disconnected: ${reason}`]);
    });

    socketInstance.on('connect_error', error => {
      console.error('❌ Connection error:', error);
      setIsConnected(false);
      setMessages(prev => [...prev, `❌ Connection Error: ${error.message}`]);
    });

    socketInstance.on('error', error => {
      console.error('❌ Socket error:', error);
      setMessages(prev => [...prev, `❌ Socket Error: ${error}`]);
    });

    socketInstance.on('reconnect', attemptNumber => {
      setIsConnected(true);
      setMessages(prev => [
        ...prev,
        `🔄 Reconnected after ${attemptNumber} attempts`,
      ]);
    });

    socketInstance.on('reconnect_error', error => {
      console.error('❌ Reconnection error:', error);
      setMessages(prev => [...prev, `❌ Reconnection Error: ${error.message}`]);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after all attempts');
      setMessages(prev => [
        ...prev,
        '❌ Reconnection failed after all attempts',
      ]);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const sendTestMessage = () => {
    if (socket && testMessage.trim()) {
      socket.emit('sendMessage', testMessage);
      setMessages(prev => [...prev, `📤 Sent: ${testMessage}`]);
      setTestMessage('');
    }
  };

  const testJoin = () => {
    if (socket) {
      socket.emit('join', { name: 'TestUser', type: 'guest' });
      setMessages(prev => [...prev, '📤 Joining as guest...']);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          Socket.IO Connection Test (Railway)
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Connection Status */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
            <div className="space-y-2">
              <div
                className={`flex items-center ${isConnected ? 'text-green-600' : 'text-red-600'}`}
              >
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                ></div>
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              <div className="text-sm text-gray-600">
                Socket ID: {socket?.id || 'Not connected'}
              </div>
              <div className="text-sm text-gray-600">
                Transport: {socket?.io?.engine?.transport?.name || 'Unknown'}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={testJoin}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Test Join as Guest
              </button>
            </div>
          </div>

          {/* Test Message */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Message</h2>
            <div className="space-y-2">
              <input
                type="text"
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                placeholder="Enter test message..."
                className="w-full px-3 py-2 border border-gray-300 rounded"
                onKeyPress={e => e.key === 'Enter' && sendTestMessage()}
              />
              <button
                onClick={sendTestMessage}
                disabled={!isConnected || !testMessage.trim()}
                className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300"
              >
                Send Test Message
              </button>
            </div>
          </div>
        </div>

        {/* Messages Log */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Connection Log</h2>
          <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-gray-500">No messages yet...</div>
            ) : (
              <div className="space-y-1">
                {messages.map((message, index) => (
                  <div key={index} className="text-sm font-mono">
                    {message}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setMessages([])}
            className="mt-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear Log
          </button>
        </div>

        {/* Environment Info */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            Environment Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>NODE_ENV:</strong> {process.env.NODE_ENV}
            </div>
            <div>
              <strong>NEXT_PUBLIC_SITE_URL:</strong>{' '}
              {process.env.NEXT_PUBLIC_SITE_URL || 'Not set'}
            </div>
            <div>
              <strong>Current URL:</strong>{' '}
              {typeof window !== 'undefined'
                ? window.location.href
                : 'Server-side'}
            </div>
            <div>
              <strong>User Agent:</strong>{' '}
              {typeof window !== 'undefined'
                ? window.navigator.userAgent
                : 'Server-side'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
