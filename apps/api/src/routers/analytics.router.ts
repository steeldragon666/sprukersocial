// Unified Analytics Router
import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const analyticsRouter = router({
  // Get dashboard overview
  getDashboard: protectedProcedure
    .query(async ({ ctx }) => {
      const [
        projectCount,
        headshotCount,
        socialAccountCount,
        postCount,
        monitoringCount,
        mentionCount,
        unreadAlerts,
      ] = await Promise.all([
        ctx.prisma.project.count({ where: { userId: ctx.userId } }),
        ctx.prisma.headshot.count({
          where: { project: { userId: ctx.userId } },
        }),
        ctx.prisma.socialAccount.count({ where: { userId: ctx.userId } }),
        ctx.prisma.socialPost.count({
          where: { account: { userId: ctx.userId } },
        }),
        ctx.prisma.monitoringConfig.count({ where: { userId: ctx.userId } }),
        ctx.prisma.socialMention.count({
          where: { config: { userId: ctx.userId } },
        }),
        ctx.prisma.sentimentAlert.count({
          where: { userId: ctx.userId, isRead: false },
        }),
      ]);

      return {
        headshots: {
          projects: projectCount,
          generated: headshotCount,
        },
        social: {
          accounts: socialAccountCount,
          posts: postCount,
        },
        sentiment: {
          monitoring: monitoringCount,
          mentions: mentionCount,
          alerts: unreadAlerts,
        },
      };
    }),

  // Get engagement metrics
  getEngagementMetrics: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const posts = await ctx.prisma.socialPost.findMany({
        where: {
          account: { userId: ctx.userId },
          postedAt: { gte: since },
        },
        select: {
          likes: true,
          comments: true,
          shares: true,
          views: true,
          postedAt: true,
        },
      });

      const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
      const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
      const totalShares = posts.reduce((sum, p) => sum + p.shares, 0);
      const totalViews = posts.reduce((sum, p) => sum + p.views, 0);

      return {
        totalPosts: posts.length,
        totalLikes,
        totalComments,
        totalShares,
        totalViews,
        avgLikes: posts.length > 0 ? totalLikes / posts.length : 0,
        avgComments: posts.length > 0 ? totalComments / posts.length : 0,
        avgShares: posts.length > 0 ? totalShares / posts.length : 0,
        avgViews: posts.length > 0 ? totalViews / posts.length : 0,
      };
    }),

  // Get sentiment trends
  getSentimentTrends: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const mentions = await ctx.prisma.socialMention.findMany({
        where: {
          config: { userId: ctx.userId },
          timestamp: { gte: since },
        },
        select: {
          timestamp: true,
          sentimentScore: true,
          sentimentLabel: true,
        },
        orderBy: { timestamp: 'asc' },
      });

      // Group by day
      const dailyData = new Map<string, { positive: number; negative: number; neutral: number; total: number; scoreSum: number }>();

      for (const mention of mentions) {
        const day = mention.timestamp.toISOString().split('T')[0];
        const data = dailyData.get(day) || { positive: 0, negative: 0, neutral: 0, total: 0, scoreSum: 0 };

        data.total++;
        data.scoreSum += mention.sentimentScore || 0;

        if (mention.sentimentLabel === 'positive') data.positive++;
        else if (mention.sentimentLabel === 'negative') data.negative++;
        else data.neutral++;

        dailyData.set(day, data);
      }

      const trends = Array.from(dailyData.entries()).map(([date, data]) => ({
        date,
        positive: data.positive,
        negative: data.negative,
        neutral: data.neutral,
        total: data.total,
        averageScore: data.total > 0 ? data.scoreSum / data.total : 0,
      }));

      return trends;
    }),

  // Get top performing content
  getTopContent: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
      metric: z.enum(['likes', 'comments', 'shares', 'views']).default('likes'),
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.socialPost.findMany({
        where: {
          account: { userId: ctx.userId },
          status: 'posted',
        },
        include: {
          account: true,
          headshot: true,
          sentimentAnalysis: true,
        },
        orderBy: { [input.metric]: 'desc' },
        take: input.limit,
      });
    }),

  // Get headshot performance
  getHeadshotPerformance: protectedProcedure
    .query(async ({ ctx }) => {
      const postsWithHeadshots = await ctx.prisma.socialPost.findMany({
        where: {
          account: { userId: ctx.userId },
          headshotId: { not: null },
          status: 'posted',
        },
        include: {
          headshot: true,
        },
      });

      const postsWithoutHeadshots = await ctx.prisma.socialPost.findMany({
        where: {
          account: { userId: ctx.userId },
          headshotId: null,
          status: 'posted',
        },
      });

      const calcAvg = (posts: any[], metric: string) =>
        posts.length > 0
          ? posts.reduce((sum, p) => sum + p[metric], 0) / posts.length
          : 0;

      return {
        withHeadshots: {
          count: postsWithHeadshots.length,
          avgLikes: calcAvg(postsWithHeadshots, 'likes'),
          avgComments: calcAvg(postsWithHeadshots, 'comments'),
          avgShares: calcAvg(postsWithHeadshots, 'shares'),
        },
        withoutHeadshots: {
          count: postsWithoutHeadshots.length,
          avgLikes: calcAvg(postsWithoutHeadshots, 'likes'),
          avgComments: calcAvg(postsWithoutHeadshots, 'comments'),
          avgShares: calcAvg(postsWithoutHeadshots, 'shares'),
        },
      };
    }),
});
