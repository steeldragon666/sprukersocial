// Main tRPC Router - All API Routes

import { router, protectedProcedure, publicProcedure } from './trpc';
import { z } from 'zod';
import {
  createProjectSchema,
  updateProjectSchema,
  uploadPhotoSchema,
  generatePreviewSchema,
  generateFullSetSchema,
  createCheckoutSessionSchema,
  updateHeadshotSchema,
} from '@headshot-studio/shared';

export const appRouter = router({
  // ============================================================
  // HEALTH CHECK
  // ============================================================
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // ============================================================
  // PROJECT ROUTES
  // ============================================================
  project: router({
    // Create new project
    create: protectedProcedure
      .input(createProjectSchema)
      .mutation(async ({ ctx, input }) => {
        return await ctx.services.project.createProject(ctx.userId, input);
      }),

    // Get project details
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await ctx.services.project.getProject(input.projectId, ctx.userId);
      }),

    // Update project
    update: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          data: updateProjectSchema,
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await ctx.services.project.updateProject(
          input.projectId,
          ctx.userId,
          input.data
        );
      }),

    // Get all user projects
    list: protectedProcedure.query(async ({ ctx }) => {
      return await ctx.services.project.getUserProjects(ctx.userId);
    }),

    // Delete project
    delete: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await ctx.services.project.deleteProject(input.projectId, ctx.userId);
      }),
  }),

  // ============================================================
  // PHOTO ROUTES
  // ============================================================
  photo: router({
    // Upload and analyze photo
    upload: protectedProcedure
      .input(uploadPhotoSchema)
      .mutation(async ({ ctx, input }) => {
        return await ctx.services.project.uploadPhoto({
          projectId: input.projectId,
          userId: ctx.userId,
          imageUrl: input.imageUrl,
        });
      }),

    // Analyze all photos in project
    analyzeAll: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await ctx.services.project.analyzeProjectPhotos(
          input.projectId,
          ctx.userId
        );
      }),
  }),

  // ============================================================
  // TRAINING ROUTES
  // ============================================================
  training: router({
    // Start model training
    start: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await ctx.services.project.startTraining(input.projectId, ctx.userId);
      }),

    // Check training progress
    status: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await ctx.services.project.checkTrainingProgress(
          input.projectId,
          ctx.userId
        );
      }),
  }),

  // ============================================================
  // GENERATION ROUTES
  // ============================================================
  generation: router({
    // Generate preview headshots
    preview: protectedProcedure
      .input(generatePreviewSchema)
      .mutation(async ({ ctx, input }) => {
        return await ctx.services.project.generatePreview({
          projectId: input.projectId,
          userId: ctx.userId,
          style: input.style,
          background: input.background,
        });
      }),

    // Generate full set
    full: protectedProcedure
      .input(generateFullSetSchema)
      .mutation(async ({ ctx, input }) => {
        return await ctx.services.project.generateFullSet({
          projectId: input.projectId,
          userId: ctx.userId,
          styles: input.styles,
          numPerStyle: input.numPerStyle,
        });
      }),
  }),

  // ============================================================
  // HEADSHOT ROUTES
  // ============================================================
  headshot: router({
    // Get headshots for project
    list: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          topPicksOnly: z.boolean().optional(),
          favorites: z.boolean().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const where: any = { projectId: input.projectId };
        
        if (input.topPicksOnly) {
          where.isTopPick = true;
        }
        
        if (input.favorites) {
          where.isFavorite = true;
        }

        return await ctx.prisma.headshot.findMany({
          where,
          orderBy: [
            { isTopPick: 'desc' },
            { aiQualityScore: 'desc' },
            { generatedAt: 'desc' },
          ],
        });
      }),

    // Update headshot (rating, favorite)
    update: protectedProcedure
      .input(updateHeadshotSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const headshot = await ctx.prisma.headshot.findFirst({
          where: { id: input.headshotId },
          include: { project: true },
        });

        if (!headshot || headshot.project.userId !== ctx.userId) {
          throw new Error('Headshot not found');
        }

        return await ctx.prisma.headshot.update({
          where: { id: input.headshotId },
          data: {
            userRating: input.userRating,
            isFavorite: input.isFavorite,
          },
        });
      }),

    // Download headshot
    download: protectedProcedure
      .input(
        z.object({
          headshotId: z.number(),
          size: z.enum(['square', 'portrait', 'wide', 'original']),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const headshot = await ctx.prisma.headshot.findFirst({
          where: { id: input.headshotId },
          include: { project: true },
        });

        if (!headshot || headshot.project.userId !== ctx.userId) {
          throw new Error('Headshot not found');
        }

        // Generate sized version
        let downloadUrl: string;

        if (input.size === 'original') {
          downloadUrl = headshot.imageUrl;
        } else {
          const sizes = await ctx.services.cloudinary.generateSizes(headshot.imageUrl);
          downloadUrl = sizes[input.size];
        }

        // Mark as downloaded
        await ctx.prisma.headshot.update({
          where: { id: input.headshotId },
          data: { isDownloaded: true },
        });

        return { downloadUrl };
      }),
  }),

  // ============================================================
  // PAYMENT ROUTES
  // ============================================================
  payment: router({
    // Create checkout session
    createCheckout: protectedProcedure
      .input(createCheckoutSessionSchema)
      .mutation(async ({ ctx, input }) => {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        return await ctx.services.payment.createCheckoutSession({
          userId: ctx.userId,
          productType: input.productType,
          projectId: input.projectId,
          successUrl: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${baseUrl}/payment/canceled`,
        });
      }),

    // Get payment history
    history: protectedProcedure.query(async ({ ctx }) => {
      return await ctx.services.payment.getPaymentHistory(ctx.userId);
    }),
  }),

  // ============================================================
  // COACHING ROUTES
  // ============================================================
  coaching: router({
    // Get coaching feedback
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await ctx.prisma.coachingFeedback.findMany({
          where: { projectId: input.projectId },
          orderBy: { priority: 'asc' },
        });
      }),

    // Mark coaching as resolved
    resolve: protectedProcedure
      .input(z.object({ coachingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await ctx.prisma.coachingFeedback.update({
          where: { id: input.coachingId },
          data: { isResolved: true },
        });
      }),
  }),

  // ============================================================
  // USER ROUTES
  // ============================================================
  user: router({
    // Get current user
    me: protectedProcedure.query(async ({ ctx }) => {
      return await ctx.prisma.user.findUnique({
        where: { id: ctx.userId },
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
          website: true,
          industry: true,
          plan: true,
          createdAt: true,
        },
      });
    }),

    // Update profile
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          company: z.string().optional(),
          website: z.string().url().optional(),
          industry: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await ctx.prisma.user.update({
          where: { id: ctx.userId },
          data: input,
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;