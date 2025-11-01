// Services Index - Export all services

export { ClaudeVisionService } from './claude-vision.service';
export { ReplicateService } from './replicate.service';
export { CloudinaryService } from './cloudinary.service';

// Service factory for dependency injection
export class ServiceFactory {
  private static claudeVision: ClaudeVisionService;
  private static replicate: ReplicateService;
  private static cloudinary: CloudinaryService;

  static initialize(config: {
    anthropicApiKey: string;
    replicateApiToken: string;
    cloudinaryCloudName: string;
    cloudinaryApiKey: string;
    cloudinaryApiSecret: string;
  }) {
    this.claudeVision = new ClaudeVisionService(config.anthropicApiKey);
    this.replicate = new ReplicateService(config.replicateApiToken);
    this.cloudinary = new CloudinaryService({
      cloudName: config.cloudinaryCloudName,
      apiKey: config.cloudinaryApiKey,
      apiSecret: config.cloudinaryApiSecret,
    });
  }

  static getClaudeVision(): ClaudeVisionService {
    if (!this.claudeVision) {
      throw new Error('Services not initialized');
    }
    return this.claudeVision;
  }

  static getReplicate(): ReplicateService {
    if (!this.replicate) {
      throw new Error('Services not initialized');
    }
    return this.replicate;
  }

  static getCloudinary(): CloudinaryService {
    if (!this.cloudinary) {
      throw new Error('Services not initialized');
    }
    return this.cloudinary;
  }
}
