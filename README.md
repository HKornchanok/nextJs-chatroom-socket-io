# Real-Time Chat Application

A real-time chat application built with Next.js and Socket.IO that supports admin-guest communication with approval system.

## Features

- **Real-time messaging** with Socket.IO
- **Admin-Guest system** with approval workflow
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
2. **Guest**: Must be approved by admin before joining the chat
3. **Pending Guest**: Waiting for admin approval

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
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - Visit `http://localhost:3000`
   - Join as admin or guest

## Deployment

This application is designed to work across different PCs when deployed. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Supported Platforms
- **Vercel** (Recommended)
- **Netlify**
- **Self-hosted servers**
- **Any platform supporting Node.js and WebSockets**

## Technology Stack

- **Frontend**: Next.js, React, TypeScript
- **Real-time**: Socket.IO
- **Styling**: Tailwind CSS
- **Deployment**: Works on any Node.js hosting platform

## Testing Cross-PC Communication

1. Deploy the application to a hosting service
2. Open the app on different devices/PCs
3. Test admin login and guest approval
4. Verify real-time messaging works across all devices

The WebSocket connection ensures real-time communication regardless of the physical location of the users. 