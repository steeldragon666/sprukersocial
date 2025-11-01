// Project Router - Headshot generation project management
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { 
  createProjectSchema, 
  updateProjectSchema,
  uploadPhotoSchema,
  analyzePhotosSchema,
  trainModelSchema,
  generatePreviewSchema,
  generateFullSetSchema
} from '@headshot-studio/shared';
import { z } from 'zod';

export const projectRouter = router({
  // Create a new project
  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.create({
        data: {
          userId: ctx.userId,
          name: input.name || 'My Headshots',
          status: 'uploading',
        },
      });
      return project;
    }),

  // Get project by ID
  getById: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.userId,
        },
        include: {
          photos: true,
          headshots: {
            where: { isTopPick: true },
            take: 20,
          },
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      return project;
    }),

  // List user's projects
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const projects = await ctx.prisma.project.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              photos: true,
              headshots: true,
            },
          },
        },
      });
      return projects;
    }),

  // Upload photo
  uploadPhoto: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      imageUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.userId,
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Upload to Cloudinary
      const uploaded = await ctx.services.cloudinary.uploadFromUrl(input.imageUrl, {
        folder: `headshots/user-${ctx.userId}/project-${input.projectId}`,
      });

      // Analyze with Claude Vision
      const analysis = await ctx.services.claudeVision.analyzePhoto(uploaded.secureUrl);

      // Save to database
      const photo = await ctx.prisma.photo.create({
        data: {
          projectId: input.projectId,
          url: uploaded.secureUrl,
          qualityScore: analysis.qualityScore,
          feedback: analysis.feedback as any,
          approved: analysis.approved,
        },
      });

      return { photo, analysis };
    }),

  // Analyze all photos
  analyzePhotos: protectedProcedure
    .input(analyzePhotosSchema)
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.userId,
        },
        include: { photos: true },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      const photoUrls = project.photos.map(p => p.url);
      const analysis = await ctx.services.claudeVision.analyzePhotoSet(photoUrls);

      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { status: 'analyzing' },
      });

      return analysis;
    }),

  // Start training
  startTraining: protectedProcedure
    .input(trainModelSchema)
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.userId,
        },
        include: { photos: true },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      if (project.photos.length < 10) {
        throw new Error('Need at least 10 photos to train model');
      }

      const photoUrls = project.photos
        .filter(p => p.approved)
        .map(p => p.url);

      const training = await ctx.services.replicate.trainModel({
        userId: ctx.userId,
        photoUrls,
        triggerWord: 'TOK',
        steps: input.steps || 1000,
      });

      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: {
          status: 'training',
          trainingId: training.trainingId,
        },
      });

      return { trainingId: training.trainingId };
    }),

  // Check training status
  checkTrainingStatus: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.userId,
        },
      });

      if (!project || !project.trainingId) {
        throw new Error('Training not started');
      }

      const status = await ctx.services.replicate.getTrainingStatus(project.trainingId);

      if (status.status === 'succeeded' && status.modelVersion) {
        await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: {
            status: 'completed',
            modelVersion: status.modelVersion,
          },
        });
      }

      return status;
    }),

  // Generate preview
  generatePreview: protectedProcedure
    .input(generatePreviewSchema)
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.userId,
        },
      });

      if (!project || !project.modelVersion) {
        throw new Error('Model not ready');
      }

      const images = await ctx.services.replicate.generatePreview({
        modelVersion: project.modelVersion,
        triggerWord: project.triggerWord || 'TOK',
        style: input.style || 'CORPORATE',
        background: input.background,
        numOutputs: 3,
      });

      // Save headshots
      const headshots = await Promise.all(
        images.map(async (imageUrl) => {
          const uploaded = await ctx.services.cloudinary.uploadFromUrl(imageUrl, {
            folder: `headshots/user-${ctx.userId}/project-${input.projectId}/preview`,
          });

          return await ctx.prisma.headshot.create({
            data: {
              projectId: input.projectId,
              url: uploaded.secureUrl,
              style: input.style || 'CORPORATE',
              background: input.background || 'office',
              prompt: `Preview - ${input.style}`,
            },
          });
        })
      );

      return headshots;
    }),
});
