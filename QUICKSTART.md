# Quick Start Guide - Headshot Studio Pro

## 🚀 Get Up and Running in 5 Minutes

### Prerequisites
- Node.js 20+ installed
- pnpm installed (`npm install -g pnpm`)
- MySQL or PostgreSQL database
- API keys ready (see below)

### Step 1: Clone and Install

```bash
git clone https://github.com/steeldragon666/sprukersocial.git
cd sprukersocial
pnpm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database (required)
DATABASE_URL="mysql://user:password@localhost:3306/headshot_studio"

# AI Services (required for headshot studio)
ANTHROPIC_API_KEY="sk-ant-..."
REPLICATE_API_TOKEN="r8_..."

# Image Storage (required)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Payments (optional, for production)
STRIPE_API_KEY="sk_test_..."

# Instagram (optional, for automation)
INSTAGRAM_USERNAME="your-username"
INSTAGRAM_PASSWORD="your-password"
```

### Step 3: Set Up Database

```bash
pnpm db:push
```

This will create all necessary tables in your database.

### Step 4: Start Development

```bash
# Start all apps
pnpm dev
```

This starts:
- **Headshot Studio API**: http://localhost:4000
- **Instagram Automation**: http://localhost:5000

Or start individually:

```bash
# Just headshot studio
pnpm dev --filter=@headshot-studio/api

# Just Instagram automation
pnpm dev --filter=@headshot-studio/instagram-automation
```

## 🧪 Test the API

### Using curl

```bash
# Health check
curl http://localhost:4000/health

# Create a project (with mock user ID)
curl -X POST http://localhost:4000/trpc/project.create \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1" \
  -d '{"name": "My Test Project"}'
```

### Using the tRPC Client (TypeScript)

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './apps/headshot-studio/src/routers';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:4000/trpc',
      headers: {
        'x-user-id': '1', // Mock user ID
      },
    }),
  ],
});

// Create a project
const project = await client.project.create.mutate({
  name: 'My Headshots',
});

console.log('Project created:', project);
```

## 📝 Common Tasks

### Add a New Package

```bash
# Create package directory
mkdir -p packages/new-package/src
cd packages/new-package

# Create package.json
cat > package.json << EOF
{
  "name": "@headshot-studio/new-package",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts"
}
EOF

# Install dependencies
pnpm install
```

### Add a New App

```bash
# Create app directory
mkdir -p apps/new-app/src
cd apps/new-app

# Create package.json
cat > package.json << EOF
{
  "name": "@headshot-studio/new-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "@headshot-studio/database": "workspace:*",
    "@headshot-studio/shared": "workspace:*"
  }
}
EOF

# Install dependencies
pnpm install
```

### Run Database Migrations

```bash
# Generate Prisma client
pnpm db:generate

# Push schema changes
pnpm db:push

# Open Prisma Studio
pnpm db:studio
```

### Build for Production

```bash
# Build all packages and apps
pnpm build

# Build specific app
pnpm build --filter=@headshot-studio/api
```

### Run Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm test --filter=@headshot-studio/shared
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9

# Or change port in .env
PORT=4001
```

### Database Connection Error

```bash
# Check database is running
mysql -u user -p

# Verify DATABASE_URL in .env
# Make sure database exists
mysql -u user -p -e "CREATE DATABASE headshot_studio;"
```

### pnpm Install Fails

```bash
# Clear cache
pnpm store prune

# Remove node_modules
rm -rf node_modules
rm pnpm-lock.yaml

# Reinstall
pnpm install
```

### Turbo Cache Issues

```bash
# Clear turbo cache
rm -rf .turbo

# Force rebuild
pnpm build --force
```

## 📚 Next Steps

1. **Read the full README**: `README.md`
2. **Review project summary**: `PROJECT_SUMMARY.md`
3. **Check API documentation**: Explore tRPC endpoints
4. **Set up authentication**: Add user authentication
5. **Deploy to production**: Use `deploy.sh`

## 🆘 Get Help

- Check existing issues on GitHub
- Review the documentation
- Contact the maintainer

---

**Happy coding! 🎉**
