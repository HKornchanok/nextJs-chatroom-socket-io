# Vercel Deployment Guide

This guide will help you deploy the real-time chat application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub**: Your code should be in a Git repository
3. **Node.js**: Version 16 or higher

## Quick Deployment

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect it's a Next.js project

3. **Configure Environment Variables**
   - In your Vercel project dashboard, go to "Settings" → "Environment Variables"
   - Add the following variables:
     ```
     ADMIN_PASSWORD=your-secure-admin-password
     NEXT_PUBLIC_SITE_URL=https://your-project-name.vercel.app
     ```

4. **Deploy**
   - Click "Deploy" and wait for the build to complete
   - Your app will be available at `https://your-project-name.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add ADMIN_PASSWORD
   vercel env add NEXT_PUBLIC_SITE_URL
   ```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_PASSWORD` | Password for admin login | `my-secure-password-123` |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel deployment URL | `https://your-app.vercel.app` |

### Setting Environment Variables

1. **In Vercel Dashboard**:
   - Go to Project Settings → Environment Variables
   - Add each variable with the appropriate value
   - Select all environments (Production, Preview, Development)

2. **Via Vercel CLI**:
   ```bash
   vercel env add ADMIN_PASSWORD
   vercel env add NEXT_PUBLIC_SITE_URL
   ```

## Important Notes for Vercel Deployment

### Socket.IO Limitations

⚠️ **Important**: Vercel's serverless functions have limitations with WebSocket connections:

1. **Function Timeout**: Socket connections may timeout after 30 seconds
2. **Cold Starts**: First connection might be slower
3. **Connection Limits**: Multiple concurrent connections may be limited

### Solutions Implemented

1. **Extended Timeout**: Set to 30 seconds in `vercel.json`
2. **Fallback Transports**: Uses polling as fallback to WebSocket
3. **Reconnection Logic**: Automatic reconnection on disconnection
4. **CORS Configuration**: Proper CORS headers for cross-origin requests

### Performance Optimizations

1. **Keep-Alive**: Socket connections are maintained with ping/pong
2. **Transport Fallback**: Falls back to polling if WebSocket fails
3. **Reconnection**: Automatic reconnection with exponential backoff

## Testing Your Deployment

1. **Test Admin Login**
   - Visit your Vercel URL
   - Try logging in as admin with your `ADMIN_PASSWORD`

2. **Test Guest Connection**
   - Open the app in an incognito window
   - Try joining as a guest
   - Verify approval system works

3. **Test Cross-Device Communication**
   - Open the app on different devices
   - Verify real-time messaging works across devices

## Troubleshooting

### Common Issues

1. **Socket Connection Fails**
   - Check that `NEXT_PUBLIC_SITE_URL` is set correctly
   - Verify CORS settings in `vercel.json`
   - Check browser console for connection errors

2. **Admin Login Doesn't Work**
   - Verify `ADMIN_PASSWORD` environment variable is set
   - Check that the variable is deployed to production

3. **Messages Not Sending**
   - Check Socket.IO connection status
   - Verify server logs in Vercel dashboard
   - Test with different browsers/devices

### Debugging

1. **Check Vercel Logs**
   - Go to your project dashboard
   - Click on "Functions" tab
   - Check logs for `/api/socket` function

2. **Browser Console**
   - Open browser developer tools
   - Check console for Socket.IO connection messages
   - Look for any error messages

3. **Network Tab**
   - Check if WebSocket connections are established
   - Verify API calls to `/api/socket` are successful

## Production Considerations

### Security

1. **Strong Admin Password**: Use a strong, unique password
2. **HTTPS Only**: Vercel provides HTTPS by default
3. **CORS Restrictions**: Consider restricting CORS origins in production

### Monitoring

1. **Vercel Analytics**: Enable Vercel Analytics for performance monitoring
2. **Error Tracking**: Consider adding error tracking (Sentry, etc.)
3. **Uptime Monitoring**: Set up uptime monitoring for your domain

### Scaling

1. **Vercel Pro**: Consider upgrading to Vercel Pro for better performance
2. **Custom Domain**: Set up a custom domain for better branding
3. **CDN**: Vercel provides global CDN automatically

## Alternative Deployment Options

If you experience issues with Socket.IO on Vercel, consider:

1. **Railway**: Better support for WebSocket applications
2. **Render**: Good for real-time applications
3. **DigitalOcean App Platform**: More control over server configuration
4. **Self-hosted**: Deploy on your own server for full control

## Support

If you encounter issues:

1. Check the [Vercel documentation](https://vercel.com/docs)
2. Review Socket.IO serverless deployment guides
3. Check the project's GitHub issues
4. Consider the alternative deployment options above

## Next Steps

After successful deployment:

1. **Custom Domain**: Set up a custom domain
2. **SSL Certificate**: Verify HTTPS is working
3. **Performance**: Monitor and optimize performance
4. **Features**: Add additional features as needed 