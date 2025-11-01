// Social Manager Router
import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const socialRouter = router({
  // Connect social account
  connectAccount: protectedProcedure
    .input(z.object({
      platform: z.enum(['twitter', 'facebook', 'linkedin', 'instagram']),
      username: z.string(),
      accessToken: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.socialAccount.create({
        data: {
          userId: ctx.userId,
          platform: input.platform,
          username: input.username,
          accessToken: input.accessToken,
          isActive: true,
        },
      });
    }),

  // Get connected accounts
  getAccounts: protectedProcedure
    .query(async ({ ctx }) => {
      return await ctx.prisma.socialAccount.findMany({
        where: { userId: ctx.userId },
        include: {
          _count: {
            select: { posts: true },
          },
        },
      });
    }),

  // Create post
  createPost: protectedProcedure
    .input(z.object({
      accountId: z.number(),
      content: z.string(),
      mediaUrls: z.array(z.string()).optional(),
      hashtags: z.string().optional(),
      scheduledFor: z.date().optional(),
      headshotId: z.number().optional(), // Link to AI headshot
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify account ownership
      const account = await ctx.prisma.socialAccount.findFirst({
        where: {
          id: input.accountId,
          userId: ctx.userId,
        },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      return await ctx.prisma.socialPost.create({
        data: {
          accountId: input.accountId,
          platform: account.platform,
          content: input.content,
          mediaUrls: input.mediaUrls as any,
          hashtags: input.hashtags,
          status: input.scheduledFor ? 'scheduled' : 'draft',
          scheduledFor: input.scheduledFor,
          headshotId: input.headshotId,
        },
      });
    }),

  // Get posts
  getPosts: protectedProcedure
    .input(z.object({
      accountId: z.number().optional(),
      status: z.enum(['draft', 'scheduled', 'posted', 'failed']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.socialPost.findMany({
        where: {
          account: {
            userId: ctx.userId,
          },
          ...(input.accountId && { accountId: input.accountId }),
          ...(input.status && { status: input.status }),
        },
        include: {
          account: true,
          headshot: true,
          sentimentAnalysis: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  // Update post
  updatePost: protectedProcedure
    .input(z.object({
      postId: z.number(),
      content: z.string().optional(),
      scheduledFor: z.date().optional(),
      status: z.enum(['draft', 'scheduled', 'posted', 'failed']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.socialPost.update({
        where: { id: input.postId },
        data: {
          content: input.content,
          scheduledFor: input.scheduledFor,
          status: input.status,
        },
      });
    }),

  // Delete post
  deletePost: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.socialPost.delete({
        where: { id: input.postId },
      });

      return { success: true };
    }),

  // Publish post immediately
  publishPost: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.prisma.socialPost.findUnique({
        where: { id: input.postId },
        include: { account: true },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      // In production, this would actually post to the platform
      // For now, just update status
      await ctx.prisma.socialPost.update({
        where: { id: input.postId },
        data: {
          status: 'posted',
          postedAt: new Date(),
        },
      });

      return { success: true };
    }),

  // Get post analytics
  getPostAnalytics: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.prisma.socialPost.findUnique({
        where: { id: input.postId },
        include: {
          sentimentAnalysis: true,
        },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      return {
        engagement: {
          likes: post.likes,
          comments: post.comments,
          shares: post.shares,
          views: post.views,
        },
        sentiment: post.sentimentAnalysis,
      };
    }),
});
