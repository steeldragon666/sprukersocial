import { eq, desc, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  instagramAccounts,
  posts,
  analytics,
  followedAccounts,
  hashtagSets,
  automationSettings,
  activityLogs,
  type InsertInstagramAccount,
  type InsertPost,
  type InsertAnalytics,
  type InsertFollowedAccount,
  type InsertHashtagSet,
  type InsertAutomationSetting,
  type InsertActivityLog,
} from "../drizzle/schema";

/**
 * Instagram Accounts
 */
export async function getInstagramAccount(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(instagramAccounts).where(eq(instagramAccounts.id, id)).limit(1);
  return result[0] || null;
}

export async function getActiveInstagramAccount() {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(instagramAccounts)
    .where(eq(instagramAccounts.isActive, 1))
    .limit(1);
  return result[0] || null;
}

export async function createInstagramAccount(account: InsertInstagramAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(instagramAccounts).values(account);
  return Number((result as any).insertId || 0);
}

export async function updateInstagramAccountSession(id: number, sessionData: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(instagramAccounts)
    .set({ sessionData, updatedAt: new Date() })
    .where(eq(instagramAccounts.id, id));
}

export async function toggleAccountStatus(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(instagramAccounts)
    .set({ isActive: isActive ? 1 : 0, updatedAt: new Date() })
    .where(eq(instagramAccounts.id, id));
}

/**
 * Posts
 */
export async function createPost(post: InsertPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(posts).values(post);
  return Number((result as any).insertId || 0);
}

export async function getPost(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return result[0] || null;
}

export async function getRecentPosts(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(posts)
    .orderBy(desc(posts.createdAt))
    .limit(limit);
}

export async function getScheduledPosts() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.status, "scheduled"),
        sql`${posts.scheduledFor} <= NOW()`
      )
    )
    .orderBy(posts.scheduledFor);
}

export async function updatePostStatus(
  id: number,
  status: "draft" | "scheduled" | "posted" | "failed",
  updates: Partial<{
    postedAt: Date;
    instagramMediaId: string;
    errorMessage: string;
  }> = {}
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(posts)
    .set({
      status,
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));
}

export async function getPostStats() {
  const db = await getDb();
  if (!db) return { total: 0, posted: 0, scheduled: 0, failed: 0 };
  
  const result = await db
    .select({
      status: posts.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(posts)
    .groupBy(posts.status);
  
  const stats = { total: 0, posted: 0, scheduled: 0, failed: 0 };
  result.forEach((row) => {
    stats.total += Number(row.count);
    if (row.status === "posted") stats.posted = Number(row.count);
    if (row.status === "scheduled") stats.scheduled = Number(row.count);
    if (row.status === "failed") stats.failed = Number(row.count);
  });
  
  return stats;
}

/**
 * Analytics
 */
export async function saveAnalytics(data: InsertAnalytics) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(analytics).values(data);
  return Number((result as any).insertId || 0);
}

export async function getPostAnalytics(postId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(analytics)
    .where(eq(analytics.postId, postId))
    .orderBy(desc(analytics.fetchedAt));
}

/**
 * Followed Accounts
 */
export async function recordFollowedAccount(account: InsertFollowedAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(followedAccounts).values(account);
  return Number((result as any).insertId || 0);
}

export async function getFollowedAccounts(accountId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(followedAccounts)
    .where(
      and(
        eq(followedAccounts.accountId, accountId),
        eq(followedAccounts.status, "following")
      )
    )
    .orderBy(desc(followedAccounts.followedAt))
    .limit(limit);
}

export async function getFollowStats(accountId: number) {
  const db = await getDb();
  if (!db) return { total: 0, following: 0, unfollowed: 0 };
  
  const result = await db
    .select({
      status: followedAccounts.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(followedAccounts)
    .where(eq(followedAccounts.accountId, accountId))
    .groupBy(followedAccounts.status);
  
  const stats = { total: 0, following: 0, unfollowed: 0 };
  result.forEach((row) => {
    stats.total += Number(row.count);
    if (row.status === "following") stats.following = Number(row.count);
    if (row.status === "unfollowed") stats.unfollowed = Number(row.count);
  });
  
  return stats;
}

/**
 * Hashtag Sets
 */
export async function getActiveHashtagSets() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(hashtagSets)
    .where(eq(hashtagSets.isActive, 1))
    .orderBy(hashtagSets.name);
}

export async function createHashtagSet(set: InsertHashtagSet) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(hashtagSets).values(set);
  return Number((result as any).insertId || 0);
}

/**
 * Automation Settings
 */
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(automationSettings)
    .where(eq(automationSettings.settingKey, key))
    .limit(1);
  
  return result[0]?.settingValue || null;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .insert(automationSettings)
    .values({ settingKey: key, settingValue: value })
    .onDuplicateKeyUpdate({
      set: { settingValue: value, updatedAt: new Date() },
    });
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return {};
  
  const result = await db.select().from(automationSettings);
  
  const settings: Record<string, string> = {};
  result.forEach((row) => {
    settings[row.settingKey] = row.settingValue;
  });
  
  return settings;
}

/**
 * Activity Logs
 */
export async function logActivity(log: InsertActivityLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(activityLogs).values(log);
  return Number((result as any).insertId || 0);
}

export async function getRecentActivity(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}

export async function getActivityByType(actionType: string, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.actionType, actionType))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}
