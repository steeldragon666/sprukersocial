import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Instagram Service using Playwright MCP
 * Posts to Instagram via browser automation
 */
export class InstagramPlaywrightService {
  private serverName = 'playwright';

  /**
   * Call Playwright MCP tool
   */
  private async callMCP(toolName: string, args: Record<string, any>): Promise<any> {
    const input = JSON.stringify(args);
    const command = `manus-mcp-cli tool call ${toolName} --server ${this.serverName} --input '${input.replace(/'/g, "'\\''")}'`;
    
    try {
      const { stdout, stderr } = await execAsync(command);
      if (stderr) console.error('[Playwright MCP] stderr:', stderr);
      
      // Parse JSON response
      const lines = stdout.trim().split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          return JSON.parse(lines[i]);
        } catch (e) {
          continue;
        }
      }
      
      return { success: true, output: stdout };
    } catch (error: any) {
      console.error('[Playwright MCP] Error:', error.message);
      throw error;
    }
  }

  /**
   * Install browser if needed
   */
  async installBrowser(): Promise<void> {
    try {
      await this.callMCP('browser_install', {});
      console.log('[Instagram] Browser installed');
    } catch (error) {
      console.error('[Instagram] Failed to install browser:', error);
    }
  }

  /**
   * Login to Instagram
   */
  async login(username: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Navigate to Instagram
      await this.callMCP('browser_navigate', {
        url: 'https://www.instagram.com/accounts/login/'
      });

      // Wait for page to load
      await this.sleep(3000);

      // Get page snapshot to find login fields
      const snapshot = await this.callMCP('browser_snapshot', {});
      
      // Type username
      await this.callMCP('browser_type', {
        selector: 'input[name="username"]',
        text: username
      });

      await this.sleep(500);

      // Type password
      await this.callMCP('browser_type', {
        selector: 'input[name="password"]',
        text: password
      });

      await this.sleep(500);

      // Click login button
      await this.callMCP('browser_click', {
        selector: 'button[type="submit"]'
      });

      // Wait for navigation
      await this.sleep(5000);

      // Check if logged in
      const currentUrl = await this.callMCP('browser_evaluate', {
        expression: 'window.location.href'
      });

      if (currentUrl.includes('/accounts/onetap')) {
        // Skip "Save Login Info" prompt
        await this.callMCP('browser_click', {
          selector: 'button:has-text("Not Now")'
        });
        await this.sleep(2000);
      }

      if (currentUrl.includes('/challenge')) {
        return {
          success: false,
          message: 'Instagram challenge required - please verify manually'
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('[Instagram] Login failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Post image with caption to Instagram
   */
  async postToInstagram(
    username: string,
    password: string,
    imagePath: string,
    caption: string,
    hashtags: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Login first
      const loginResult = await this.login(username, password);
      if (!loginResult.success) {
        throw new Error(loginResult.message || 'Login failed');
      }

      // Navigate to create post
      await this.callMCP('browser_navigate', {
        url: 'https://www.instagram.com/'
      });

      await this.sleep(2000);

      // Click "Create" button (+ icon)
      await this.callMCP('browser_click', {
        selector: 'a[href="#"]:has(svg[aria-label="New post"])'
      });

      await this.sleep(2000);

      // Upload file
      await this.callMCP('browser_file_upload', {
        selector: 'input[type="file"]',
        files: [imagePath]
      });

      await this.sleep(3000);

      // Click "Next" button
      await this.callMCP('browser_click', {
        selector: 'button:has-text("Next")'
      });

      await this.sleep(2000);

      // Click "Next" again (skip filters)
      await this.callMCP('browser_click', {
        selector: 'button:has-text("Next")'
      });

      await this.sleep(2000);

      // Add caption with hashtags
      const fullCaption = `${caption}\n\n${hashtags.join(' ')}`;
      await this.callMCP('browser_type', {
        selector: 'textarea[aria-label="Write a caption..."]',
        text: fullCaption
      });

      await this.sleep(1000);

      // Click "Share" button
      await this.callMCP('browser_click', {
        selector: 'button:has-text("Share")'
      });

      // Wait for post to complete
      await this.sleep(5000);

      // Check for success
      const snapshot = await this.callMCP('browser_snapshot', {});
      const success = snapshot.includes('Post shared') || snapshot.includes('Your post has been shared');

      if (success) {
        console.log('[Instagram] Post published successfully');
        return { success: true };
      } else {
        return { success: false, error: 'Post may not have been published' };
      }
    } catch (error: any) {
      console.error('[Instagram] Posting failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Close browser
   */
  async closeBrowser(): Promise<void> {
    try {
      await this.callMCP('browser_close', {});
    } catch (error) {
      console.error('[Instagram] Failed to close browser:', error);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton
export const instagramPlaywrightService = new InstagramPlaywrightService();
