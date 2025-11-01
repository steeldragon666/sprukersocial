// Services Index - Export all services

export { ClaudeVisionService } from './claude-vision.service';
export { ReplicateService } from './replicate.service';
export { CloudinaryService } from './cloudinary.service';
export { ProjectService } from './project.service';
export { PaymentService } from './payment.service';

// Service factory for dependency injection
export class ServiceFactory {
  private static claudeVision: ClaudeVisionService;
  private static replicate: ReplicateService;
  private static cloudinary: CloudinaryService;
  private static project: ProjectService;
  private static payment: PaymentService;

  static initialize(config: {
    anthropicApiKey: string;
    replicateApiToken: string;
    cloudinaryCloudName: string;
    cloudinaryApiKey: string;
    cloudinaryApiSecret: string;
    stripeApiKey: string;
  }) {
    this.claudeVision = new ClaudeVisionService(config.anthropicApiKey);
    this.replicate = new ReplicateService(config.replicateApiToken);
    this.cloudinary = new CloudinaryService({
      cloudName: config.cloudinaryCloudName,
      apiKey: config.cloudinaryApiKey,
      apiSecret: config.cloudinaryApiSecret,
    });
    this.payment = new PaymentService(config.stripeApiKey);
    
    this.project = new ProjectService(
      this.claudeVision,
      this.replicate,
      this.cloudinary
    );
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

  static getProject(): ProjectService {
    if (!this.project) {
      throw new Error('Services not initialized');
    }
    return this.project;
  }

  static getPayment(): PaymentService {
    if (!this.payment) {
      throw new Error('Services not initialized');
    }
    return this.payment;
  }
}
