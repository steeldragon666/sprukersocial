// Sentiment Analysis Service - AI-powered sentiment detection
// Uses Claude AI for advanced sentiment analysis

import Anthropic from '@anthropic-ai/sdk';

export interface SentimentResult {
  score: number; // -1 to 1 (-1 = very negative, 0 = neutral, 1 = very positive)
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number; // 0 to 1
  emotions: {
    joy?: number;
    anger?: number;
    sadness?: number;
    fear?: number;
    surprise?: number;
    disgust?: number;
  };
  keywords: string[];
  topics: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  suggestedResponse?: string;
}

export interface BatchSentimentResult {
  overall: SentimentResult;
  individual: Array<SentimentResult & { text: string }>;
  trends: {
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
    averageScore: number;
  };
  alerts: Array<{
    type: 'negative_spike' | 'positive_trend' | 'urgent_mention';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export class SentimentAnalysisService {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Analyze sentiment of a single text
   */
  async analyzeSentiment(text: string, context?: {
    brand?: string;
    platform?: string;
    author?: string;
  }): Promise<SentimentResult> {
    const prompt = `Analyze the sentiment of this ${context?.platform || 'social media'} ${context?.brand ? `mention about ${context.brand}` : 'post'}:

"${text}"

Provide a detailed sentiment analysis including:
1. Overall sentiment (positive/negative/neutral/mixed)
2. Sentiment score from -1 (very negative) to 1 (very positive)
3. Confidence level (0-1)
4. Detected emotions (joy, anger, sadness, fear, surprise, disgust) with intensity 0-1
5. Key topics and keywords
6. Urgency level (low/medium/high/critical)
7. Whether this requires action/response
8. Suggested response if actionable

Return as JSON with this structure:
{
  "score": number,
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "confidence": number,
  "emotions": { "joy": number, "anger": number, ... },
  "keywords": string[],
  "topics": string[],
  "urgency": "low" | "medium" | "high" | "critical",
  "actionable": boolean,
  "suggestedResponse": string (optional)
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result: SentimentResult = JSON.parse(jsonMatch[0]);
      return result;
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      
      // Fallback to basic sentiment
      return this.basicSentimentAnalysis(text);
    }
  }

  /**
   * Analyze sentiment of multiple texts (batch)
   */
  async analyzeBatch(
    texts: Array<{ text: string; id?: string; timestamp?: Date }>,
    context?: { brand?: string; platform?: string }
  ): Promise<BatchSentimentResult> {
    // Analyze each text
    const individual = await Promise.all(
      texts.map(async (item) => {
        const result = await this.analyzeSentiment(item.text, context);
        return { ...result, text: item.text };
      })
    );

    // Calculate trends
    const positiveCount = individual.filter(r => r.sentiment === 'positive').length;
    const negativeCount = individual.filter(r => r.sentiment === 'negative').length;
    const neutralCount = individual.filter(r => r.sentiment === 'neutral').length;
    const averageScore = individual.reduce((sum, r) => sum + r.score, 0) / individual.length;

    // Detect alerts
    const alerts: BatchSentimentResult['alerts'] = [];

    // Negative spike detection
    if (negativeCount / texts.length > 0.3) {
      alerts.push({
        type: 'negative_spike',
        message: `${negativeCount} negative mentions detected (${Math.round(negativeCount / texts.length * 100)}%)`,
        severity: negativeCount / texts.length > 0.5 ? 'high' : 'medium'
      });
    }

    // Positive trend detection
    if (positiveCount / texts.length > 0.7) {
      alerts.push({
        type: 'positive_trend',
        message: `Strong positive sentiment: ${positiveCount} positive mentions`,
        severity: 'low'
      });
    }

    // Urgent mentions
    const urgentMentions = individual.filter(r => r.urgency === 'critical' || r.urgency === 'high');
    if (urgentMentions.length > 0) {
      alerts.push({
        type: 'urgent_mention',
        message: `${urgentMentions.length} urgent mentions require immediate attention`,
        severity: 'high'
      });
    }

    // Overall sentiment
    const overall: SentimentResult = {
      score: averageScore,
      sentiment: averageScore > 0.3 ? 'positive' : averageScore < -0.3 ? 'negative' : 'neutral',
      confidence: individual.reduce((sum, r) => sum + r.confidence, 0) / individual.length,
      emotions: this.aggregateEmotions(individual),
      keywords: this.extractTopKeywords(individual),
      topics: this.extractTopTopics(individual),
      urgency: this.determineOverallUrgency(individual),
      actionable: individual.some(r => r.actionable),
    };

    return {
      overall,
      individual,
      trends: {
        positiveCount,
        negativeCount,
        neutralCount,
        averageScore,
      },
      alerts,
    };
  }

  /**
   * Monitor brand mentions and analyze sentiment
   */
  async monitorBrand(params: {
    brand: string;
    mentions: Array<{
      text: string;
      platform: string;
      author: string;
      timestamp: Date;
    }>;
    previousAnalysis?: BatchSentimentResult;
  }): Promise<{
    current: BatchSentimentResult;
    comparison?: {
      scoreChange: number;
      trendDirection: 'improving' | 'declining' | 'stable';
      significantChanges: string[];
    };
  }> {
    const current = await this.analyzeBatch(
      params.mentions,
      { brand: params.brand }
    );

    if (!params.previousAnalysis) {
      return { current };
    }

    // Compare with previous analysis
    const scoreChange = current.overall.score - params.previousAnalysis.overall.score;
    const trendDirection = 
      scoreChange > 0.1 ? 'improving' : 
      scoreChange < -0.1 ? 'declining' : 
      'stable';

    const significantChanges: string[] = [];
    
    if (Math.abs(scoreChange) > 0.2) {
      significantChanges.push(`Sentiment score ${scoreChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(scoreChange).toFixed(2)}`);
    }

    const negativeChange = current.trends.negativeCount - params.previousAnalysis.trends.negativeCount;
    if (negativeChange > 5) {
      significantChanges.push(`${negativeChange} more negative mentions than previous period`);
    }

    return {
      current,
      comparison: {
        scoreChange,
        trendDirection,
        significantChanges,
      },
    };
  }

  /**
   * Generate auto-response suggestions
   */
  async generateResponse(params: {
    originalText: string;
    sentiment: SentimentResult;
    brand: string;
    tone?: 'professional' | 'friendly' | 'empathetic' | 'casual';
  }): Promise<{
    response: string;
    alternatives: string[];
    reasoning: string;
  }> {
    const prompt = `Generate a ${params.tone || 'professional'} response to this ${params.sentiment.sentiment} mention about ${params.brand}:

Original message: "${params.originalText}"

Sentiment analysis:
- Sentiment: ${params.sentiment.sentiment}
- Urgency: ${params.sentiment.urgency}
- Topics: ${params.sentiment.topics.join(', ')}

Generate:
1. A primary response (2-3 sentences)
2. Two alternative responses
3. Brief reasoning for the approach

Return as JSON:
{
  "response": "primary response",
  "alternatives": ["alt 1", "alt 2"],
  "reasoning": "why this approach"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Response generation error:', error);
      return {
        response: 'Thank you for your feedback. We appreciate your input.',
        alternatives: [
          'We value your opinion and will take it into consideration.',
          'Thanks for sharing your thoughts with us.'
        ],
        reasoning: 'Generic fallback response'
      };
    }
  }

  /**
   * Fallback basic sentiment analysis (no AI)
   */
  private basicSentimentAnalysis(text: string): SentimentResult {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'awesome', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    const score = (positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1);
    
    return {
      score,
      sentiment: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral',
      confidence: 0.5,
      emotions: {},
      keywords: [],
      topics: [],
      urgency: 'low',
      actionable: false,
    };
  }

  private aggregateEmotions(results: SentimentResult[]) {
    const emotions: SentimentResult['emotions'] = {};
    const emotionKeys = ['joy', 'anger', 'sadness', 'fear', 'surprise', 'disgust'] as const;
    
    for (const key of emotionKeys) {
      const values = results.map(r => r.emotions[key] || 0).filter(v => v > 0);
      if (values.length > 0) {
        emotions[key] = values.reduce((sum, v) => sum + v, 0) / values.length;
      }
    }
    
    return emotions;
  }

  private extractTopKeywords(results: SentimentResult[], limit: number = 10): string[] {
    const keywordCounts = new Map<string, number>();
    
    for (const result of results) {
      for (const keyword of result.keywords) {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
      }
    }
    
    return Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([keyword]) => keyword);
  }

  private extractTopTopics(results: SentimentResult[], limit: number = 5): string[] {
    const topicCounts = new Map<string, number>();
    
    for (const result of results) {
      for (const topic of result.topics) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }
    }
    
    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([topic]) => topic);
  }

  private determineOverallUrgency(results: SentimentResult[]): SentimentResult['urgency'] {
    const criticalCount = results.filter(r => r.urgency === 'critical').length;
    const highCount = results.filter(r => r.urgency === 'high').length;
    
    if (criticalCount > 0) return 'critical';
    if (highCount > results.length * 0.3) return 'high';
    if (highCount > 0) return 'medium';
    return 'low';
  }
}
