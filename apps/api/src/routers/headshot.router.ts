// Headshot Studio Router
import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const headshotRouter = router({
  // Create new headshot project
  createProject: protectedProcedure
    .input(z.object({
      name: z.string(),
      style: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.project.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          status: 'uploading',
        },
      });
    }),

  // Get all user projects
  getProjects: protectedProcedure
    .query(async ({ ctx }) => {
      return await ctx.prisma.project.findMany({
        where: { userId: ctx.userId },
        include: {
          photos: true,
          headshots: {
            where: { isTopPick: true },
            take: 3,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  // Get project details
  getProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.userId,
        },
        include: {
          photos: true,
          headshots: true,
        },
      });
    }),

  // Upload photo
  uploadPhoto: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      url: z.string(),
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

      // Create photo record
      return await ctx.prisma.photo.create({
        data: {
          projectId: input.projectId,
          url: input.url,
          approved: true,
        },
      });
    }),

  // Generate headshots
  generateHeadshots: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      style: z.string(),
      count: z.number().min(1).max(20).default(4),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify project
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.projectId,
          userId: ctx.userId,
        },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Update project status
      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { status: 'generating' },
      });

      // In production, this would trigger actual AI generation
      // For now, return success
      return {
        success: true,
        message: 'Headshot generation started',
      };
    }),

  // Get headshots
  getHeadshots: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.headshot.findMany({
        where: {
          project: {
            id: input.projectId,
            userId: ctx.userId,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  // Delete project
  deleteProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.project.delete({
        where: {
          id: input.projectId,
          userId: ctx.userId,
        },
      });

      return { success: true };
    }),
});
