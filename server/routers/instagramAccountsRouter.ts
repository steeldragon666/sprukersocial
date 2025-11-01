/**
 * Instagram Accounts Router - tRPC router for account management
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import InstagramGraphAPIService from "../services/instagramGraphAPIService";
import * as accountQueries from "../db/accountQueries";

const instagramService = new InstagramGraphAPIService();

export const instagramAccountsRouter = router({
  /**
   * Get all accounts for current user
   */
  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    return await accountQueries.getAccountsByUser(ctx.user.id);
  }),

  /**
   * Get single account
   */
  getAccount: protectedProcedure
    .input(
      z.object({
        accountId: z.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      const account = await accountQueries.getAccountById(input.accountId);
      
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Account not found");
      }

      return account;
    }),

  /**
   * Connect Instagram account (after OAuth)
   */
  connectAccount: protectedProcedure
    .input(
      z.object({
        instagramUserId: z.string(),
        username: z.string(),
        accessToken: z.string(),
        tokenExpiresAt: z.date(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if account already exists
      const existing = await accountQueries.getAccountByInstagramUserId(
        input.instagramUserId
      );

      if (existing) {
        // Update existing account
        return await accountQueries.updateAccount(existing.id, {
          accessToken: input.accessToken,
          tokenExpiresAt: input.tokenExpiresAt,
          isActive: true,
        });
      }

      // Fetch account info from Instagram
      const accountInfo = await instagramService.getAccountInfo(
        input.instagramUserId,
        input.accessToken
      );

      // Create new account
      return await accountQueries.createAccount({
        userId: ctx.user.id,
        instagramUserId: input.instagramUserId,
        username: input.username,
        accessToken: input.accessToken,
        tokenExpiresAt: input.tokenExpiresAt,
        profilePictureUrl: accountInfo.profile_picture_url || null,
        biography: accountInfo.biography || null,
        followersCount: accountInfo.followers_count || null,
        followingCount: accountInfo.follows_count || null,
        mediaCount: accountInfo.media_count || null,
        accountType: (accountInfo.account_type as "personal" | "business" | "creator") || null,
      });
    }),

  /**
   * Sync account data from Instagram
   */
  syncAccount: protectedProcedure
    .input(
      z.object({
        accountId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const account = await accountQueries.getAccountById(input.accountId);

      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Account not found");
      }

      // Fetch latest data from Instagram
      const accountInfo = await instagramService.getAccountInfo(
        account.instagramUserId,
        account.accessToken
      );

      // Update account
      return await accountQueries.updateAccount(input.accountId, {
        username: accountInfo.username,
        profilePictureUrl: accountInfo.profile_picture_url || null,
        biography: accountInfo.biography || null,
        followersCount: accountInfo.followers_count || null,
        followingCount: accountInfo.follows_count || null,
        mediaCount: accountInfo.media_count || null,
        accountType: (accountInfo.account_type as "personal" | "business" | "creator") || null,
      });
    }),

  /**
   * Disconnect account
   */
  disconnectAccount: protectedProcedure
    .input(
      z.object({
        accountId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const account = await accountQueries.getAccountById(input.accountId);

      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Account not found");
      }

      // Soft delete - just mark as inactive
      await accountQueries.updateAccount(input.accountId, {
        isActive: false,
      });

      return {
        success: true,
      };
    }),

  /**
   * Delete account permanently
   */
  deleteAccount: protectedProcedure
    .input(
      z.object({
        accountId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const account = await accountQueries.getAccountById(input.accountId);

      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Account not found");
      }

      await accountQueries.deleteAccount(input.accountId);

      return {
        success: true,
      };
    }),

  /**
   * Refresh access token
   */
  refreshToken: protectedProcedure
    .input(
      z.object({
        accountId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const account = await accountQueries.getAccountById(input.accountId);

      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Account not found");
      }

      // Instagram long-lived tokens last 60 days
      // This would need to implement token refresh logic with Facebook Graph API
      // For now, just validate the token
      const isValid = await instagramService.validateToken(account.accessToken);

      if (!isValid) {
        throw new Error("Access token is invalid. Please reconnect your account.");
      }

      return {
        success: true,
        message: "Token is still valid",
      };
    }),
});
