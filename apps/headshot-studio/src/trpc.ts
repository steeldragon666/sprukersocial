// tRPC Context & Router Configuration

import { initTRPC, TRPCError } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { ServiceFactory } from './services';
import { prisma } from '@headshot-studio/database';

/**
 * Context creation
 */
export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
  // Get user from session/token (simplified for now)
  const userId = req.headers['x-user-id'] 
    ? parseInt(req.headers['x-user-id'] as string)
    : undefined;

  return {
    req,
    res,
    userId,
    prisma,
    services: {
      claudeVision: ServiceFactory.getClaudeVision(),
      replicate: ServiceFactory.getReplicate(),
      cloudinary: ServiceFactory.getCloudinary(),
      project: ServiceFactory.getProject(),
      payment: ServiceFactory.getPayment(),
    },
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * tRPC initialization
 */
const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure (requires authentication)
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});
