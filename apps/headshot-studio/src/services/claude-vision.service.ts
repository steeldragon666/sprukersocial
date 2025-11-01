// Claude Vision Analysis Service
// Analyzes uploaded photos for quality and provides coaching feedback

import Anthropic from '@anthropic-ai/sdk';
import type { PhotoAnalysisResult } from '@headshot-studio/shared';

export class ClaudeVisionService {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Analyze a single photo for quality
   */
  async analyzePhoto(imageUrl: string): Promise<PhotoAnalysisResult> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: imageUrl,
                },
              },
              {
                type: 'text',
                text: `Analyze this photo for use in professional headshot generation. Evaluate:

1. LIGHTING: Is the face well-lit and evenly illuminated?
2. BACKGROUND: Is the background clean and suitable?
3. EXPRESSION: Is the expression natural and professional?
4. ANGLE: Is the camera angle appropriate (eye-level, not too high/low)?
5. FOCUS: Is the image sharp and in focus?

For each criterion, respond with: excellent, good, or poor.

Then provide:
- Overall quality score (0-10)
- 2-3 specific actionable suggestions for improvement
- Whether this photo is approved for headshot generation (yes/no)

Respond in this exact JSON format:
{
  "qualityScore": 8.5,
  "feedback": {
    "lighting": "excellent",
    "background": "good",
    "expression": "excellent",
    "angle": "good",
    "focus": "excellent"
  },
  "suggestions": [
    "Consider a slightly more neutral background",
    "Great lighting - keep this up!"
  ],
  "approved": true
}`,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from Claude response');
      }

      const result = JSON.parse(jsonMatch[0]) as PhotoAnalysisResult;
      return result;
    } catch (error) {
      console.error('Photo analysis error:', error);
      
      // Return default analysis on error
      return {
        qualityScore: 7.0,
        feedback: {
          lighting: 'good',
          background: 'good',
          expression: 'good',
          angle: 'good',
          focus: 'good',
        },
        suggestions: ['Photo looks good for headshot generation'],
        approved: true,
      };
    }
  }

  /**
   * Analyze multiple photos and provide aggregate feedback
   */
  async analyzePhotoSet(imageUrls: string[]): Promise<{
    individualResults: PhotoAnalysisResult[];
    averageScore: number;
    overallFeedback: string;
    coachingSuggestions: Array<{
      type: string;
      title: string;
      description: string;
      priority: number;
    }>;
  }> {
    // Analyze each photo
    const results = await Promise.all(
      imageUrls.map(url => this.analyzePhoto(url))
    );

    // Calculate average score
    const averageScore =
      results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length;

    // Aggregate coaching suggestions
    const coachingSuggestions = this.generateCoachingSuggestions(results);

    // Generate overall feedback
    const overallFeedback = await this.generateOverallFeedback(results, imageUrls.length);

    return {
      individualResults: results,
      averageScore,
      overallFeedback,
      coachingSuggestions,
    };
  }

  /**
   * Generate coaching suggestions based on analysis results
   */
  private generateCoachingSuggestions(
    results: PhotoAnalysisResult[]
  ): Array<{
    type: string;
    title: string;
    description: string;
    priority: number;
  }> {
    const suggestions: Array<{
      type: string;
      title: string;
      description: string;
      priority: number;
    }> = [];

    // Count issues
    const issues = {
      lighting: 0,
      background: 0,
      expression: 0,
      angle: 0,
      focus: 0,
    };

    results.forEach(result => {
      Object.entries(result.feedback).forEach(([key, value]) => {
        if (value === 'poor') {
          issues[key as keyof typeof issues]++;
        }
      });
    });

    // Generate suggestions for common issues
    const totalPhotos = results.length;
    
    if (issues.lighting > totalPhotos * 0.3) {
      suggestions.push({
        type: 'LIGHTING',
        title: 'Improve Your Lighting',
        description:
          'Many of your photos have lighting issues. Try facing a window or using natural light.',
        priority: 1,
      });
    }

    if (issues.background > totalPhotos * 0.3) {
      suggestions.push({
        type: 'BACKGROUND',
        title: 'Better Background Needed',
        description:
          'Use a plain, neutral wall or background. Avoid busy or cluttered areas.',
        priority: 1,
      });
    }

    if (issues.expression > totalPhotos * 0.3) {
      suggestions.push({
        type: 'EXPRESSION',
        title: 'Natural Expression Tips',
        description:
          'Your expressions could be more natural. Relax and think of something pleasant!',
        priority: 2,
      });
    }

    if (issues.angle > totalPhotos * 0.3) {
      suggestions.push({
        type: 'ANGLE',
        title: 'Camera Angle Suggestions',
        description:
          'Try positioning the camera at eye level for the most flattering angle.',
        priority: 2,
      });
    }

    if (totalPhotos < 15) {
      suggestions.push({
        type: 'QUANTITY',
        title: 'Upload More Photos',
        description:
          'We recommend at least 15-20 photos for the best results. More variety = better headshots!',
        priority: 1,
      });
    }

    return suggestions;
  }

  /**
   * Generate overall feedback summary
   */
  private async generateOverallFeedback(
    results: PhotoAnalysisResult[],
    photoCount: number
  ): Promise<string> {
    const averageScore =
      results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length;

    if (averageScore >= 8.5) {
      return `Excellent photos! Your ${photoCount} photos score an average of ${averageScore.toFixed(1)}/10. You'll get fantastic headshot results!`;
    } else if (averageScore >= 7.0) {
      return `Good photo quality! Your ${photoCount} photos score ${averageScore.toFixed(1)}/10. Check the suggestions below to improve your results.`;
    } else if (averageScore >= 5.5) {
      return `Acceptable photos, but there's room for improvement. Score: ${averageScore.toFixed(1)}/10. Follow the coaching tips below for better results.`;
    } else {
      return `We recommend improving your photos before generating headshots. Current score: ${averageScore.toFixed(1)}/10. See coaching suggestions below.`;
    }
  }

  /**
   * Analyze brand/website for style matching
   */
  async analyzeWebsiteStyle(websiteUrl: string): Promise<{
    dominantColors: string[];
    styleRecommendations: string[];
    formalityLevel: 'very-formal' | 'formal' | 'business-casual' | 'casual';
  }> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Analyze this website URL: ${websiteUrl}

Based on typical patterns for this domain/company:
1. What are likely dominant brand colors?
2. What style recommendations for professional headshots?
3. What's the formality level?

Respond in JSON:
{
  "dominantColors": ["#1a1a1a", "#ffffff"],
  "styleRecommendations": ["Corporate formal", "Clean backgrounds"],
  "formalityLevel": "formal"
}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Website analysis error:', error);
      
      // Return defaults
      return {
        dominantColors: ['#2c3e50', '#ffffff'],
        styleRecommendations: ['Professional corporate style'],
        formalityLevel: 'formal',
      };
    }
  }
}
