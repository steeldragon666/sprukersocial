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

// ============================================================================
// INSTAGRAM INTELLIGENCE AGENT TABLES
// ============================================================================

// Campaigns
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  accountId: int("account_id").notNull(),
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  goal: mysqlEnum("goal", ["awareness", "engagement", "traffic", "conversions", "followers"]).notNull(),
  targetMetric: varchar("target_metric", { length: 50 }),
  targetValue: varchar("target_value", { length: 50 }),
  
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  budget: varchar("budget", { length: 50 }),
  
  status: mysqlEnum("status", ["active", "paused", "completed", "archived"]).default("active").notNull(),
  tags: json("tags").$type<string[]>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// Campaign Posts (Many-to-Many)
export const campaignPosts = mysqlTable("campaign_posts", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaign_id").notNull(),
  postId: int("post_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// Comments
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("post_id").notNull(),
  
  instagramCommentId: varchar("instagram_comment_id", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 255 }).notNull(),
  text: text("text").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  
  parentCommentId: int("parent_comment_id"),
  
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative", "toxic"]),
  sentimentScore: varchar("sentiment_score", { length: 10 }),
  sentimentConfidence: varchar("sentiment_confidence", { length: 10 }),
  
  category: mysqlEnum("category", ["question", "praise", "complaint", "spam", "request", "general"]),
  
  aiSummary: text("ai_summary"),
  suggestedResponse: text("suggested_response"),
  
  hasResponded: boolean("has_responded").default(false),
  respondedAt: timestamp("responded_at"),
  responseText: text("response_text"),
  
  requiresAttention: boolean("requires_attention").default(false),
  isHidden: boolean("is_hidden").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  analyzedAt: timestamp("analyzed_at"),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// Visual Analysis
export const visualAnalysis = mysqlTable("visual_analysis", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("post_id").notNull().unique(),
  
  description: text("description").notNull(),
  composition: text("composition"),
  colorPalette: json("color_palette").$type<string[]>(),
  emotions: json("emotions").$type<string[]>(),
  subjects: json("subjects").$type<string[]>(),
  style: varchar("style", { length: 100 }),
  
  visualQualityScore: varchar("visual_quality_score", { length: 10 }),
  emotionalImpactScore: varchar("emotional_impact_score", { length: 10 }),
  clarityScore: varchar("clarity_score", { length: 10 }),
  brandAlignmentScore: varchar("brand_alignment_score", { length: 10 }),
  
  predictedEngagement: varchar("predicted_engagement", { length: 50 }),
  actualEngagement: varchar("actual_engagement", { length: 50 }),
  
  strengths: json("strengths").$type<string[]>(),
  improvements: json("improvements").$type<string[]>(),
  similarPostIds: json("similar_post_ids").$type<number[]>(),
  
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type VisualAnalysis = typeof visualAnalysis.$inferSelect;
export type InsertVisualAnalysis = typeof visualAnalysis.$inferInsert;

// Performance Insights
export const performanceInsights = mysqlTable("performance_insights", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("post_id"),
  campaignId: int("campaign_id"),
  accountId: int("account_id").notNull(),
  
  insightType: mysqlEnum("insight_type", [
    "underperforming", "overperforming", "trending", "negative_sentiment",
    "engagement_drop", "best_time", "content_suggestion", "hashtag_recommendation", "audience_insight"
  ]).notNull(),
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  
  recommendations: json("recommendations").$type<{
    action: string;
    reasoning: string;
    expectedImpact: string;
  }[]>(),
  
  relatedMetrics: json("related_metrics").$type<Record<string, number>>(),
  
  status: mysqlEnum("status", ["new", "viewed", "acted_on", "dismissed"]).default("new").notNull(),
  actedAt: timestamp("acted_at"),
  
  confidenceScore: varchar("confidence_score", { length: 10 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PerformanceInsight = typeof performanceInsights.$inferSelect;
export type InsertPerformanceInsight = typeof performanceInsights.$inferInsert;

// Trends
export const trends = mysqlTable("trends", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  accountId: int("account_id").notNull(),
  
  trendType: mysqlEnum("trend_type", [
    "topic", "visual_style", "hashtag", "posting_time", "caption_style", "content_format"
  ]).notNull(),
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  avgEngagementRate: varchar("avg_engagement_rate", { length: 10 }),
  avgReach: varchar("avg_reach", { length: 50 }),
  postCount: int("post_count").default(0),
  
  isRising: boolean("is_rising").default(true),
  trendScore: varchar("trend_score", { length: 10 }),
  
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  relatedPostIds: json("related_post_ids").$type<number[]>(),
  relatedHashtags: json("related_hashtags").$type<string[]>(),
  
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Trend = typeof trends.$inferSelect;
export type InsertTrend = typeof trends.$inferInsert;

// Alerts
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  accountId: int("account_id"),
  postId: int("post_id"),
  campaignId: int("campaign_id"),
  
  alertType: mysqlEnum("alert_type", [
    "viral_post", "negative_comments", "goal_achieved", "underperforming",
    "toxic_comment", "engagement_spike", "follower_milestone", "best_performing", "requires_response"
  ]).notNull(),
  
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  
  severity: mysqlEnum("severity", ["info", "warning", "error", "success"]).default("info").notNull(),
  
  actionUrl: varchar("action_url", { length: 500 }),
  actionLabel: varchar("action_label", { length: 100 }),
  
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  
  notifiedViaEmail: boolean("notified_via_email").default(false),
  notifiedViaPush: boolean("notified_via_push").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

// Agent Runs
export const agentRuns = mysqlTable("agent_runs", {
  id: int("id").autoincrement().primaryKey(),
  
  runType: mysqlEnum("run_type", [
    "comment_analysis", "visual_analysis", "performance_check",
    "campaign_analysis", "trend_detection", "full_scan"
  ]).notNull(),
  
  accountId: int("account_id"),
  postId: int("post_id"),
  campaignId: int("campaign_id"),
  
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running").notNull(),
  progress: varchar("progress", { length: 10 }).default("0"),
  
  itemsProcessed: int("items_processed").default(0),
  insightsGenerated: int("insights_generated").default(0),
  alertsCreated: int("alerts_created").default(0),
  
  errorMessage: text("error_message"),
  
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  durationMs: int("duration_ms"),
  
  metadata: json("metadata").$type<Record<string, any>>(),
});

export type AgentRun = typeof agentRuns.$inferSelect;
export type InsertAgentRun = typeof agentRuns.$inferInsert;

// Agent Settings
export const agentSettings = mysqlTable("agent_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(),
  
  commentAnalysisEnabled: boolean("comment_analysis_enabled").default(true),
  commentAnalysisFrequency: int("comment_analysis_frequency").default(60),
  
  visualAnalysisEnabled: boolean("visual_analysis_enabled").default(true),
  performanceCheckEnabled: boolean("performance_check_enabled").default(true),
  performanceCheckFrequency: int("performance_check_frequency").default(240),
  
  trendDetectionEnabled: boolean("trend_detection_enabled").default(true),
  trendDetectionFrequency: int("trend_detection_frequency").default(1440),
  
  alertsEnabled: boolean("alerts_enabled").default(true),
  emailAlertsEnabled: boolean("email_alerts_enabled").default(true),
  pushAlertsEnabled: boolean("push_alerts_enabled").default(false),
  
  alertTypes: json("alert_types").$type<string[]>(),
  minimumAlertSeverity: mysqlEnum("minimum_alert_severity", ["info", "warning", "error"]).default("warning"),
  
  autoResponseEnabled: boolean("auto_response_enabled").default(false),
  autoResponseToQuestions: boolean("auto_response_to_questions").default(false),
  autoResponseToPraise: boolean("auto_response_to_praise").default(false),
  autoResponseToComplaints: boolean("auto_response_to_complaints").default(false),
  
  underperformingThreshold: varchar("underperforming_threshold", { length: 10 }).default("0.5"),
  negativeSentimentThreshold: varchar("negative_sentiment_threshold", { length: 10 }).default("0.3"),
  toxicCommentThreshold: varchar("toxic_comment_threshold", { length: 10 }).default("0.7"),
  
  trackCampaignsByDefault: boolean("track_campaigns_by_default").default(true),
  
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AgentSettings = typeof agentSettings.$inferSelect;
export type InsertAgentSettings = typeof agentSettings.$inferInsert;
