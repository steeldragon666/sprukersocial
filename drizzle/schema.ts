import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
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

// Instagram automation tables
export const instagramAccounts = mysqlTable("instagram_accounts", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 255 }).notNull(),
  sessionData: text("session_data"), // Encrypted session data for instagrapi
  isActive: int("is_active", { unsigned: true }).default(1).notNull(), // 1 = active, 0 = paused
  lastPostAt: timestamp("last_post_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("account_id").notNull(),
  content: text("content").notNull(), // AI-generated caption
  imageUrl: text("image_url"), // S3 URL for generated image
  hashtags: text("hashtags"), // JSON array of hashtags
  status: mysqlEnum("status", ["draft", "scheduled", "posted", "failed"]).default("draft").notNull(),
  scheduledFor: timestamp("scheduled_for"),
  postedAt: timestamp("posted_at"),
  instagramMediaId: varchar("instagram_media_id", { length: 255 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const analytics = mysqlTable("analytics", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("post_id").notNull(),
  likes: int("likes").default(0).notNull(),
  comments: int("comments").default(0).notNull(),
  reach: int("reach").default(0).notNull(),
  impressions: int("impressions").default(0).notNull(),
  engagementRate: varchar("engagement_rate", { length: 10 }).default("0"), // Store as string percentage
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
});

export const followedAccounts = mysqlTable("followed_accounts", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("account_id").notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  instagramUserId: varchar("instagram_user_id", { length: 255 }),
  followedAt: timestamp("followed_at").defaultNow().notNull(),
  unfollowedAt: timestamp("unfollowed_at"),
  status: mysqlEnum("status", ["following", "unfollowed"]).default("following").notNull(),
});

export const hashtagSets = mysqlTable("hashtag_sets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  hashtags: text("hashtags").notNull(), // JSON array of hashtags
  category: varchar("category", { length: 100 }), // SAF, bioenergy, renewables, etc.
  isActive: int("is_active", { unsigned: true }).default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const automationSettings = mysqlTable("automation_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  settingValue: text("setting_value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("account_id"),
  actionType: varchar("action_type", { length: 50 }).notNull(), // post, follow, unfollow, like, etc.
  actionDetails: text("action_details"), // JSON with additional info
  status: mysqlEnum("status", ["success", "failed"]).default("success").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InstagramAccount = typeof instagramAccounts.$inferSelect;
export type InsertInstagramAccount = typeof instagramAccounts.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = typeof analytics.$inferInsert;
export type FollowedAccount = typeof followedAccounts.$inferSelect;
export type InsertFollowedAccount = typeof followedAccounts.$inferInsert;
export type HashtagSet = typeof hashtagSets.$inferSelect;
export type InsertHashtagSet = typeof hashtagSets.$inferInsert;
export type AutomationSetting = typeof automationSettings.$inferSelect;
export type InsertAutomationSetting = typeof automationSettings.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;