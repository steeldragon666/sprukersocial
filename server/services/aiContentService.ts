/**
 * AI Content Service
 * Generates Instagram captions, hashtags, and images using Claude and image generation APIs
 */

import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";

interface GenerateContentInput {
  topic: string;
  brandGuidelines?: string;
  toneOfVoice?: string;
  category?: string; // policy, technology, environmental, trending
}

interface ContentOutput {
  caption: string;
  suggestedHashtags: string[];
  imagePrompt: string;
  category: string;
}

interface GenerateImageInput {
  prompt: string;
  width?: number;
  height?: number;
}

export class AIContentService {
  /**
   * Generate Instagram post content (caption + hashtags + image prompt)
   */
  async generateContent(input: GenerateContentInput): Promise<ContentOutput> {
    const { topic, brandGuidelines, toneOfVoice, category } = input;

    // Determine content category if not provided
    const contentCategory = category || this.determineCategory(topic);

    const systemPrompt = `You are an expert Instagram content creator specializing in sustainable energy, renewable fuels, and clean technology.

Brand Guidelines: ${brandGuidelines || "Professional, informative, engaging"}
Tone of Voice: ${toneOfVoice || "Professional yet accessible, passionate about sustainability"}
Content Category: ${contentCategory}

Create Instagram post content that:
- Educates and inspires about sustainable energy
- Uses clear, compelling language
- Includes relevant facts or statistics when appropriate
- Ends with a call-to-action or thought-provoking question
- Is optimized for engagement

Response must be valid JSON with this structure:
{
  "caption": "Instagram caption (max 2200 chars, include line breaks for readability)",
  "suggestedHashtags": ["array", "of", "15-20", "relevant", "hashtags"],
  "imagePrompt": "Detailed prompt for AI image generation",
  "category": "${contentCategory}"
}`;

    const userPrompt = `Create an Instagram post about: ${topic}

Make it engaging, informative, and aligned with sustainable energy themes.`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "instagram_content",
            strict: true,
            schema: {
              type: "object",
              properties: {
                caption: {
                  type: "string",
                  description: "Instagram post caption with line breaks",
                },
                suggestedHashtags: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of relevant hashtags without # symbol",
                },
                imagePrompt: {
                  type: "string",
                  description: "Detailed prompt for AI image generation",
                },
                category: {
                  type: "string",
                  description: "Content category",
                },
              },
              required: ["caption", "suggestedHashtags", "imagePrompt", "category"],
              additionalProperties: false,
            },
          },
        },
      });

      const messageContent = response.choices[0].message.content;
      const contentStr = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
      const content = JSON.parse(contentStr || "{}");

      return {
        caption: content.caption,
        suggestedHashtags: content.suggestedHashtags,
        imagePrompt: content.imagePrompt,
        category: content.category,
      };
    } catch (error: any) {
      console.error("AI content generation failed:", error);
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  /**
   * Generate image using AI
   */
  async generateImage(input: GenerateImageInput): Promise<Buffer> {
    try {
      const { url } = await generateImage({
        prompt: input.prompt,
      });

      if (!url) {
        throw new Error("Image generation did not return a URL");
      }

      // Download the image and return as buffer
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download generated image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: any) {
      console.error("Image generation failed:", error);
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  /**
   * Optimize hashtags for Instagram
   * Mix of popular, niche, and branded hashtags
   */
  optimizeHashtags(topic: string, suggestedHashtags: string[]): string[] {
    // Core sustainable energy hashtags
    const coreHashtags = [
      "SustainableEnergy",
      "RenewableEnergy",
      "CleanTech",
      "GreenEnergy",
      "ClimateAction",
    ];

    // Category-specific hashtags
    const categoryHashtags: Record<string, string[]> = {
      policy: [
        "EnergyPolicy",
        "ClimatePolicy",
        "RenewablesAustralia",
        "NetZero",
        "ARENA",
      ],
      technology: [
        "EnergyInnovation",
        "CleanTechnology",
        "BatteryTech",
        "Electrification",
        "EnergyStorage",
      ],
      environmental: [
        "Sustainability",
        "CircularEconomy",
        "CarbonNeutral",
        "EcoFriendly",
        "GreenFuture",
      ],
      saf: [
        "SustainableAviationFuel",
        "SAF",
        "AviationDecarbonization",
        "GreenAviation",
        "BiofuelInnovation",
      ],
      bioenergy: [
        "Bioenergy",
        "Biomass",
        "BioFuels",
        "RenewableFuels",
        "WasteToEnergy",
      ],
    };

    // Determine category from topic
    const category = this.determineCategory(topic);
    const relevantHashtags = categoryHashtags[category] || [];

    // Combine and deduplicate
    const allHashtags = [
      ...coreHashtags,
      ...relevantHashtags,
      ...suggestedHashtags,
    ];

    // Remove duplicates and limit to 30 (Instagram max)
    const uniqueHashtags = Array.from(new Set(allHashtags.map(h => h.replace("#", ""))));

    return uniqueHashtags.slice(0, 30);
  }

  /**
   * Determine content category from topic
   */
  private determineCategory(topic: string): string {
    const topicLower = topic.toLowerCase();

    if (
      topicLower.includes("policy") ||
      topicLower.includes("government") ||
      topicLower.includes("regulation") ||
      topicLower.includes("arena") ||
      topicLower.includes("mandate")
    ) {
      return "policy";
    }

    if (
      topicLower.includes("battery") ||
      topicLower.includes("electrification") ||
      topicLower.includes("technology") ||
      topicLower.includes("innovation") ||
      topicLower.includes("breakthrough")
    ) {
      return "technology";
    }

    if (
      topicLower.includes("saf") ||
      topicLower.includes("aviation fuel") ||
      topicLower.includes("sustainable aviation")
    ) {
      return "saf";
    }

    if (
      topicLower.includes("bioenergy") ||
      topicLower.includes("biomass") ||
      topicLower.includes("biofuel")
    ) {
      return "bioenergy";
    }

    if (
      topicLower.includes("climate") ||
      topicLower.includes("environment") ||
      topicLower.includes("sustainability") ||
      topicLower.includes("carbon")
    ) {
      return "environmental";
    }

    return "general";
  }

  /**
   * Generate multiple content variations
   */
  async generateVariations(
    topic: string,
    count: number = 3
  ): Promise<ContentOutput[]> {
    const variations: ContentOutput[] = [];

    for (let i = 0; i < count; i++) {
      const content = await this.generateContent({ topic });
      variations.push(content);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return variations;
  }
}

export default AIContentService;
