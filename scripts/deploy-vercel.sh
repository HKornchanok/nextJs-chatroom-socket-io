#!/bin/bash

# Vercel Deployment Script for Real-Time Chat App
# This script helps automate the deployment process

set -e

echo "🚀 Starting Vercel deployment for Real-Time Chat App..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please log in to Vercel..."
    vercel login
fi

# Build the project
echo "📦 Building the project..."
npm run build

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in your Vercel dashboard:"
echo "   - ADMIN_PASSWORD=your-secure-password"
echo "   - NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app"
echo ""
echo "2. Test your deployment:"
echo "   - Visit your Vercel URL"
echo "   - Try logging in as admin"
echo "   - Test guest connections"
echo ""
echo "3. For detailed instructions, see VERCEL_DEPLOYMENT.md" 