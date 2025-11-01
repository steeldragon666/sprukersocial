import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * CONTENT STUDIO PRO - DATABASE SCHEMA
 * Production-ready schema for Instagram content management platform
 */

// ============================================================================
// AUTHENTICATION & USERS
// ============================================================================

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// INSTAGRAM ACCOUNTS
// ============================================================================

export const instagramAccounts = mysqlTable("instagram_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(), // Link to user
  instagramUserId: varchar("instagram_user_id", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  profilePictureUrl: text("profile_picture_url"),
  biography: text("biography"),
  followersCount: int("followers_count").default(0),
  followingCount: int("following_count").default(0),
  mediaCount: int("media_count").default(0),
  
  // OAuth & API credentials
  accessToken: text("access_token").notNull(), // Instagram Graph API token
  tokenExpiresAt: timestamp("token_expires_at"),
  
  // Account status
  isActive: boolean("is_active").default(true).notNull(),
  accountType: mysqlEnum("account_type", ["personal", "business", "creator"]).notNull(),
  
  // Metadata
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type InstagramAccount = typeof instagramAccounts.$inferSelect;
export type InsertInstagramAccount = typeof instagramAccounts.$inferInsert;

// ============================================================================
// POSTS & CONTENT
// ============================================================================

export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  accountId: int("account_id").notNull(),
  
  // Content
  caption: text("caption").notNull(),
  imageUrl: text("image_url").notNull(), // Cloudinary URL
  imagePublicId: varchar("image_public_id", { length: 255 }), // For deletion
  hashtags: json("hashtags").$type<string[]>().notNull(), // Array of hashtags
  
  // Metadata
  topic: varchar("topic", { length: 255 }), // What was generated about
  aiPrompt: text("ai_prompt"), // Prompt used for image generation
  
  // Scheduling & Status
  status: mysqlEnum("status", [
    "draft",      // Being edited
    "scheduled",  // Queued for posting
    "publishing", // Currently being published
    "published",  // Successfully posted
    "failed"      // Failed to post
  ]).default("draft").notNull(),
  
  scheduledFor: timestamp("scheduled_for"), // When to post
  publishedAt: timestamp("published_at"),   // When actually posted
  
  // Instagram data (after publishing)
  instagramMediaId: varchar("instagram_media_id", { length: 255 }),
  instagramPermalink: text("instagram_permalink"),
  
  // Error tracking
  errorMessage: text("error_message"),
  errorCount: int("error_count").default(0),
  lastErrorAt: timestamp("last_error_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// ============================================================================
// ANALYTICS & INSIGHTS
// ============================================================================

export const postAnalytics = mysqlTable("post_analytics", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("post_id").notNull().unique(), // One analytics record per post
  
  // Engagement metrics
  likes: int("likes").default(0).notNull(),
  comments: int("comments").default(0).notNull(),
  shares: int("shares").default(0).notNull(),
  saves: int("saves").default(0).notNull(),
  
  // Reach metrics
  reach: int("reach").default(0).notNull(),
  impressions: int("impressions").default(0).notNull(),
  
  // Calculated metrics
  engagementRate: varchar("engagement_rate", { length: 10 }).default("0.00"),
  
  // Metadata
  lastFetchedAt: timestamp("last_fetched_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PostAnalytics = typeof postAnalytics.$inferSelect;
export type InsertPostAnalytics = typeof postAnalytics.$inferInsert;

// ============================================================================
// BRAND KIT & PREFERENCES
// ============================================================================

export const brandKits = mysqlTable("brand_kits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  accountId: int("account_id"), // Optional: per-account brand kit
  
  name: varchar("name", { length: 255 }).notNull(),
  
  // Brand colors
  primaryColor: varchar("primary_color", { length: 7 }), // Hex color
  secondaryColor: varchar("secondary_color", { length: 7 }),
  accentColor: varchar("accent_color", { length: 7 }),
  
  // Fonts & style
  fontFamily: varchar("font_family", { length: 100 }),
  logoUrl: text("logo_url"),
  
  // Content preferences
  toneOfVoice: text("tone_of_voice"), // e.g., "Professional, technical, friendly"
  contentGuidelines: text("content_guidelines"), // Brand-specific rules
  keyMessages: json("key_messages").$type<string[]>(), // Key points to emphasize
  
  // Hashtag strategy
  defaultHashtags: json("default_hashtags").$type<string[]>(),
  
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type BrandKit = typeof brandKits.$inferSelect;
export type InsertBrandKit = typeof brandKits.$inferInsert;

// ============================================================================
// CONTENT TOPICS & TEMPLATES
// ============================================================================

export const contentTopics = mysqlTable("content_topics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // SAF, bioenergy, renewables
  
  // AI generation hints
  keywords: json("keywords").$type<string[]>(),
  suggestedHashtags: json("suggested_hashtags").$type<string[]>(),
  
  // Usage tracking
  usageCount: int("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ContentTopic = typeof contentTopics.$inferSelect;
export type InsertContentTopic = typeof contentTopics.$inferInsert;

// ============================================================================
// SCHEDULING QUEUE
// ============================================================================

export const schedulingQueue = mysqlTable("scheduling_queue", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("post_id").notNull().unique(),
  accountId: int("account_id").notNull(),
  
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  
  attempts: int("attempts").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SchedulingQueue = typeof schedulingQueue.$inferSelect;
export type InsertSchedulingQueue = typeof schedulingQueue.$inferInsert;

// ============================================================================
// ACTIVITY LOGS
// ============================================================================

export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id"),
  accountId: int("account_id"),
  postId: int("post_id"),
  
  actionType: varchar("action_type", { length: 50 }).notNull(),
  actionDetails: json("action_details").$type<Record<string, any>>(),
  
  status: mysqlEnum("status", ["success", "failed", "warning"]).default("success").notNull(),
  errorMessage: text("error_message"),
  
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  instagramAccounts: many(instagramAccounts),
  posts: many(posts),
  brandKits: many(brandKits),
  contentTopics: many(contentTopics),
  activityLogs: many(activityLogs),
}));

export const instagramAccountsRelations = relations(instagramAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [instagramAccounts.userId],
    references: [users.id],
  }),
  posts: many(posts),
  brandKits: many(brandKits),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  account: one(instagramAccounts, {
    fields: [posts.accountId],
    references: [instagramAccounts.id],
  }),
  analytics: one(postAnalytics, {
    fields: [posts.id],
    references: [postAnalytics.postId],
  }),
  schedulingQueue: one(schedulingQueue, {
    fields: [posts.id],
    references: [schedulingQueue.postId],
  }),
}));

export const postAnalyticsRelations = relations(postAnalytics, ({ one }) => ({
  post: one(posts, {
    fields: [postAnalytics.postId],
    references: [posts.id],
  }),
}));

export const brandKitsRelations = relations(brandKits, ({ one }) => ({
  user: one(users, {
    fields: [brandKits.userId],
    references: [users.id],
  }),
  account: one(instagramAccounts, {
    fields: [brandKits.accountId],
    references: [instagramAccounts.id],
  }),
}));
