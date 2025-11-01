// Replicate Service - Model Training & Image Generation
// Handles Flux model training and headshot generation

import Replicate from 'replicate';
import type { GenerationConfig } from '@headshot-studio/shared';
import { STYLE_PRESETS } from '@headshot-studio/shared';

export class ReplicateService {
  private replicate: Replicate;

  constructor(apiToken: string) {
    this.replicate = new Replicate({ auth: apiToken });
  }

  /**
   * Train a custom LoRA model on user's photos
   */
  async trainModel(params: {
    userId: number;
    photoUrls: string[];
    triggerWord?: string;
    steps?: number;
  }): Promise<{
    trainingId: string;
    status: string;
  }> {
    const { userId, photoUrls, triggerWord = 'TOK', steps = 1000 } = params;

    try {
      // Start training with Flux LoRA trainer
      const training = await this.replicate.trainings.create(
        'ostris/flux-dev-lora-trainer',
        'e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497',
        {
          destination: `user-${userId}/headshots-${Date.now()}`,
          input: {
            steps,
            lora_rank: 16,
            optimizer: 'adamw8bit',
            batch_size: 1,
            resolution: '512,768,1024',
            autocaption: true,
            trigger_word: triggerWord,
            learning_rate: 0.0004,
            wandb_project: 'flux_train_replicate',
            wandb_save_interval: 100,
            caption_dropout_rate: 0.05,
            cache_latents_to_disk: false,
            wandb_sample_interval: 100,
            input_images: photoUrls.join('|'),
          },
        }
      );

      return {
        trainingId: training.id,
        status: training.status,
      };
    } catch (error) {
      console.error('Model training error:', error);
      throw new Error(`Failed to start model training: ${error}`);
    }
  }

  /**
   * Check training status
   */
  async getTrainingStatus(trainingId: string): Promise<{
    status: string;
    progress?: number;
    error?: string;
    modelVersion?: string;
  }> {
    try {
      const training = await this.replicate.trainings.get(trainingId);

      return {
        status: training.status,
        progress: this.calculateProgress(training),
        error: training.error?.toString(),
        modelVersion: training.output?.version,
      };
    } catch (error) {
      console.error('Training status check error:', error);
      throw new Error(`Failed to check training status: ${error}`);
    }
  }

  /**
   * Calculate training progress percentage
   */
  private calculateProgress(training: any): number {
    if (training.status === 'succeeded') return 100;
    if (training.status === 'failed' || training.status === 'canceled') return 0;
    
    // Estimate based on logs or metrics if available
    if (training.metrics?.step && training.metrics?.total_steps) {
      return (training.metrics.step / training.metrics.total_steps) * 100;
    }

    // Default progress for 'processing' status
    if (training.status === 'processing') return 50;
    if (training.status === 'starting') return 10;
    
    return 0;
  }

  /**
   * Generate preview headshots (fast, lower quality)
   */
  async generatePreview(params: {
    modelVersion: string;
    triggerWord: string;
    style: string;
    background?: string;
    numOutputs?: number;
  }): Promise<string[]> {
    const {
      modelVersion,
      triggerWord,
      style,
      background = 'office',
      numOutputs = 3,
    } = params;

    const prompt = this.buildPrompt({
      triggerWord,
      style,
      background,
      quality: 'preview',
    });

    try {
      const output = await this.replicate.run(modelVersion as `${string}/${string}`, {
        input: {
          prompt,
          num_outputs: numOutputs,
          aspect_ratio: '1:1',
          output_format: 'webp',
          output_quality: 80,
          num_inference_steps: 20, // Fast preview
          guidance_scale: 3.5,
        },
      });

      return output as string[];
    } catch (error) {
      console.error('Preview generation error:', error);
      throw new Error(`Failed to generate preview: ${error}`);
    }
  }

  /**
   * Generate full set of headshots (high quality)
   */
  async generateFullSet(params: {
    modelVersion: string;
    triggerWord: string;
    config: GenerationConfig;
  }): Promise<string[]> {
    const { modelVersion, triggerWord, config } = params;

    const results: string[] = [];

    // Generate variations
    const stylePreset = STYLE_PRESETS[config.style];
    const prompt = this.buildPrompt({
      triggerWord,
      style: stylePreset.modifiers,
      background: config.background,
      customBrand: config.customBrand,
      quality: 'full',
    });

    try {
      const output = await this.replicate.run(modelVersion as `${string}/${string}`, {
        input: {
          prompt,
          num_outputs: config.numOutputs,
          aspect_ratio: '1:1',
          output_format: 'png',
          output_quality: 95,
          num_inference_steps: config.inferenceSteps || 50,
          guidance_scale: 7.5,
          seed: Math.floor(Math.random() * 1000000),
        },
      });

      results.push(...(output as string[]));
    } catch (error) {
      console.error('Full generation error:', error);
      throw new Error(`Failed to generate full set: ${error}`);
    }

    return results;
  }

  /**
   * Generate multiple variations (different styles/backgrounds)
   */
  async generateVariations(params: {
    modelVersion: string;
    triggerWord: string;
    styles: string[];
    backgrounds: string[];
    numPerVariation: number;
  }): Promise<Array<{ style: string; background: string; images: string[] }>> {
    const { modelVersion, triggerWord, styles, backgrounds, numPerVariation } = params;

    const variations: Array<{
      style: string;
      background: string;
      images: string[];
    }> = [];

    for (const style of styles) {
      for (const background of backgrounds) {
        try {
          const images = await this.generateFullSet({
            modelVersion,
            triggerWord,
            config: {
              style: style as keyof typeof STYLE_PRESETS,
              background: background as any,
              numOutputs: numPerVariation,
              inferenceSteps: 50,
            },
          });

          variations.push({ style, background, images });
        } catch (error) {
          console.error(`Error generating ${style}/${background}:`, error);
        }
      }
    }

    return variations;
  }

  /**
   * Build optimized prompt for headshot generation
   */
  private buildPrompt(params: {
    triggerWord: string;
    style: string;
    background: string;
    customBrand?: {
      colors: string[];
      website?: string;
      logoUrl?: string;
    };
    quality: 'preview' | 'full';
  }): string {
    const { triggerWord, style, background, customBrand, quality } = params;

    let prompt = `Professional headshot photograph of ${triggerWord} person, ${style}`;

    // Add background details
    if (background !== 'custom') {
      prompt += `, ${background} background`;
    }

    // Add brand colors if available
    if (customBrand?.colors && customBrand.colors.length > 0) {
      prompt += `, incorporating brand colors ${customBrand.colors.join(', ')}`;
    }

    // Quality modifiers
    if (quality === 'full') {
      prompt += `, captured with Canon EOS R5, 85mm f/1.4 lens, shallow depth of field, professional studio lighting, 8k resolution, highly detailed, sharp focus on eyes, natural skin texture, professional color grading, realistic lighting, professional retouching, film grain texture`;
    } else {
      prompt += `, professional photography, 4k resolution, sharp focus, good lighting`;
    }

    // Negative prompts
    prompt += `. Avoid: oversaturation, unnatural colors, harsh shadows, blurry, low quality, distorted features, amateur photography`;

    return prompt;
  }

  /**
   * Upscale an image
   */
  async upscaleImage(imageUrl: string): Promise<string> {
    try {
      const output = await this.replicate.run(
        'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
        {
          input: {
            image: imageUrl,
            scale: 2,
            face_enhance: true,
          },
        }
      );

      return output as string;
    } catch (error) {
      console.error('Upscaling error:', error);
      throw new Error(`Failed to upscale image: ${error}`);
    }
  }

  /**
   * Remove background from image
   */
  async removeBackground(imageUrl: string): Promise<string> {
    try {
      const output = await this.replicate.run(
        'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
        {
          input: {
            image: imageUrl,
          },
        }
      );

      return output as string;
    } catch (error) {
      console.error('Background removal error:', error);
      throw new Error(`Failed to remove background: ${error}`);
    }
  }
}
