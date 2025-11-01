/**
 * Instagram Graph API Service
 * Official Instagram API integration for Business/Creator accounts
 */

interface InstagramAccount {
  id: string;
  username: string;
  name: string;
  profile_picture_url?: string;
  biography?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  account_type?: string;
}

interface PublishMediaInput {
  accountId: string;
  accessToken: string;
  imageUrl: string; // Must be publicly accessible
  caption: string;
}

interface MediaInsights {
  reach: number;
  impressions: number;
  engagement: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
}

export class InstagramGraphAPIService {
  private baseUrl = "https://graph.facebook.com/v21.0";

  /**
   * Get Instagram Business Account info
   */
  async getAccountInfo(instagramAccountId: string, accessToken: string): Promise<InstagramAccount> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${instagramAccountId}?fields=id,username,name,profile_picture_url,biography,followers_count,follows_count,media_count,account_type&access_token=${accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get account info: ${JSON.stringify(error)}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching Instagram account info:", error);
      throw error;
    }
  }

  /**
   * Complete flow: Upload and publish in one call
   */
  async uploadAndPublish(input: PublishMediaInput): Promise<{
    mediaId: string;
    permalink: string;
  }> {
    const { accountId, accessToken, imageUrl, caption } = input;

    try {
      // Step 1: Create container
      console.log("Creating media container...");
      const containerId = await this.createMediaContainer({
        accountId,
        accessToken,
        imageUrl,
        caption,
      });

      console.log(`Container created: ${containerId}`);

      // Step 2: Wait for container to be ready
      const isReady = await this.waitForContainerReady(containerId, accessToken);
      if (!isReady) {
        throw new Error("Media container did not become ready in time");
      }

      // Step 3: Publish
      console.log("Publishing media...");
      const mediaId = await this.publishMedia(accountId, containerId, accessToken);

      console.log(`Media published: ${mediaId}`);

      // Get permalink
      const permalink = await this.getMediaPermalink(mediaId, accessToken);

      return { mediaId, permalink };
    } catch (error) {
      console.error("Error in upload and publish flow:", error);
      throw error;
    }
  }

  /**
   * Create a media container (upload image)
   */
  private async createMediaContainer(input: PublishMediaInput): Promise<string> {
    const { accountId, accessToken, imageUrl, caption } = input;

    try {
      const response = await fetch(
        `${this.baseUrl}/${accountId}/media`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_url: imageUrl,
            caption: caption,
            access_token: accessToken,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to create media container: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error("Error creating media container:", error);
      throw error;
    }
  }

  /**
   * Publish the media container
   */
  private async publishMedia(accountId: string, creationId: string, accessToken: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${accountId}/media_publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: accessToken,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to publish media: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      return data.id; // This is the Instagram media ID
    } catch (error) {
      console.error("Error publishing media:", error);
      throw error;
    }
  }

  /**
   * Get media permalink (URL to the Instagram post)
   */
  private async getMediaPermalink(mediaId: string, accessToken: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${mediaId}?fields=permalink&access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error("Failed to get media permalink");
      }

      const data = await response.json();
      return data.permalink;
    } catch (error) {
      console.error("Error getting permalink:", error);
      return "";
    }
  }

  /**
   * Check if media container is ready for publishing
   */
  private async checkContainerStatus(containerId: string, accessToken: string): Promise<{
    status: "IN_PROGRESS" | "FINISHED" | "ERROR";
    statusCode?: string;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${containerId}?fields=status_code&access_token=${accessToken}`
      );

      if (!response.ok) {
        return { status: "ERROR" };
      }

      const data = await response.json();
      return {
        status: data.status_code === "FINISHED" ? "FINISHED" : "IN_PROGRESS",
        statusCode: data.status_code,
      };
    } catch (error) {
      console.error("Error checking container status:", error);
      return { status: "ERROR" };
    }
  }

  /**
   * Wait for container to be ready, with timeout
   */
  private async waitForContainerReady(
    containerId: string,
    accessToken: string,
    maxWaitMs: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.checkContainerStatus(containerId, accessToken);

      if (status.status === "FINISHED") {
        return true;
      }

      if (status.status === "ERROR") {
        return false;
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout
    return false;
  }

  /**
   * Get media insights (analytics)
   */
  async getMediaInsights(mediaId: string, accessToken: string): Promise<MediaInsights> {
    try {
      const metrics = [
        "reach",
        "impressions",
        "engagement",
        "likes",
        "comments",
        "saves",
        "shares"
      ].join(",");

      const response = await fetch(
        `${this.baseUrl}/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to get insights:", error);
        // Return zeros if insights not available yet
        return {
          reach: 0,
          impressions: 0,
          engagement: 0,
          likes: 0,
          comments: 0,
          saves: 0,
          shares: 0,
        };
      }

      const data = await response.json();
      
      // Parse the insights data
      const insights: MediaInsights = {
        reach: 0,
        impressions: 0,
        engagement: 0,
        likes: 0,
        comments: 0,
        saves: 0,
        shares: 0,
      };

      if (data.data) {
        for (const metric of data.data) {
          const name = metric.name as keyof MediaInsights;
          insights[name] = metric.values?.[0]?.value || 0;
        }
      }

      return insights;
    } catch (error) {
      console.error("Error getting media insights:", error);
      // Return zeros on error
      return {
        reach: 0,
        impressions: 0,
        engagement: 0,
        likes: 0,
        comments: 0,
        saves: 0,
        shares: 0,
      };
    }
  }

  /**
   * Validate access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/me?access_token=${accessToken}`
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate engagement rate
   */
  calculateEngagementRate(insights: MediaInsights, followersCount: number): string {
    if (followersCount === 0) return "0.00";

    const totalEngagement = insights.likes + insights.comments + insights.saves + insights.shares;
    const rate = (totalEngagement / followersCount) * 100;
    
    return rate.toFixed(2);
  }
}

export default InstagramGraphAPIService;
