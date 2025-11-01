// Sentiment Agent Router
import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const sentimentRouter = router({
  // Create monitoring configuration
  createMonitoring: protectedProcedure
    .input(z.object({
      name: z.string(),
      keywords: z.array(z.string()),
      brands: z.array(z.string()),
      hashtags: z.array(z.string()),
      platforms: z.array(z.enum(['twitter', 'facebook', 'linkedin', 'instagram', 'reddit'])),
      alertThreshold: z.number().min(-1).max(1).default(-0.5),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.monitoringConfig.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          keywords: input.keywords as any,
          brands: input.brands as any,
          hashtags: input.hashtags as any,
          platforms: input.platforms as any,
          alertThreshold: input.alertThreshold,
          isActive: true,
        },
      });
    }),

  // Get monitoring configs
  getMonitoringConfigs: protectedProcedure
    .query(async ({ ctx }) => {
      return await ctx.prisma.monitoringConfig.findMany({
        where: { userId: ctx.userId },
        include: {
          _count: {
            select: { mentions: true },
          },
        },
      });
    }),

  // Get mentions for a config
  getMentions: protectedProcedure
    .input(z.object({
      configId: z.number(),
      limit: z.number().min(1).max(100).default(50),
      platform: z.enum(['twitter', 'facebook', 'linkedin', 'instagram', 'reddit']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.socialMention.findMany({
        where: {
          configId: input.configId,
          ...(input.platform && { platform: input.platform }),
        },
        include: {
          analysis: true,
        },
        orderBy: { timestamp: 'desc' },
        take: input.limit,
      });
    }),

  // Analyze text sentiment
  analyzeSentiment: protectedProcedure
    .input(z.object({
      text: z.string(),
      context: z.object({
        brand: z.string().optional(),
        platform: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // In production, this would call the actual sentiment analysis service
      // For now, return mock data
      const mockAnalysis = {
        score: 0.7,
        sentiment: 'positive' as const,
        confidence: 0.85,
        emotions: {
          joy: 0.6,
          anger: 0.1,
        },
        keywords: ['great', 'amazing', 'love'],
        topics: ['product', 'service'],
        urgency: 'low' as const,
        actionable: false,
      };

      return mockAnalysis;
    }),

  // Get sentiment alerts
  getAlerts: protectedProcedure
    .input(z.object({
      isRead: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.sentimentAlert.findMany({
        where: {
          userId: ctx.userId,
          ...(input.isRead !== undefined && { isRead: input.isRead }),
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });
    }),

  // Mark alert as read
  markAlertRead: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.sentimentAlert.update({
        where: { id: input.alertId },
        data: { isRead: true },
      });

      return { success: true };
    }),

  // Get sentiment overview
  getSentimentOverview: protectedProcedure
    .input(z.object({
      configId: z.number(),
      days: z.number().min(1).max(90).default(7),
    }))
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const mentions = await ctx.prisma.socialMention.findMany({
        where: {
          configId: input.configId,
          timestamp: { gte: since },
        },
        include: {
          analysis: true,
        },
      });

      // Calculate statistics
      const total = mentions.length;
      const positive = mentions.filter(m => m.sentimentLabel === 'positive').length;
      const negative = mentions.filter(m => m.sentimentLabel === 'negative').length;
      const neutral = mentions.filter(m => m.sentimentLabel === 'neutral').length;
      
      const avgScore = mentions.reduce((sum, m) => sum + (m.sentimentScore || 0), 0) / total || 0;

      return {
        total,
        positive,
        negative,
        neutral,
        averageScore: avgScore,
        trend: avgScore > 0.3 ? 'positive' : avgScore < -0.3 ? 'negative' : 'neutral',
      };
    }),

  // Generate response suggestion
  generateResponse: protectedProcedure
    .input(z.object({
      mentionId: z.number(),
      tone: z.enum(['professional', 'friendly', 'empathetic', 'casual']).default('professional'),
    }))
    .mutation(async ({ ctx, input }) => {
      const mention = await ctx.prisma.socialMention.findUnique({
        where: { id: input.mentionId },
        include: { analysis: true },
      });

      if (!mention) {
        throw new Error('Mention not found');
      }

      // In production, this would call the actual response generation service
      // For now, return mock response
      return {
        response: `Thank you for your feedback! We appreciate you taking the time to share your thoughts.`,
        alternatives: [
          `We're glad to hear from you! Your feedback helps us improve.`,
          `Thanks for reaching out! We value your input.`,
        ],
        reasoning: 'Professional acknowledgment of feedback',
      };
    }),

  // Respond to mention
  respondToMention: protectedProcedure
    .input(z.object({
      mentionId: z.number(),
      responseText: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.socialMention.update({
        where: { id: input.mentionId },
        data: {
          responded: true,
          responseText: input.responseText,
          respondedAt: new Date(),
        },
      });

      return { success: true };
    }),
});
