// Twitter API Service (v2)
// Full integration for posting, scheduling, and analytics

import { TwitterApi } from 'twitter-api-v2';

export class TwitterService {
  private client: TwitterApi;

  constructor(config: {
    appKey: string;
    appSecret: string;
    accessToken?: string;
    accessSecret?: string;
  }) {
    this.client = new TwitterApi({
      appKey: config.appKey,
      appSecret: config.appSecret,
      accessToken: config.accessToken,
      accessSecret: config.accessSecret,
    });
  }

  /**
   * Generate OAuth 1.0a authentication URL
   */
  async generateAuthLink(callbackUrl: string): Promise<{
    url: string;
    oauth_token: string;
    oauth_token_secret: string;
  }> {
    const authLink = await this.client.generateAuthLink(callbackUrl, {
      linkMode: 'authorize',
    });

    return {
      url: authLink.url,
      oauth_token: authLink.oauth_token,
      oauth_token_secret: authLink.oauth_token_secret,
    };
  }

  /**
   * Complete OAuth flow and get access tokens
   */
  async login(params: {
    oauth_token: string;
    oauth_verifier: string;
    oauth_token_secret: string;
  }): Promise<{
    accessToken: string;
    accessSecret: string;
    userId: string;
    screenName: string;
  }> {
    const { client, accessToken, accessSecret } = await this.client.login(
      params.oauth_verifier,
      params.oauth_token_secret
    );

    const user = await client.v2.me();

    return {
      accessToken,
      accessSecret,
      userId: user.data.id,
      screenName: user.data.username,
    };
  }

  /**
   * Get authenticated user info
   */
  async getAuthenticatedUser() {
    const user = await this.client.v2.me({
      'user.fields': [
        'profile_image_url',
        'public_metrics',
        'description',
        'created_at',
      ],
    });

    return {
      id: user.data.id,
      username: user.data.username,
      name: user.data.name,
      profileImageUrl: user.data.profile_image_url,
      description: user.data.description,
      followersCount: user.data.public_metrics?.followers_count,
      followingCount: user.data.public_metrics?.following_count,
      tweetCount: user.data.public_metrics?.tweet_count,
      createdAt: user.data.created_at,
    };
  }

  /**
   * Post a tweet (text + optional media)
   */
  async postTweet(params: {
    text: string;
    mediaUrls?: string[];
    replyToTweetId?: string;
  }): Promise<{
    tweetId: string;
    url: string;
  }> {
    let mediaIds: string[] | undefined;

    // Upload media if provided
    if (params.mediaUrls && params.mediaUrls.length > 0) {
      mediaIds = await Promise.all(
        params.mediaUrls.map((url) => this.uploadMedia(url))
      );
    }

    // Create tweet
    const tweet = await this.client.v2.tweet({
      text: params.text,
      ...(mediaIds && { media: { media_ids: mediaIds } }),
      ...(params.replyToTweetId && {
        reply: { in_reply_to_tweet_id: params.replyToTweetId },
      }),
    });

    // Get username for URL
    const user = await this.getAuthenticatedUser();

    return {
      tweetId: tweet.data.id,
      url: `https://twitter.com/${user.username}/status/${tweet.data.id}`,
    };
  }

  /**
   * Upload media to Twitter
   */
  private async uploadMedia(mediaUrl: string): Promise<string> {
    // Download media
    const response = await fetch(mediaUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Upload to Twitter
    const mediaId = await this.client.v1.uploadMedia(buffer, {
      mimeType: response.headers.get('content-type') || 'image/jpeg',
    });

    return mediaId;
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(tweetId: string): Promise<boolean> {
    const result = await this.client.v2.deleteTweet(tweetId);
    return result.data.deleted;
  }

  /**
   * Get tweet by ID with full details
   */
  async getTweet(tweetId: string) {
    const tweet = await this.client.v2.singleTweet(tweetId, {
      'tweet.fields': [
        'created_at',
        'public_metrics',
        'entities',
        'attachments',
      ],
      expansions: ['attachments.media_keys'],
      'media.fields': ['url', 'preview_image_url'],
    });

    return {
      id: tweet.data.id,
      text: tweet.data.text,
      createdAt: tweet.data.created_at,
      metrics: {
        likes: tweet.data.public_metrics?.like_count || 0,
        retweets: tweet.data.public_metrics?.retweet_count || 0,
        replies: tweet.data.public_metrics?.reply_count || 0,
        impressions: tweet.data.public_metrics?.impression_count || 0,
      },
      entities: tweet.data.entities,
      media: tweet.includes?.media,
    };
  }

  /**
   * Get user's recent tweets
   */
  async getUserTweets(params: {
    userId?: string;
    maxResults?: number;
    sinceId?: string;
  }) {
    const userId = params.userId || (await this.getAuthenticatedUser()).id;

    const tweets = await this.client.v2.userTimeline(userId, {
      max_results: params.maxResults || 10,
      ...(params.sinceId && { since_id: params.sinceId }),
      'tweet.fields': ['created_at', 'public_metrics'],
      exclude: ['replies', 'retweets'],
    });

    return tweets.data.data?.map((tweet) => ({
      id: tweet.id,
      text: tweet.text,
      createdAt: tweet.created_at,
      metrics: {
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        impressions: tweet.public_metrics?.impression_count || 0,
      },
    })) || [];
  }

  /**
   * Search tweets by keyword
   */
  async searchTweets(params: {
    query: string;
    maxResults?: number;
    startTime?: string;
  }) {
    const tweets = await this.client.v2.search(params.query, {
      max_results: params.maxResults || 10,
      ...(params.startTime && { start_time: params.startTime }),
      'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
    });

    return tweets.data.data?.map((tweet) => ({
      id: tweet.id,
      text: tweet.text,
      authorId: tweet.author_id,
      createdAt: tweet.created_at,
      metrics: {
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
      },
    })) || [];
  }

  /**
   * Get mentions (tweets mentioning the user)
   */
  async getMentions(params: {
    maxResults?: number;
    sinceId?: string;
  }) {
    const user = await this.getAuthenticatedUser();

    const mentions = await this.client.v2.userMentionTimeline(user.id, {
      max_results: params.maxResults || 10,
      ...(params.sinceId && { since_id: params.sinceId }),
      'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
    });

    return mentions.data.data?.map((tweet) => ({
      id: tweet.id,
      text: tweet.text,
      authorId: tweet.author_id,
      createdAt: tweet.created_at,
      metrics: {
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
      },
    })) || [];
  }

  /**
   * Like a tweet
   */
  async likeTweet(tweetId: string): Promise<boolean> {
    const user = await this.getAuthenticatedUser();
    const result = await this.client.v2.like(user.id, tweetId);
    return result.data.liked;
  }

  /**
   * Unlike a tweet
   */
  async unlikeTweet(tweetId: string): Promise<boolean> {
    const user = await this.getAuthenticatedUser();
    await this.client.v2.unlike(user.id, tweetId);
    return true;
  }

  /**
   * Retweet
   */
  async retweet(tweetId: string): Promise<boolean> {
    const user = await this.getAuthenticatedUser();
    const result = await this.client.v2.retweet(user.id, tweetId);
    return result.data.retweeted;
  }

  /**
   * Get account analytics/metrics
   */
  async getAccountMetrics() {
    const user = await this.getAuthenticatedUser();
    const recentTweets = await this.getUserTweets({ maxResults: 100 });

    // Calculate engagement metrics
    const totalLikes = recentTweets.reduce((sum, t) => sum + t.metrics.likes, 0);
    const totalRetweets = recentTweets.reduce((sum, t) => sum + t.metrics.retweets, 0);
    const totalReplies = recentTweets.reduce((sum, t) => sum + t.metrics.replies, 0);
    const totalImpressions = recentTweets.reduce((sum, t) => sum + t.metrics.impressions, 0);

    const avgEngagementRate = totalImpressions > 0
      ? ((totalLikes + totalRetweets + totalReplies) / totalImpressions) * 100
      : 0;

    return {
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      tweetCount: user.tweetCount,
      recentMetrics: {
        totalLikes,
        totalRetweets,
        totalReplies,
        totalImpressions,
        avgEngagementRate: avgEngagementRate.toFixed(2),
        tweetCount: recentTweets.length,
      },
    };
  }

  /**
   * Validate credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      await this.getAuthenticatedUser();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Helper to create service with user tokens
export function createTwitterService(tokens: {
  accessToken: string;
  accessSecret: string;
}): TwitterService {
  return new TwitterService({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: tokens.accessToken,
    accessSecret: tokens.accessSecret,
  });
}