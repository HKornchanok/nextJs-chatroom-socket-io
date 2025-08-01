# Real-Time Chat Application

A real-time chat application built with Next.js and Socket.IO that supports admin-guest communication with approval system.

## Features

- **Real-time messaging** with Socket.IO
- **Admin-Guest system** with approval workflow
- **AI-powered responses** - ChatGPT automatically responds to guest messages
- **Typing indicators** to show when users are typing
- **Admin controls** - approve/reject guests, kick users
- **Cross-platform** - works across different PCs and devices
- **Responsive design** with Tailwind CSS

## How It Works

### Cross-PC Communication

✅ **Yes, this works across different PCs!**

The application uses WebSocket connections through Socket.IO, which means:

- Users can connect from any device/PC with internet access
- Real-time updates work instantly across all connected devices
- Admin can control the chat from any location
- Messages and user status sync in real-time

### User Types

1. **Admin**: Can approve/reject guests, kick users, send messages
2. **Guest**: Must be approved by admin before joining the chat, receives AI responses
3. **Pending Guest**: Waiting for admin approval

### AI Integration

- **ChatGPT Responses**: When guests send messages, the AI assistant automatically responds
- **Natural Conversations**: AI responses are delayed by 1-3 seconds to feel more natural
- **Contextual Responses**: AI considers the guest's name and message content
- **Admin Monitoring**: Admins can see all AI responses in the chat

## Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**
   Create `.env.local` file:

   ```env
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ADMIN_PASSWORD=your-admin-password
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Run development server**

   ```bash
   npm run dev
   ```

4. **Open in browser**
   - Visit `http://localhost:3000`
   - Join as admin or guest
   - Test ChatGPT integration at `http://localhost:3000/test-chatgpt`
   - Test ChatGPT integration at `http://localhost:3000/test-chatgpt`

## Deployment

This application is designed to work across different PCs when deployed.

### Quick Deploy to Railway (Recommended)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/new?template=https://github.com/your-username/real-time-chat)

1. **Fork this repository** to your GitHub account
2. **Click the "Deploy on Railway" button** above
3. **Set environment variables**:
   - `ADMIN_PASSWORD`: Your admin password
   - `NEXT_PUBLIC_SITE_URL`: Your Railway deployment URL
   - `OPENAI_API_KEY`: Your OpenAI API key (get from https://platform.openai.com/api-keys)
   - `NODE_ENV`: `production`
4. **Deploy** and enjoy!

For detailed Railway deployment instructions, see [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md).

### Other Deployment Options

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for other platforms.

### Supported Platforms

- **Railway** (Recommended) - [Deployment Guide](./RAILWAY_DEPLOYMENT.md) - Best for Socket.IO
- **Render** - Good for real-time applications
- **DigitalOcean App Platform** - Full control
- **Self-hosted servers**
- **Any platform supporting Node.js and WebSockets**

## Technology Stack

- **Frontend**: Next.js, React, TypeScript
- **Real-time**: Socket.IO
- **AI Integration**: OpenAI ChatGPT API
- **Styling**: Tailwind CSS
- **Deployment**: Works on any Node.js hosting platform

## Testing Cross-PC Communication

1. Deploy the application to a hosting service (Railway recommended)
2. Open the app on different devices/PCs
3. Test admin login and guest approval
4. Verify real-time messaging works across all devices

The WebSocket connection ensures real-time communication regardless of the physical location of the users.
