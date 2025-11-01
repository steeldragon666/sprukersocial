#!/bin/bash

# Headshot Studio Pro - Deployment Script
# Run this script to deploy to production

set -e  # Exit on error

echo "🚀 Headshot Studio Pro - Deployment Script"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure your API keys."
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Check for required environment variables
required_vars=(
    "DATABASE_URL"
    "ANTHROPIC_API_KEY"
    "REPLICATE_API_TOKEN"
    "CLOUDINARY_CLOUD_NAME"
    "CLOUDINARY_API_KEY"
    "CLOUDINARY_API_SECRET"
)

echo "🔍 Checking required environment variables..."
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env; then
        echo "❌ Missing: $var"
        exit 1
    fi
done
echo "✅ All required environment variables present"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
echo "✅ Dependencies installed"
echo ""

# Build packages
echo "🏗️  Building packages..."
pnpm build --filter=@headshot-studio/database
pnpm build --filter=@headshot-studio/shared
echo "✅ Packages built"
echo ""

# Push database schema
echo "🗄️  Pushing database schema..."
pnpm db:push
echo "✅ Database schema updated"
echo ""

# Build API
echo "🔧 Building headshot studio API..."
pnpm build --filter=@headshot-studio/api
echo "✅ API built"
echo ""

# Build Instagram automation
echo "🔧 Building Instagram automation..."
pnpm build --filter=@headshot-studio/instagram-automation
echo "✅ Instagram automation built"
echo ""

echo "✨ Deployment build complete!"
echo ""
echo "Next steps:"
echo "1. Deploy API to Railway/Render/Fly.io"
echo "2. Deploy Frontend to Vercel (if applicable)"
echo "3. Update webhook URLs"
echo "4. Test all integrations"
echo ""
echo "🎉 Ready to launch! Good luck!"
