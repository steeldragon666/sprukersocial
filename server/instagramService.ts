import { spawn } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

export interface GeneratedContent {
  caption: string;
  topic: string;
}

export interface PostAnalytics {
  likes: number;
  comments: number;
  views: number;
}

/**
 * Instagram Automation Service
 * Interfaces with Python Instagram engine
 */
export class InstagramService {
  private pythonPath: string;
  private enginePath: string;

  constructor() {
    this.pythonPath = 'python3.11';
    this.enginePath = path.join(__dirname, 'instagram_engine.py');
  }

  /**
   * Execute Python script and return parsed JSON output
   */
  private async executePython(args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, [this.enginePath, ...args]);
      
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          // Try to parse JSON from stdout
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const result = JSON.parse(lastLine);
          resolve(result);
        } catch (e) {
          // If not JSON, return raw output
          resolve({ output: stdout.trim() });
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Generate content using AI
   */
  async generateContent(topic: string, apiKey: string): Promise<GeneratedContent> {
    const result = await this.executePython(['generate_content', topic]);
    return result as GeneratedContent;
  }

  /**
   * Post image to Instagram
   * This would be called from a background job
   */
  async postToInstagram(
    username: string,
    password: string,
    imagePath: string,
    caption: string,
    hashtags: string[],
    sessionData?: string
  ): Promise<{ success: boolean; mediaId?: string; error?: string }> {
    try {
      // Create a temporary Python script to handle the posting
      const postScript = `
import sys
import json
from instagram_engine import InstagramAutomation

username = sys.argv[1]
password = sys.argv[2]
image_path = sys.argv[3]
caption = sys.argv[4]
hashtags = json.loads(sys.argv[5])
session_data = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] != 'null' else None

try:
    engine = InstagramAutomation(username, password, session_data)
    media_id = engine.post_image(image_path, caption, hashtags)
    session = engine.get_session_data()
    
    print(json.dumps({
        "success": True,
        "mediaId": media_id,
        "sessionData": session
    }))
except Exception as e:
    print(json.dumps({
        "success": False,
        "error": str(e)
    }))
`;

      const tempScriptPath = path.join(__dirname, 'temp_post.py');
      const fs = require('fs');
      fs.writeFileSync(tempScriptPath, postScript);

      const result = await new Promise<any>((resolve, reject) => {
        const process = spawn(this.pythonPath, [
          tempScriptPath,
          username,
          password,
          imagePath,
          caption,
          JSON.stringify(hashtags),
          sessionData || 'null'
        ]);

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        process.on('close', (code) => {
          // Clean up temp file
          try {
            fs.unlinkSync(tempScriptPath);
          } catch {}

          if (code !== 0) {
            reject(new Error(`Post failed: ${stderr}`));
            return;
          }

          try {
            const lines = stdout.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            resolve(JSON.parse(lastLine));
          } catch (e) {
            reject(new Error(`Failed to parse response: ${stdout}`));
          }
        });
      });

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Follow users by hashtag
   */
  async followUsersByHashtag(
    username: string,
    password: string,
    hashtag: string,
    count: number,
    sessionData?: string
  ): Promise<{ success: boolean; followed: number; error?: string }> {
    try {
      const followScript = `
import sys
import json
from instagram_engine import InstagramAutomation

username = sys.argv[1]
password = sys.argv[2]
hashtag = sys.argv[3]
count = int(sys.argv[4])
session_data = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] != 'null' else None

try:
    engine = InstagramAutomation(username, password, session_data)
    users = engine.search_users_by_hashtag(hashtag, count)
    
    followed = 0
    for user in users[:count]:
        if engine.follow_user(user):
            followed += 1
    
    session = engine.get_session_data()
    
    print(json.dumps({
        "success": True,
        "followed": followed,
        "sessionData": session
    }))
except Exception as e:
    print(json.dumps({
        "success": False,
        "error": str(e),
        "followed": 0
    }))
`;

      const tempScriptPath = path.join(__dirname, 'temp_follow.py');
      const fs = require('fs');
      fs.writeFileSync(tempScriptPath, followScript);

      const result = await new Promise<any>((resolve, reject) => {
        const process = spawn(this.pythonPath, [
          tempScriptPath,
          username,
          password,
          hashtag,
          count.toString(),
          sessionData || 'null'
        ]);

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        process.on('close', (code) => {
          // Clean up
          try {
            fs.unlinkSync(tempScriptPath);
          } catch {}

          if (code !== 0) {
            reject(new Error(`Follow failed: ${stderr}`));
            return;
          }

          try {
            const lines = stdout.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            resolve(JSON.parse(lastLine));
          } catch (e) {
            reject(new Error(`Failed to parse response: ${stdout}`));
          }
        });
      });

      return result;
    } catch (error: any) {
      return {
        success: false,
        followed: 0,
        error: error.message
      };
    }
  }

  /**
   * Get analytics for a post
   */
  async getPostAnalytics(
    username: string,
    password: string,
    mediaId: string,
    sessionData?: string
  ): Promise<PostAnalytics | null> {
    try {
      const analyticsScript = `
import sys
import json
from instagram_engine import InstagramAutomation

username = sys.argv[1]
password = sys.argv[2]
media_id = sys.argv[3]
session_data = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != 'null' else None

try:
    engine = InstagramAutomation(username, password, session_data)
    analytics = engine.get_post_analytics(media_id)
    print(json.dumps(analytics))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;

      const tempScriptPath = path.join(__dirname, 'temp_analytics.py');
      const fs = require('fs');
      fs.writeFileSync(tempScriptPath, analyticsScript);

      const result = await new Promise<any>((resolve, reject) => {
        const process = spawn(this.pythonPath, [
          tempScriptPath,
          username,
          password,
          mediaId,
          sessionData || 'null'
        ]);

        let stdout = '';

        process.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        process.on('close', () => {
          try {
            fs.unlinkSync(tempScriptPath);
          } catch {}

          try {
            const lines = stdout.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            resolve(JSON.parse(lastLine));
          } catch (e) {
            resolve(null);
          }
        });
      });

      return result;
    } catch {
      return null;
    }
  }
}

export const instagramService = new InstagramService();
