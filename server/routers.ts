import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

// Helper function to generate image prompts
function generateImagePrompt(caption: string, topic: string): string {
  const keywords = caption.toLowerCase();
  
  if (keywords.includes('saf') || keywords.includes('aviation')) {
    return 'Modern sustainable aviation fuel facility with aircraft in background, clean energy infrastructure, professional photography, bright and optimistic, high quality';
  } else if (keywords.includes('bamboo') || keywords.includes('biomass')) {
    return 'Lush bamboo forest with bioenergy processing facility, sustainable agriculture, green technology, professional photography, vibrant and natural';
  } else if (keywords.includes('solar') || keywords.includes('renewable')) {
    return 'Solar panels and wind turbines in Australian landscape, renewable energy infrastructure, clean and modern, golden hour lighting';
  } else if (keywords.includes('battery') || keywords.includes('graphite')) {
    return 'High-tech battery manufacturing facility, advanced materials science, innovation and technology, futuristic and clean';
  }
  
  return 'Sustainable energy infrastructure in Australia, clean technology, modern and professional photography, bright and optimistic, inspiring future';
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  instagram: router({
    // Get automation status and stats
    getStatus: protectedProcedure.query(async () => {
      const { getActiveInstagramAccount, getPostStats, getFollowStats, getAllSettings } = await import("./automationDb");
      
      const account = await getActiveInstagramAccount();
      const postStats = await getPostStats();
      const settings = await getAllSettings();
      
      let followStats = { total: 0, following: 0, unfollowed: 0 };
      if (account) {
        followStats = await getFollowStats(account.id);
      }
      
      return {
        account: account ? {
          id: account.id,
          username: account.username,
          isActive: account.isActive === 1,
          lastPostAt: account.lastPostAt,
        } : null,
        postStats,
        followStats,
        settings,
      };
    }),

    // Get recent posts
    getPosts: protectedProcedure.query(async () => {
      const { getRecentPosts } = await import("./automationDb");
      return await getRecentPosts(50);
    }),

    // Get activity logs
    getActivity: protectedProcedure.query(async () => {
      const { getRecentActivity } = await import("./automationDb");
      return await getRecentActivity(100);
    }),

    // Get followed accounts with details
    getFollowedAccounts: protectedProcedure.query(async () => {
      const { getActiveInstagramAccount, getFollowedAccounts } = await import("./automationDb");
      
      const account = await getActiveInstagramAccount();
      if (!account) {
        return [];
      }
      
      return await getFollowedAccounts(account.id, 100);
    }),

    // Toggle automation on/off
    toggleAutomation: protectedProcedure
      .input(z.object({ isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        const { getActiveInstagramAccount, toggleAccountStatus } = await import("./automationDb");
        
        const account = await getActiveInstagramAccount();
        if (!account) {
          throw new Error("No Instagram account configured");
        }
        
        await toggleAccountStatus(account.id, input.isActive);
        
        return { success: true };
      }),

    // Update automation settings
    updateSettings: protectedProcedure
      .input(z.object({
        postingFrequency: z.string().optional(),
        followFrequency: z.string().optional(),
        maxPostsPerDay: z.string().optional(),
        maxFollowsPerDay: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { setSetting } = await import("./automationDb");
        
        if (input.postingFrequency) {
          await setSetting("posting_frequency", input.postingFrequency);
        }
        if (input.followFrequency) {
          await setSetting("follow_frequency", input.followFrequency);
        }
        if (input.maxPostsPerDay) {
          await setSetting("max_posts_per_day", input.maxPostsPerDay);
        }
        if (input.maxFollowsPerDay) {
          await setSetting("max_follows_per_day", input.maxFollowsPerDay);
        }
        
        return { success: true };
      }),

    // Post immediately (schedule for now)
    postNow: protectedProcedure
      .input(z.object({
        postId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { updatePostStatus } = await import("./automationDb");
        
        await updatePostStatus(input.postId, 'scheduled', {
          scheduledFor: new Date(),
        });
        
        return { success: true };
      }),

    // Update post content
    updatePost: protectedProcedure
      .input(z.object({
        postId: z.number(),
        content: z.string().optional(),
        hashtags: z.array(z.string()).optional(),
        scheduledFor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updatePostStatus } = await import("./automationDb");
        
        const updates: any = {};
        if (input.content) updates.content = input.content;
        if (input.hashtags) updates.hashtags = JSON.stringify(input.hashtags);
        if (input.scheduledFor) updates.scheduledFor = new Date(input.scheduledFor);
        
        await updatePostStatus(input.postId, 'scheduled', updates);
        
        return { success: true };
      }),

    // Delete post
    deletePost: protectedProcedure
      .input(z.object({
        postId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { posts } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(posts).where(eq(posts.id, input.postId));
        
        return { success: true };
      }),

    // Generate and schedule a post
    generatePost: protectedProcedure
      .input(z.object({
        topic: z.string().optional(),
        scheduledFor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { createPost } = await import("./automationDb");
        const { getActiveInstagramAccount } = await import("./automationDb");
        const { invokeLLM } = await import("./_core/llm");
        
        const account = await getActiveInstagramAccount();
        if (!account) {
          throw new Error("No Instagram account configured");
        }
        
        // Content topics
        const topics = [
          "Sustainable Aviation Fuel (SAF) breakthroughs and industry adoption",
          "Bioenergy policy updates in Australia and government initiatives",
          "Renewable energy technology innovations and electrification advances",
          "Low-carbon liquid fuels development and circular economy",
          "Bamboo biomass conversion to SAF and graphite technologies",
        ];
        
        const topic = input.topic || topics[Math.floor(Math.random() * topics.length)];
        
        // Generate content using Claude
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a content creator for PowerPlant Energy, an Australian company focused on sustainable fuels, SAF, and bioenergy."
            },
            {
              role: "user",
              content: `Create an engaging Instagram post about: ${topic}\n\nRequirements:\n- Write 2-3 short paragraphs (max 200 words)\n- Include 1-2 key facts or statistics\n- Professional yet accessible tone\n- End with a call-to-action or thought-provoking question\n- DO NOT include hashtags in the caption (they will be added separately)\n\nFormat as plain text, no markdown.`
            }
          ]
        });
        
        const messageContent = response.choices[0].message.content;
        const caption = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
        
        // Generate image for the post
        const imagePrompt = generateImagePrompt(caption, topic);
        const { generateImage } = await import("./_core/imageGeneration");
        const imageResult = await generateImage({ prompt: imagePrompt });
        const imageUrl = imageResult.url || null;
        
        // Select hashtags
        const allHashtags = [
          "#SustainableAviationFuel", "#SAF", "#CleanAviation", "#bioenergy",
          "#biomass", "#renewableenergy", "#cleanenergy", "#sustainability",
          "#climateaction", "#energytransition", "#AustralianEnergy"
        ];
        const selectedHashtags = allHashtags.sort(() => 0.5 - Math.random()).slice(0, 12);
        
        const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : new Date(Date.now() + 5 * 60 * 1000);
        
        const postId = await createPost({
          accountId: account.id,
          content: caption,
          hashtags: JSON.stringify(selectedHashtags),
          imageUrl,
          status: "scheduled",
          scheduledFor,
        });
        
        return {
          success: true,
          postId,
          caption,
          hashtags: selectedHashtags,
          imageUrl,
          scheduledFor,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
