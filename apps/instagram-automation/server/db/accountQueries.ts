/**
 * Database queries for Instagram accounts
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { instagramAccounts } from "../../drizzle/schema";

export async function createAccount(data: {
  userId: number;
  instagramUserId: string;
  username: string;
  accessToken: string;
  tokenExpiresAt: Date;
  profilePictureUrl?: string | null;
  biography?: string | null;
  followersCount?: number | null;
  followingCount?: number | null;
  mediaCount?: number | null;
  accountType?: "personal" | "business" | "creator" | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Build insert data with only defined fields
  const insertData: any = {
    userId: data.userId,
    instagramUserId: data.instagramUserId,
    username: data.username,
    accessToken: data.accessToken,
    tokenExpiresAt: data.tokenExpiresAt,
  };

  if (data.profilePictureUrl !== undefined) insertData.profilePictureUrl = data.profilePictureUrl;
  if (data.biography !== undefined) insertData.biography = data.biography;
  if (data.followersCount !== undefined) insertData.followersCount = data.followersCount;
  if (data.followingCount !== undefined) insertData.followingCount = data.followingCount;
  if (data.mediaCount !== undefined) insertData.mediaCount = data.mediaCount;
  if (data.accountType !== undefined) insertData.accountType = data.accountType;

  const result = await db.insert(instagramAccounts).values(insertData).$returningId();
  return await getAccountById(result[0].id);
}

export async function getAccountById(accountId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [account] = await db
    .select()
    .from(instagramAccounts)
    .where(eq(instagramAccounts.id, accountId))
    .limit(1);

  return account;
}

export async function getAccountsByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(instagramAccounts)
    .where(eq(instagramAccounts.userId, userId));
}

export async function getAccountByInstagramUserId(instagramUserId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [account] = await db
    .select()
    .from(instagramAccounts)
    .where(eq(instagramAccounts.instagramUserId, instagramUserId))
    .limit(1);

  return account;
}

export async function updateAccount(
  accountId: number,
  data: Partial<{
    username: string;
    accessToken: string;
    tokenExpiresAt: Date;
    profilePictureUrl: string | null;
    biography: string | null;
    followersCount: number | null;
    followingCount: number | null;
    mediaCount: number | null;
    accountType: string | null;
    isActive: boolean;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { ...data };
  updateData.updatedAt = new Date();
  
  await db
    .update(instagramAccounts)
    .set(updateData)
    .where(eq(instagramAccounts.id, accountId));

  return await getAccountById(accountId);
}

export async function deleteAccount(accountId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(instagramAccounts).where(eq(instagramAccounts.id, accountId));
}

export async function refreshAccessToken(
  accountId: number,
  newToken: string,
  expiresAt: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(instagramAccounts)
    .set({
      accessToken: newToken,
      tokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(instagramAccounts.id, accountId));
}
