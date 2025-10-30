# PowerPlant Energy Instagram Automation - User Guide

**Website URL:** Available after deployment  
**Purpose:** Automate Instagram content creation and posting for PowerPlant Energy's sustainable fuels and bioenergy business.  
**Access:** Login required with Manus authentication

## Powered by Manus

This application is built with cutting-edge technology to deliver reliable, scalable automation:

**Frontend:** React 19 with TypeScript provides a modern, type-safe user interface. Tailwind CSS 4 and shadcn/ui components deliver a polished, professional design system.

**Backend:** Express 4 server with tRPC 11 ensures end-to-end type safety between frontend and backend. Drizzle ORM manages database operations with full TypeScript support.

**Database:** MySQL/TiDB provides robust data storage for posts, analytics, and automation settings with high availability.

**AI Integration:** Claude API (Anthropic) powers intelligent content generation. Built-in image generation creates visual content automatically.

**Automation:** Python-based Instagram engine using Instagrapi handles posting and follower growth. Node.js cron scheduler manages timing and frequency.

**Deployment:** Auto-scaling infrastructure with global CDN ensures 24/7 availability and fast performance worldwide.

## Using Your Website

**Access the Dashboard:** Click "Dashboard" in the top navigation after signing in. You'll see your automation status, post statistics, and recent activity.

**Generate a Post:** Click "Generate Post" → AI creates content about SAF, bioenergy, or renewables → Post is scheduled automatically with hashtags and generated image → View in "Recent Posts" section.

**Control Automation:** Click "Start Automation" to begin scheduled posting → System posts every 15 minutes with randomization → Click "Pause Automation" to stop → Status indicator shows green when active.

**Monitor Activity:** View "Recent Posts" card to see scheduled and posted content → Check "Activity Log" for all automation actions → Review post status (scheduled, posted, or failed).

**Track Performance:** "Total Posts" card shows posted and scheduled counts → "Following" card displays accounts you're following → "Engagement" metrics coming soon.

## Managing Your Website

**Dashboard Panel:** View live preview of your automation system and monitor real-time activity.

**Database Panel:** Access full CRUD interface for posts, accounts, and settings. Connection details in bottom-left settings (enable SSL for production).

**Settings → General:** Update website name and logo using VITE_APP_TITLE and VITE_APP_LOGO variables.

**Settings → Secrets:** View and edit Instagram credentials. Update INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD if needed.

**Settings → Notifications:** Configure alerts for automation events (requires web-db-user feature).

## Next Steps

Talk to Manus AI anytime to request changes or add features. Try generating your first post to see the AI content creation in action—click "Generate Post" on the dashboard and watch your Instagram automation come to life!

### Production Readiness

Before going live, ensure you have production credentials:

- **Instagram:** Using test credentials. Update INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD in Settings → Secrets with your production Instagram Business account.
- **Anthropic Claude:** Using test API key. Update ANTHROPIC_API_KEY in Settings → Secrets with your production key from https://console.anthropic.com

Get production keys from service websites before going live.
