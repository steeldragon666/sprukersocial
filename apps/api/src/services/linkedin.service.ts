// LinkedIn API Service
// Integration for posting, profile management, and analytics

export class LinkedInService {
  private accessToken: string;
  private baseUrl = 'https://api.linkedin.com/v2';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Get authenticated user's profile
   */
  async getProfile() {
    const response = await this.makeRequest('/me', {
      params: {
        projection: '(id,firstName,lastName,profilePicture(displayImage~:playableStreams))',
      },
    });

    return {
      id: response.id,
      firstName: response.firstName?.localized?.en_US,
      lastName: response.lastName?.localized?.en_US,
      profileImageUrl: response.profilePicture?.['displayImage~']?.elements?.[0]
        ?.identifiers?.[0]?.identifier,
    };
  }

  /**
   * Get user's email (requires separate endpoint)
   */
  async getEmail() {
    const response = await this.makeRequest('/emailAddress', {
      params: {
        q: 'members',
        projection: '(elements*(handle~))',
      },
    });

    return response.elements?.[0]?.['handle~']?.emailAddress;
  }

  /**
   * Post a text update (LinkedIn Share)
   */
  async postTextUpdate(params: {
    text: string;
    visibility?: 'PUBLIC' | 'CONNECTIONS';
  }): Promise<{
    postId: string;
    url: string;
  }> {
    const profile = await this.getProfile();

    const postData = {
      author: `urn:li:person:${profile.id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: params.text,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': params.visibility || 'PUBLIC',
      },
    };

    const response = await this.makeRequest('/ugcPosts', {
      method: 'POST',
      body: postData,
    });

    const postId = response.id;
    const url = `https://www.linkedin.com/feed/update/${postId}`;

    return { postId, url };
  }

  /**
   * Post with image
   */
  async postWithImage(params: {
    text: string;
    imageUrl: string;
    visibility?: 'PUBLIC' | 'CONNECTIONS';
  }): Promise<{
    postId: string;
    url: string;
  }> {
    const profile = await this.getProfile();

    // Step 1: Register upload
    const registerResponse = await this.registerUpload(profile.id);
    const uploadUrl = registerResponse.value.uploadMechanism[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ].uploadUrl;
    const asset = registerResponse.value.asset;

    // Step 2: Upload image
    await this.uploadImage(uploadUrl, params.imageUrl);

    // Step 3: Create post with image
    const postData = {
      author: `urn:li:person:${profile.id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: params.text,
          },
          shareMediaCategory: 'IMAGE',
          media: [
            {
              status: 'READY',
              media: asset,
            },
          ],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': params.visibility || 'PUBLIC',
      },
    };

    const response = await this.makeRequest('/ugcPosts', {
      method: 'POST',
      body: postData,
    });

    const postId = response.id;
    const url = `https://www.linkedin.com/feed/update/${postId}`;

    return { postId, url };
  }

  /**
   * Register image upload
   */
  private async registerUpload(personId: string) {
    return await this.makeRequest('/assets?action=registerUpload', {
      method: 'POST',
      body: {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:person:${personId}`,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      },
    });
  }

  /**
   * Upload image to LinkedIn
   */
  private async uploadImage(uploadUrl: string, imageUrl: string) {
    // Download image
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    // Upload to LinkedIn
    await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: imageBuffer,
    });
  }

  /**
   * Post article link
   */
  async postArticleLink(params: {
    text: string;
    articleUrl: string;
    title?: string;
    description?: string;
    imageUrl?: string;
    visibility?: 'PUBLIC' | 'CONNECTIONS';
  }): Promise<{
    postId: string;
    url: string;
  }> {
    const profile = await this.getProfile();

    const postData = {
      author: `urn:li:person:${profile.id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: params.text,
          },
          shareMediaCategory: 'ARTICLE',
          media: [
            {
              status: 'READY',
              originalUrl: params.articleUrl,
              title: {
                text: params.title || '',
              },
              description: {
                text: params.description || '',
              },
            },
          ],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': params.visibility || 'PUBLIC',
      },
    };

    const response = await this.makeRequest('/ugcPosts', {
      method: 'POST',
      body: postData,
    });

    const postId = response.id;
    const url = `https://www.linkedin.com/feed/update/${postId}`;

    return { postId, url };
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/ugcPosts/${postId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get post by ID
   */
  async getPost(postId: string) {
    const response = await this.makeRequest(`/ugcPosts/${postId}`);

    return {
      id: response.id,
      text: response.specificContent?.['com.linkedin.ugc.ShareContent']
        ?.shareCommentary?.text,
      createdAt: new Date(response.created?.time),
      author: response.author,
    };
  }

  /**
   * Get post statistics
   */
  async getPostStatistics(postId: string) {
    try {
      const response = await this.makeRequest('/socialActions', {
        params: {
          q: 'ugcPost',
          ugcPost: postId,
        },
      });

      const stats = response.elements?.[0];

      return {
        likes: stats?.likesSummary?.totalLikes || 0,
        comments: stats?.commentsSummary?.totalComments || 0,
        shares: stats?.sharesSummary?.totalShares || 0,
        // LinkedIn doesn't provide impressions in free tier
        impressions: 0,
      };
    } catch (error) {
      // If statistics aren't available, return zeros
      return {
        likes: 0,
        comments: 0,
        shares: 0,
        impressions: 0,
      };
    }
  }

  /**
   * Get profile statistics
   */
  async getProfileStatistics() {
    try {
      const profile = await this.getProfile();

      // Note: LinkedIn heavily restricts API access to analytics
      // Most metrics require Marketing Developer Platform access
      // This returns basic available data

      return {
        profileViews: 0, // Requires Marketing API
        searchAppearances: 0, // Requires Marketing API
        connectionCount: 0, // Requires additional permissions
        followerCount: 0, // Requires additional permissions
        note: 'Full analytics require LinkedIn Marketing Developer Platform access',
      };
    } catch (error) {
      return {
        error: 'Unable to fetch statistics. May require additional permissions.',
      };
    }
  }

  /**
   * Validate access token
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Make authenticated request to LinkedIn API
   */
  private async makeRequest(
    endpoint: string,
    options: {
      method?: string;
      params?: Record<string, any>;
      body?: any;
    } = {}
  ) {
    const { method = 'GET', params, body } = options;

    // Build URL with query params
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LinkedIn API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }
}

/**
 * Generate LinkedIn OAuth URL
 */
export function generateLinkedInAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
}): string {
  const defaultScopes = ['r_liteprofile', 'r_emailaddress', 'w_member_social'];
  const scopes = params.scopes || defaultScopes;

  const url = new URL('https://www.linkedin.com/oauth/v2/authorization');
  url.searchParams.append('response_type', 'code');
  url.searchParams.append('client_id', params.clientId);
  url.searchParams.append('redirect_uri', params.redirectUri);
  url.searchParams.append('state', params.state);
  url.searchParams.append('scope', scopes.join(' '));

  return url.toString();
}

/**
 * Exchange authorization code for access token
 */
export async function getLinkedInAccessToken(params: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

// Helper to create service with user token
export function createLinkedInService(accessToken: string): LinkedInService {
  return new LinkedInService(accessToken);
}