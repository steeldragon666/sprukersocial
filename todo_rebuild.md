# Content Studio Pro - Complete Rebuild

## Phase 1: Database Schema & Core Services
- [x] Replace old schema with new Content Studio Pro schema
- [x] Implement AI Content Service (Claude + image generation)
- [x] Implement Instagram Graph API Service
- [x] Implement Image Storage Service (Cloudinary)
- [ ] Implement Post Scheduling Worker (pending)
- [x] Create database query helpers for all tables
- [x] Push new schema to database

## Phase 2: Backend Routers & API
- [x] Posts router (CRUD, generation, scheduling, publishing)
- [x] Instagram accounts router (OAuth, sync, management)
- [ ] Brand kits router (not yet needed)
- [ ] Content topics router (not yet needed)
- [ ] Analytics router (included in posts router)
- [ ] Activity logs router (not yet needed)

## Phase 3: Frontend Dashboard
- [ ] Content calendar view (visual timeline)
- [ ] Post creation & editing interface
- [ ] AI content generation UI
- [ ] Image preview and editing
- [ ] Scheduling interface
- [ ] Analytics dashboard
- [ ] Multi-account switcher
- [ ] Brand kit management
- [ ] Settings page

## Phase 4: Instagram Integration
- [ ] Instagram Graph API OAuth flow
- [ ] Token refresh mechanism
- [ ] Media publishing workflow
- [ ] Analytics fetching
- [ ] Account sync functionality

## Phase 5: Testing & Deployment
- [ ] Test content generation flow
- [ ] Test scheduling and publishing
- [ ] Test multi-account management
- [ ] Update user guide
- [ ] Create deployment checkpoint
