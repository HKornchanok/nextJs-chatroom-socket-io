# Railway Deployment Guide

Railway is one of the best platforms for hosting Socket.IO applications due to its excellent WebSocket support and simple deployment process.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Account**: Your code should be in a Git repository
3. **Node.js**: Version 16 or higher

## Quick Deployment

### Option 1: Deploy via Railway Dashboard (Recommended)

1. **Push your code to GitHub**

   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Deploy to Railway**
   - Go to [railway.app/dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will automatically detect it's a Next.js project

3. **Configure Environment Variables**
   - In your Railway project dashboard, go to "Variables" tab
   - Add the following variables:
     ```
     ADMIN_PASSWORD=your-secure-admin-password
     NEXT_PUBLIC_SITE_URL=https://your-project-name.railway.app
     NODE_ENV=production
     ```

4. **Deploy**
   - Railway will automatically build and deploy your app
   - Your app will be available at `https://your-project-name.railway.app`

### Option 2: Deploy via Railway CLI

1. **Install Railway CLI**

   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**

   ```bash
   railway login
   ```

3. **Initialize and Deploy**

   ```bash
   railway init
   railway up
   ```

4. **Set Environment Variables**
   ```bash
   railway variables set ADMIN_PASSWORD=your-secure-password
   railway variables set NEXT_PUBLIC_SITE_URL=https://your-project-name.railway.app
   railway variables set NODE_ENV=production
   ```

## Environment Variables

### Required Variables

| Variable               | Description                 | Example                        |
| ---------------------- | --------------------------- | ------------------------------ |
| `ADMIN_PASSWORD`       | Password for admin login    | `my-secure-password-123`       |
| `NEXT_PUBLIC_SITE_URL` | Your Railway deployment URL | `https://your-app.railway.app` |
| `NODE_ENV`             | Environment setting         | `production`                   |

## Railway Configuration

### Automatic Detection

Railway automatically detects Next.js projects and configures:

- Build command: `npm run build`
- Start command: `npm start`
- Node.js environment

### Custom Configuration (Optional)

Create `railway.json` for custom settings:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

## Advantages of Railway for Socket.IO

### ✅ **WebSocket Support**

- Full WebSocket support without limitations
- Persistent connections work perfectly
- No serverless function timeouts

### ✅ **Performance**

- No cold starts
- Consistent performance
- Better for real-time applications

### ✅ **Scalability**

- Automatic scaling based on demand
- Better resource allocation
- More predictable pricing

### ✅ **Development Experience**

- Easy deployment from GitHub
- Automatic builds on push
- Built-in logging and monitoring

## Testing Your Deployment

1. **Test Admin Login**
   - Visit your Railway URL
   - Try logging in as admin with your `ADMIN_PASSWORD`

2. **Test Guest Connection**
   - Open the app in an incognito window
   - Try joining as a guest
   - Verify approval system works

3. **Test Cross-Device Communication**
   - Open the app on different devices
   - Verify real-time messaging works across devices

4. **Test WebSocket Connection**
   - Visit `/test-connection` to verify Socket.IO is working
   - Check that WebSocket upgrade is successful

## Monitoring and Logs

### View Logs

```bash
railway logs
```

### Monitor Performance

- Go to your Railway dashboard
- Check "Metrics" tab for performance data
- Monitor resource usage

### Health Checks

Railway automatically health checks your application:

- Endpoint: `/`
- Timeout: 300 seconds
- Restart policy: On failure

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check build logs in Railway dashboard
   - Verify all dependencies are in `package.json`
   - Ensure Node.js version compatibility

2. **Environment Variables**
   - Verify all required variables are set
   - Check variable names match exactly
   - Redeploy after changing variables

3. **Socket.IO Connection Issues**
   - Check that `NEXT_PUBLIC_SITE_URL` is correct
   - Verify CORS settings
   - Test with `/test-connection` page

### Debugging Commands

```bash
# View logs
railway logs

# Check status
railway status

# Restart service
railway service restart

# Open shell
railway shell
```

## Pricing

### Free Tier

- $5 credit per month
- Suitable for development and small projects
- Automatic sleep after inactivity

### Paid Plans

- Pay-as-you-go pricing
- No sleep on paid plans
- Better performance and resources

## Migration from Vercel

If migrating from Vercel:

1. **Update Socket.IO Configuration**
   - Remove polling-only transport restriction
   - Enable WebSocket upgrade
   - Update CORS settings

2. **Update Environment Variables**
   - Set `NEXT_PUBLIC_SITE_URL` to Railway URL
   - Keep `ADMIN_PASSWORD` the same

3. **Test Thoroughly**
   - Verify all features work
   - Test cross-device communication
   - Check performance improvements

## Next Steps

After successful deployment:

1. **Custom Domain**: Set up a custom domain in Railway
2. **SSL Certificate**: Railway provides automatic SSL
3. **Monitoring**: Set up alerts and monitoring
4. **Backup**: Configure database backups if needed

## Support

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [GitHub Issues](https://github.com/railwayapp/railway)

Railway is an excellent choice for Socket.IO applications and should provide much better performance and reliability than Vercel for your real-time chat app!
