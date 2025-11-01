/**
 * Database queries for posts
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { posts, postAnalytics } from "../../drizzle/schema";

export async function createPost(data: {
  userId: number;
  accountId: number;
  caption: string;
  imageUrl: string;
  imagePublicId: string | null;
  hashtags: string[];
  topic: string | null;
  aiPrompt: string | null;
  category: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(posts).values({
    ...data,
    status: "draft",
  }).$returningId();

  return await getPostById(result[0].id);
}

export async function getPostById(postId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  return post;
}

export async function getPostsByAccount(accountId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(posts)
    .where(eq(posts.accountId, accountId))
    .orderBy(desc(posts.createdAt))
    .limit(limit);
}

export async function getScheduledPosts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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

export async function updatePost(
  postId: number,
  data: Partial<{
    caption: string;
    imageUrl: string;
    imagePublicId: string | null;
    hashtags: string[];
    topic: string | null;
    status: "draft" | "scheduled" | "publishing" | "published" | "failed";
    scheduledFor: Date | null;
    publishedAt: Date | null;
    instagramMediaId: string | null;
    instagramPermalink: string | null;
    errorMessage: string | null;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(posts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(posts.id, postId));

  return await getPostById(postId);
}

export async function deletePost(postId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(posts).where(eq(posts.id, postId));
}

export async function getDashboardStats(accountId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const whereClause = accountId ? eq(posts.accountId, accountId) : undefined;

  const [stats] = await db
    .select({
      totalPosts: sql<number>`COUNT(*)`,
      publishedPosts: sql<number>`SUM(CASE WHEN ${posts.status} = 'published' THEN 1 ELSE 0 END)`,
      scheduledPosts: sql<number>`SUM(CASE WHEN ${posts.status} = 'scheduled' THEN 1 ELSE 0 END)`,
      draftPosts: sql<number>`SUM(CASE WHEN ${posts.status} = 'draft' THEN 1 ELSE 0 END)`,
    })
    .from(posts)
    .where(whereClause);

  // Get total engagement from analytics
  let totalEngagement = 0;
  try {
    const [engagement] = await db
      .select({
        totalEngagement: sql<number>`COALESCE(SUM(${postAnalytics.likes} + ${postAnalytics.comments} + ${postAnalytics.shares}), 0)`,
      })
      .from(postAnalytics);
    
    totalEngagement = Number(engagement?.totalEngagement) || 0;
  } catch (error) {
    // Analytics table might not have data yet
    totalEngagement = 0;
  }

  return {
    totalPosts: Number(stats.totalPosts) || 0,
    publishedPosts: Number(stats.publishedPosts) || 0,
    scheduledPosts: Number(stats.scheduledPosts) || 0,
    draftPosts: Number(stats.draftPosts) || 0,
    totalEngagement,
  };
}

export async function savePostAnalytics(data: {
  postId: number;
  reach: number;
  impressions: number;
  engagement: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  engagementRate: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(postAnalytics).values(data);
}
