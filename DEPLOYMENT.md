# Deployment Guide for Real-Time Chat

## Overview

This real-time chat application uses Socket.IO for real-time communication and can be deployed across different PCs.

## Environment Variables

Create a `.env.local` file in your project root with:

```env
# Site URL for production (replace with your actual domain)
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Admin password (change this in production)
ADMIN_PASSWORD=your-secure-admin-password
```

## Deployment Options

### 1. Vercel (Recommended)

- Connect your GitHub repository to Vercel
- Set environment variables in Vercel dashboard
- Deploy automatically on push

### 2. Netlify

- Connect your GitHub repository to Netlify
- Set build command: `npm run build`
- Set publish directory: `.next`
- Add environment variables in Netlify dashboard

### 3. Self-Hosted Server

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Cross-PC Communication

✅ **Works across different PCs** - The application uses WebSocket connections that work over the internet

✅ **Real-time updates** - Messages, typing indicators, and user status updates work in real-time

✅ **Admin controls** - Admin can approve/reject guests and kick users from any location

## Important Notes

1. **CORS Configuration**: The server is configured to accept connections from your domain in production
2. **WebSocket Support**: Make sure your hosting provider supports WebSocket connections
3. **Environment Variables**: Always set `NEXT_PUBLIC_SITE_URL` to your actual domain
4. **Admin Password**: Change the default admin password in production

## Testing Deployment

1. Deploy to your hosting provider
2. Open the app on different devices/PCs
3. Test admin login and guest approval
4. Verify real-time messaging works across devices

## Troubleshooting

- **Connection issues**: Check that `NEXT_PUBLIC_SITE_URL` is set correctly
- **WebSocket errors**: Ensure your hosting provider supports WebSockets
- **Admin login fails**: Verify the admin password in your environment variables
