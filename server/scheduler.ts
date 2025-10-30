import { CronJob } from 'cron';
import {
  getActiveInstagramAccount,
  getScheduledPosts,
  updatePostStatus,
  getSetting,
  logActivity,
  recordFollowedAccount,
  updateInstagramAccountSession,
} from './automationDb';
import { instagramPlaywrightService } from './instagramPlaywrightService';
import { generateDiverseContent } from './contentGenerator';
import { generateImage } from './_core/imageGeneration';
import { ENV } from './_core/env';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Get Instagram credentials from environment
const getInstagramCredentials = () => ({
  username: process.env.INSTAGRAM_USERNAME || '',
  password: process.env.INSTAGRAM_PASSWORD || '',
});

/**
 * Automation Scheduler
 * Handles background jobs for posting and follower growth
 */
class AutomationScheduler {
  private postingJob: CronJob | null = null;
  private followingJob: CronJob | null = null;
  private isRunning = false;

  /**
   * Start the automation scheduler
   */
  async start() {
    if (this.isRunning) {
      console.log('[Scheduler] Already running');
      return;
    }

    console.log('[Scheduler] Starting automation scheduler...');
    this.isRunning = true;

    // Check for scheduled posts every minute
    this.postingJob = new CronJob('0 * * * * *', async () => {
      await this.processScheduledPosts();
    });

    // Follow accounts every 10 seconds (configurable)
    this.followingJob = new CronJob('*/10 * * * * *', async () => {
      await this.processFollowing();
    });

    this.postingJob.start();
    this.followingJob.start();

    console.log('[Scheduler] Scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('[Scheduler] Stopping automation scheduler...');

    if (this.postingJob) {
      this.postingJob.stop();
      this.postingJob = null;
    }

    if (this.followingJob) {
      this.followingJob.stop();
      this.followingJob = null;
    }

    this.isRunning = false;
    console.log('[Scheduler] Scheduler stopped');
  }

  /**
   * Process scheduled posts that are due
   */
  private async processScheduledPosts() {
    try {
      const account = await getActiveInstagramAccount();
      if (!account || account.isActive !== 1) {
        return; // Automation is paused
      }

      const scheduledPosts = await getScheduledPosts();
      if (scheduledPosts.length === 0) {
        return;
      }

      console.log(`[Scheduler] Found ${scheduledPosts.length} posts to process`);

      for (const post of scheduledPosts) {
        try {
          // Generate image for the post
          let imageUrl = post.imageUrl;
          
          if (!imageUrl) {
            console.log(`[Scheduler] Generating image for post ${post.id}`);
            
            // Generate image based on content
            const imagePrompt = this.generateImagePrompt(post.content);
            const imageResult = await generateImage({
              prompt: imagePrompt,
            });
            
            imageUrl = imageResult.url || '';
            
            // Update post with image URL
            if (imageUrl) {
              await updatePostStatus(post.id, 'scheduled', { imageUrl } as any);
            }
          }

          // Download image to temp file
          if (!imageUrl) {
            throw new Error('No image URL available');
          }
          const imagePath = await this.downloadImage(imageUrl);

          // Parse hashtags
          const hashtags = post.hashtags ? JSON.parse(post.hashtags) : [];

          // Post to Instagram
          const { username, password } = getInstagramCredentials();

          const result = await instagramPlaywrightService.postToInstagram(
            username,
            password,
            imagePath,
            post.content,
            hashtags
          );

          if (result.success) {
            // Update post status
            await updatePostStatus(post.id, 'posted', {
              postedAt: new Date(),
            });

            // Update session data
            if ((result as any).sessionData) {
              await updateInstagramAccountSession(account.id, (result as any).sessionData);
            }

            // Log activity
            await logActivity({
              accountId: account.id,
              actionType: 'post',
              actionDetails: JSON.stringify({
                postId: post.id,
              }),
              status: 'success',
            });

            console.log(`[Scheduler] Successfully posted: ${post.id}`);
          } else {
            // Mark as failed
            await updatePostStatus(post.id, 'failed', {
              errorMessage: result.error,
            });

            // Log failure
            await logActivity({
              accountId: account.id,
              actionType: 'post',
              actionDetails: JSON.stringify({ postId: post.id }),
              status: 'failed',
              errorMessage: result.error,
            });

            console.error(`[Scheduler] Failed to post ${post.id}: ${result.error}`);
          }

          // Clean up temp file
          try {
            const fs = require('fs');
            fs.unlinkSync(imagePath);
          } catch {}

          // Wait a bit between posts
          await this.sleep(5000);
        } catch (error: any) {
          console.error(`[Scheduler] Error processing post ${post.id}:`, error);
          
          await updatePostStatus(post.id, 'failed', {
            errorMessage: error.message,
          });
        }
      }
    } catch (error) {
      console.error('[Scheduler] Error in processScheduledPosts:', error);
    }
  }

  /**
   * Process following new accounts
   */
  private async processFollowing() {
    try {
      const account = await getActiveInstagramAccount();
      if (!account || account.isActive !== 1) {
        return;
      }

      // Check daily limit
      const maxFollowsPerDay = parseInt(await getSetting('max_follows_per_day') || '500');
      
      // For now, we'll implement a simple follow strategy
      // In production, this would be more sophisticated
      
      // Get hashtags to search
      const hashtags = ['SAF', 'bioenergy', 'renewableenergy', 'cleantech'];
      const randomHashtag = hashtags[Math.floor(Math.random() * hashtags.length)];

      const { username, password } = getInstagramCredentials();

      // Note: Following functionality will be implemented separately with Playwright
      // For now, skip following to focus on posting
      console.log('[Scheduler] Following feature temporarily disabled during migration to Playwright');
    } catch (error) {
      console.error('[Scheduler] Error in processFollowing:', error);
    }
  }

  /**
   * Generate image prompt from post content
   */
  private generateImagePrompt(content: string): string {
    // Simple prompt generation based on keywords
    const keywords = content.toLowerCase();
    
    if (keywords.includes('saf') || keywords.includes('aviation')) {
      return 'Modern sustainable aviation fuel facility with aircraft, clean energy infrastructure, professional photography, bright and optimistic';
    } else if (keywords.includes('bamboo') || keywords.includes('biomass')) {
      return 'Bamboo forest and bioenergy processing facility, sustainable agriculture, green technology, professional photography';
    } else if (keywords.includes('solar') || keywords.includes('renewable')) {
      return 'Solar panels and wind turbines in Australian landscape, renewable energy infrastructure, clean and modern';
    } else if (keywords.includes('battery') || keywords.includes('graphite')) {
      return 'High-tech battery manufacturing facility, advanced materials science, innovation and technology';
    }
    
    return 'Sustainable energy infrastructure in Australia, clean technology, modern and professional photography, bright and optimistic';
  }

  /**
   * Download image from URL to temp file
   */
  private async downloadImage(url: string): Promise<string> {
    const tempPath = path.join('/tmp', `instagram_${Date.now()}.jpg`);
    
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, (response: any) => {
        const fileStream = fs.createWriteStream(tempPath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(tempPath);
        });
        
        fileStream.on('error', (error: any) => {
          fs.unlink(tempPath, () => {});
          reject(error);
        });
      }).on('error', (error: any) => {
        reject(error);
      });
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const automationScheduler = new AutomationScheduler();

// Auto-start scheduler when module is loaded
if (process.env.NODE_ENV !== 'test') {
  automationScheduler.start().catch(console.error);
}
