// Unified Social Suite Pro API Router
// Combines: Headshot Studio + Social Manager + Sentiment Agent

import { router } from '../trpc';
import { headshotRouter } from './headshot.router';
import { socialRouter } from './social.router';
import { sentimentRouter } from './sentiment.router';
import { analyticsRouter } from './analytics.router';

export const appRouter = router({
  // Headshot Studio Module
  headshot: headshotRouter,
  
  // Social Manager Module
  social: socialRouter,
  
  // Sentiment Agent Module
  sentiment: sentimentRouter,
  
  // Unified Analytics
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
