# Headshot Studio Pro

AI-powered professional headshot generation and Instagram automation platform built with Turborepo.

## 🏗️ Project Structure

This is a monorepo containing multiple applications and shared packages:

```
headshot-studio-pro/
├── apps/
│   ├── headshot-studio/      # Headshot generation API (Express + tRPC)
│   └── instagram-automation/  # Instagram automation app (existing)
├── packages/
│   ├── database/             # Prisma schema and client
│   ├── shared/               # Shared types, constants, and utilities
│   └── ui/                   # Shared UI components (future)
```

## 🚀 Features

### Headshot Studio
- **AI Photo Analysis**: Claude Vision analyzes uploaded photos for quality
- **Custom Model Training**: Train personalized Flux LoRA models on Replicate
- **Professional Styles**: 8 industry-specific headshot styles (Corporate, Creative, Medical, etc.)
- **Smart Coaching**: Real-time feedback to improve photo quality
- **Multi-format Export**: Generate headshots in various sizes and formats
- **Team Management**: Consistent branding across team headshots

### Instagram Automation
- **Automated Posting**: Schedule and post content automatically
- **AI Content Generation**: Claude-powered caption and hashtag generation
- **Analytics Dashboard**: Track engagement and growth
- **Multi-account Support**: Manage multiple Instagram accounts

## 📦 Tech Stack

- **Framework**: Turborepo (monorepo management)
- **Backend**: Express.js + tRPC
- **Database**: Prisma + MySQL/PostgreSQL
- **AI Services**:
  - Anthropic Claude (photo analysis, content generation)
  - Replicate (Flux model training, image generation)
- **Storage**: Cloudinary (image hosting and transformations)
- **Payments**: Stripe
- **Frontend**: React 19 + Next.js (future)

## 🛠️ Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- MySQL or PostgreSQL database
- API keys for:
  - Anthropic Claude
  - Replicate
  - Cloudinary
  - Stripe

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/headshot-studio-pro.git
   cd headshot-studio-pro
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Set up the database**
   ```bash
   pnpm db:push
   ```

5. **Start development servers**
   ```bash
   # Start all apps
   pnpm dev

   # Or start specific apps
   pnpm dev --filter=@headshot-studio/api
   pnpm dev --filter=@headshot-studio/instagram-automation
   ```

## 📚 Package Scripts

```bash
# Development
pnpm dev                 # Start all apps in dev mode
pnpm build              # Build all packages and apps
pnpm test               # Run tests across all packages

# Database
pnpm db:push            # Push Prisma schema to database
pnpm db:studio          # Open Prisma Studio
pnpm db:generate        # Generate Prisma Client

# Utilities
pnpm lint               # Lint all packages
pnpm clean              # Clean build artifacts
```

## 🗂️ Database Schema

### Core Models

- **User**: User accounts and authentication
- **Subscription**: Payment plans and billing
- **Project**: Headshot generation projects
- **Photo**: Uploaded user photos
- **Headshot**: Generated headshot images
- **InstagramAccount**: Instagram account credentials
- **InstagramPost**: Scheduled and posted content

## 🔑 API Endpoints

### Headshot Studio API

```
POST   /trpc/project.create           # Create new project
GET    /trpc/project.getById          # Get project details
POST   /trpc/project.uploadPhoto      # Upload photo for analysis
POST   /trpc/project.analyzePhotos    # Analyze all photos
POST   /trpc/project.startTraining    # Start model training
GET    /trpc/project.checkTrainingStatus  # Check training progress
POST   /trpc/project.generatePreview  # Generate preview headshots
POST   /trpc/project.generateFullSet  # Generate full headshot set
```

## 🎨 Style Presets

- **Corporate**: Executive business style, formal office setting
- **Creative**: Artistic, casual professional look
- **Medical**: Healthcare professional, clinical setting
- **Real Estate**: Business casual, approachable
- **Law**: Professional, trustworthy, formal
- **Tech**: Modern, casual professional
- **Finance**: Formal, conservative
- **Academic**: Scholarly, approachable

## 💰 Pricing Tiers

- **Starter** ($39): 10 photos → 40 headshots + 10 top picks
- **Professional** ($79): 20 photos → 100 headshots + custom branding
- **Team** ($299): 5 members, consistent branding, team page

## 🚢 Deployment

### API Deployment (Railway/Render/Fly.io)

```bash
cd apps/headshot-studio
pnpm build
# Deploy to your platform
```

### Frontend Deployment (Vercel)

```bash
cd apps/web
pnpm build
vercel deploy --prod
```

## 📝 Environment Variables

See `.env.example` for all required environment variables.

## 🤝 Contributing

This is a private project. Contact the maintainer for contribution guidelines.

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions, please open a GitHub issue or contact support.

---

**Built with ❤️ using Manus AI**
