/**
 * Posts Router - tRPC router for post management
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import AIContentService from "../services/aiContentService";
import InstagramGraphAPIService from "../services/instagramGraphAPIService";
import ImageStorageService from "../services/imageStorageService";
import * as postQueries from "../db/postQueries";
import * as accountQueries from "../db/accountQueries";

// Initialize services (will need env vars)
const aiService = new AIContentService();
const instagramService = new InstagramGraphAPIService();

// Image service - will be initialized when env vars are provided
let imageService: ImageStorageService | null = null;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  imageService = new ImageStorageService(
    process.env.CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET
  );
}

export const postsRouter = router({
  /**
   * Generate AI content
   */
  generateContent: protectedProcedure
    .input(
      z.object({
        topic: z.string().min(3).max(500),
        accountId: z.number().int().positive(),
        brandGuidelines: z.string().optional(),
        toneOfVoice: z.string().optional(),
        generateImage: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify account ownership
      const account = await accountQueries.getAccountById(input.accountId);
      if (!account || account.userId !== ctx.user.id) {
        throw new Error("Instagram account not found");
      }

      // Generate content with AI
      const content = await aiService.generateContent({
        topic: input.topic,
        brandGuidelines: input.brandGuidelines,
        toneOfVoice: input.toneOfVoice,
      });

      // Optimize hashtags
      const optimizedHashtags = aiService.optimizeHashtags(
        input.topic,
        content.suggestedHashtags
      );

      let imageUrl = "";
      let imagePublicId: string | null = null;

      // Generate and upload image if requested
      if (input.generateImage) {
        const imageBuffer = await aiService.generateImage({
          prompt: content.imagePrompt,
          width: 1080,
          height: 1080,
        });

        if (imageService) {
          const uploadResult = await imageService.uploadFromBuffer(imageBuffer, {
            folder: `user_${ctx.user.id}/posts`,
            quality: "auto:good",
          });

          imageUrl = uploadResult.secureUrl;
          imagePublicId = uploadResult.publicId;
        } else {
          // Fallback: save to local storage if Cloudinary not configured
          throw new Error("Image storage not configured. Please set up Cloudinary credentials.");
        }
      }

      // Create draft post
      const post = await postQueries.createPost({
        userId: ctx.user.id,
        accountId: input.accountId,
        caption: content.caption,
        imageUrl,
        imagePublicId,
        hashtags: optimizedHashtags,
        topic: input.topic,
        aiPrompt: content.imagePrompt,
        category: content.category,
      });

      return {
        success: true,
        post,
      };
    }),

  /**
   * Update post
   */
  updatePost: protectedProcedure
    .input(
      z.object({
        postId: z.number().int().positive(),
        caption: z.string().min(1).max(2200).optional(),
        hashtags: z.array(z.string()).max(30).optional(),
        scheduledFor: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { postId, ...updates } = input;

      // Verify ownership
      const post = await postQueries.getPostById(postId);
      if (!post || post.userId !== ctx.user.id) {
        throw new Error("Post not found");
      }

      // Update post
      const updatedPost = await postQueries.updatePost(postId, updates);

      return {
        success: true,
        post: updatedPost,
      };
    }),

  /**
   * Schedule post
   */
  schedulePost: protectedProcedure
    .input(
      z.object({
        postId: z.number().int().positive(),
        scheduledFor: z.date(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const post = await postQueries.getPostById(input.postId);
      if (!post || post.userId !== ctx.user.id) {
        throw new Error("Post not found");
      }

      // Update status to scheduled
      const updatedPost = await postQueries.updatePost(input.postId, {
        status: "scheduled",
        scheduledFor: input.scheduledFor,
      });

      return {
        success: true,
        post: updatedPost,
      };
    }),

  /**
   * Publish post immediately
   */
  publishPost: protectedProcedure
    .input(
      z.object({
        postId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const post = await postQueries.getPostById(input.postId);
      if (!post || post.userId !== ctx.user.id) {
        throw new Error("Post not found");
      }

      // Get account
      const account = await accountQueries.getAccountById(post.accountId);
      if (!account) {
        throw new Error("Instagram account not found");
      }

      // Update status to publishing
      await postQueries.updatePost(input.postId, {
        status: "publishing",
      });

      try {
        // Publish to Instagram
        const result = await instagramService.uploadAndPublish({
          accountId: account.instagramUserId,
          accessToken: account.accessToken,
          imageUrl: post.imageUrl,
          caption: `${post.caption}\n\n${post.hashtags.join(" ")}`,
        });

        // Update post with Instagram data
        const updatedPost = await postQueries.updatePost(input.postId, {
          status: "published",
          publishedAt: new Date(),
          instagramMediaId: result.mediaId,
          instagramPermalink: result.permalink,
        });

        // Fetch analytics after a delay (Instagram needs time to process)
        setTimeout(async () => {
          try {
            const insights = await instagramService.getMediaInsights(
              result.mediaId,
              account.accessToken
            );

            const engagementRate = instagramService.calculateEngagementRate(
              insights,
              account.followersCount || 0
            );

            await postQueries.savePostAnalytics({
              postId: input.postId,
              ...insights,
              engagementRate,
            });
          } catch (error) {
            console.error("Failed to fetch analytics:", error);
          }
        }, 60000); // Wait 1 minute

        return {
          success: true,
          post: updatedPost,
          permalink: result.permalink,
        };
      } catch (error: any) {
        // Update post with error
        await postQueries.updatePost(input.postId, {
          status: "failed",
          errorMessage: error.message,
        });

        throw new Error(`Failed to publish post: ${error.message}`);
      }
    }),

  /**
   * Delete post
   */
  deletePost: protectedProcedure
    .input(
      z.object({
        postId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const post = await postQueries.getPostById(input.postId);
      if (!post || post.userId !== ctx.user.id) {
        throw new Error("Post not found");
      }

      // Delete image from Cloudinary if exists
      if (post.imagePublicId && imageService) {
        await imageService.deleteImage(post.imagePublicId);
      }

      // Delete post
      await postQueries.deletePost(input.postId);

      return {
        success: true,
      };
    }),

  /**
   * Get posts
   */
  getPosts: protectedProcedure
    .input(
      z.object({
        accountId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      if (input.accountId) {
        // Verify ownership
        const account = await accountQueries.getAccountById(input.accountId);
        if (!account || account.userId !== ctx.user.id) {
          throw new Error("Instagram account not found");
        }

        return await postQueries.getPostsByAccount(input.accountId, input.limit);
      }

      // Return all posts for user (across all accounts)
      // This would need a new query function, for now return empty
      return [];
    }),

  /**
   * Get dashboard stats
   */
  getDashboardStats: protectedProcedure
    .input(
      z.object({
        accountId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (input.accountId) {
        // Verify ownership
        const account = await accountQueries.getAccountById(input.accountId);
        if (!account || account.userId !== ctx.user.id) {
          throw new Error("Instagram account not found");
        }
      }

      return await postQueries.getDashboardStats(input.accountId);
    }),
});
