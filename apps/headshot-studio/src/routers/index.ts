// Main tRPC Router
import { router } from '../trpc';
import { projectRouter } from './project.router';

export const appRouter = router({
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
