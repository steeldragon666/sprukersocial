// Project Service - Core Business Logic
// Manages headshot generation projects end-to-end

import { prisma, ProjectStatus, ModelStatus, CoachingType } from '@headshot-studio/database';
import { ClaudeVisionService } from './claude-vision.service';
import { ReplicateService } from './replicate.service';
import { CloudinaryService } from './cloudinary.service';
import type { CreateProjectInput, UpdateProjectInput } from '@headshot-studio/shared';

export class ProjectService {
  constructor(
    private claudeVision: ClaudeVisionService,
    private replicate: ReplicateService,
    private cloudinary: CloudinaryService
  ) {}

  /**
   * Create a new headshot project
   */
  async createProject(userId: number, data: CreateProjectInput) {
    const project = await prisma.project.create({
      data: {
        userId,
        name: data.name || 'My Headshots',
        style: data.style,
        background: data.background,
        status: ProjectStatus.UPLOADING,
      },
    });

    return project;
  }

  /**
   * Get project details
   */
  async getProject(projectId: number, userId: number) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
      include: {
        uploadedPhotos: true,
        trainingModel: true,
        headshots: {
          where: { isTopPick: true },
          take: 20,
        },
        coaching: {
          where: { isResolved: false },
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    return project;
  }

  /**
   * Update project
   */
  async updateProject(
    projectId: number,
    userId: number,
    data: UpdateProjectInput
  ) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    return await prisma.project.update({
      where: { id: projectId },
      data: {
        name: data.name,
        style: data.style,
        background: data.background,
        customBrand: data.customBrand as any,
      },
    });
  }

  /**
   * Upload and analyze a photo
   */
  async uploadPhoto(params: {
    projectId: number;
    userId: number;
    imageUrl: string;
  }) {
    const { projectId, userId, imageUrl } = params;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Upload to Cloudinary
    const uploaded = await this.cloudinary.uploadFromUrl(imageUrl, {
      folder: `headshots/user-${userId}/project-${projectId}`,
    });

    // Generate thumbnail
    const thumbnailUrl = await this.cloudinary.generateThumbnail(uploaded.secureUrl);

    // Analyze with Claude Vision
    const analysis = await this.claudeVision.analyzePhoto(uploaded.secureUrl);

    // Save to database
    const photo = await prisma.uploadedPhoto.create({
      data: {
        projectId,
        originalUrl: uploaded.secureUrl,
        thumbnailUrl,
        cloudinaryId: uploaded.publicId,
        qualityScore: analysis.qualityScore,
        feedback: analysis.feedback as any,
        isApproved: analysis.approved,
        width: uploaded.width,
        height: uploaded.height,
        fileSize: uploaded.bytes,
        mimeType: uploaded.format,
      },
    });

    // Update project photo count
    await prisma.project.update({
      where: { id: projectId },
      data: {
        photoCount: { increment: 1 },
      },
    });

    return { photo, analysis };
  }

  /**
   * Analyze all photos in a project and generate coaching
   */
  async analyzeProjectPhotos(projectId: number, userId: number) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { uploadedPhotos: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.uploadedPhotos.length === 0) {
      throw new Error('No photos uploaded yet');
    }

    // Analyze photo set
    const photoUrls = project.uploadedPhotos.map((p) => p.originalUrl);
    const analysis = await this.claudeVision.analyzePhotoSet(photoUrls);

    // Save coaching suggestions
    for (const suggestion of analysis.coachingSuggestions) {
      await prisma.coachingFeedback.create({
        data: {
          projectId,
          type: suggestion.type as CoachingType,
          title: suggestion.title,
          description: suggestion.description,
          suggestions: [], // Could expand this
          priority: suggestion.priority,
        },
      });
    }

    // Update project with analysis
    await prisma.project.update({
      where: { id: projectId },
      data: {
        qualityScore: analysis.averageScore,
        analysisResults: {
          overallFeedback: analysis.overallFeedback,
          individualScores: analysis.individualResults.map((r) => r.qualityScore),
        } as any,
        status: ProjectStatus.READY,
      },
    });

    return {
      averageScore: analysis.averageScore,
      feedback: analysis.overallFeedback,
      coaching: analysis.coachingSuggestions,
    };
  }

  /**
   * Start model training
   */
  async startTraining(projectId: number, userId: number) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { uploadedPhotos: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.uploadedPhotos.length < 10) {
      throw new Error('Need at least 10 photos to train model');
    }

    // Get approved photos
    const approvedPhotos = project.uploadedPhotos.filter((p) => p.isApproved);
    const photoUrls = approvedPhotos.map((p) => p.originalUrl);

    // Start training on Replicate
    const training = await this.replicate.trainModel({
      userId,
      photoUrls,
      triggerWord: 'TOK',
      steps: 1000,
    });

    // Save training model
    const trainingModel = await prisma.trainingModel.create({
      data: {
        projectId,
        replicateId: training.trainingId,
        status: ModelStatus.TRAINING,
        startedAt: new Date(),
      },
    });

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.GENERATING_PREVIEW,
      },
    });

    return { trainingId: training.trainingId, model: trainingModel };
  }

  /**
   * Check training progress
   */
  async checkTrainingProgress(projectId: number, userId: number) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { trainingModel: true },
    });

    if (!project || !project.trainingModel) {
      throw new Error('Training not started');
    }

    const status = await this.replicate.getTrainingStatus(
      project.trainingModel.replicateId!
    );

    // Update model status
    await prisma.trainingModel.update({
      where: { id: project.trainingModel.id },
      data: {
        status:
          status.status === 'succeeded'
            ? ModelStatus.COMPLETED
            : status.status === 'failed'
            ? ModelStatus.FAILED
            : ModelStatus.TRAINING,
        progress: status.progress,
        modelUrl: status.modelVersion,
        error: status.error,
        completedAt: status.status === 'succeeded' ? new Date() : undefined,
      },
    });

    return {
      status: status.status,
      progress: status.progress,
      modelVersion: status.modelVersion,
    };
  }

  /**
   * Generate preview headshots
   */
  async generatePreview(params: {
    projectId: number;
    userId: number;
    style?: string;
    background?: string;
  }) {
    const { projectId, userId, style = 'CORPORATE', background = 'office' } = params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { trainingModel: true },
    });

    if (!project || !project.trainingModel) {
      throw new Error('Project not ready for generation');
    }

    if (project.trainingModel.status !== ModelStatus.COMPLETED) {
      throw new Error('Model training not completed');
    }

    // Generate previews
    const images = await this.replicate.generatePreview({
      modelVersion: project.trainingModel.modelUrl!,
      triggerWord: project.trainingModel.triggerWord,
      style,
      background,
      numOutputs: 3,
    });

    // Upload to Cloudinary and save
    const headshots = await Promise.all(
      images.map(async (imageUrl) => {
        const uploaded = await this.cloudinary.uploadFromUrl(imageUrl, {
          folder: `headshots/user-${userId}/project-${projectId}/preview`,
        });

        const thumbnail = await this.cloudinary.generateThumbnail(uploaded.secureUrl);

        return await prisma.headshot.create({
          data: {
            projectId,
            imageUrl: uploaded.secureUrl,
            thumbnailUrl: thumbnail,
            cloudinaryId: uploaded.publicId,
            prompt: `Preview - ${style}`,
            style,
            background: background || 'office',
            isPreview: true,
            width: uploaded.width,
            height: uploaded.height,
          },
        });
      })
    );

    // Update project
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.PREVIEW_READY,
        previewGenerated: true,
      },
    });

    return headshots;
  }

  /**
   * Generate full set of headshots
   */
  async generateFullSet(params: {
    projectId: number;
    userId: number;
    styles: string[];
    numPerStyle?: number;
  }) {
    const { projectId, userId, styles, numPerStyle = 10 } = params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: { trainingModel: true },
    });

    if (!project || !project.trainingModel) {
      throw new Error('Project not ready');
    }

    if (project.trainingModel.status !== ModelStatus.COMPLETED) {
      throw new Error('Model not ready');
    }

    // Update status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.GENERATING_FULL },
    });

    const allHeadshots = [];

    // Generate for each style
    for (const style of styles) {
      const images = await this.replicate.generateFullSet({
        modelVersion: project.trainingModel.modelUrl!,
        triggerWord: project.trainingModel.triggerWord,
        config: {
          style: style as any,
          background: project.background || 'office',
          customBrand: project.customBrand as any,
          numOutputs: numPerStyle,
          inferenceSteps: 50,
        },
      });

      // Upload and save
      const headshots = await Promise.all(
        images.map(async (imageUrl) => {
          const uploaded = await this.cloudinary.uploadFromUrl(imageUrl, {
            folder: `headshots/user-${userId}/project-${projectId}/full`,
          });

          const thumbnail = await this.cloudinary.generateThumbnail(uploaded.secureUrl);

          return await prisma.headshot.create({
            data: {
              projectId,
              imageUrl: uploaded.secureUrl,
              thumbnailUrl: thumbnail,
              cloudinaryId: uploaded.publicId,
              prompt: `${style} headshot`,
              style,
              background: project.background || 'office',
              isPreview: false,
              width: uploaded.width,
              height: uploaded.height,
            },
          });
        })
      );

      allHeadshots.push(...headshots);
    }

    // Mark top picks (use simple logic for now)
    const topPicks = allHeadshots.slice(0, 20);
    await Promise.all(
      topPicks.map((h) =>
        prisma.headshot.update({
          where: { id: h.id },
          data: { isTopPick: true, aiQualityScore: 8.5 },
        })
      )
    );

    // Update project
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: ProjectStatus.COMPLETED,
        totalGenerated: allHeadshots.length,
        completedAt: new Date(),
      },
    });

    return { headshots: allHeadshots, topPicks };
  }

  /**
   * Get all projects for a user
   */
  async getUserProjects(userId: number) {
    return await prisma.project.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            uploadedPhotos: true,
            headshots: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: number, userId: number) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        uploadedPhotos: true,
        headshots: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Delete all images from Cloudinary
    const allImages = [
      ...project.uploadedPhotos.map((p) => p.cloudinaryId),
      ...project.headshots.map((h) => h.cloudinaryId),
    ].filter(Boolean);

    await Promise.all(
      allImages.map((id) => this.cloudinary.deleteImage(id!))
    );

    // Delete from database (cascade will handle relations)
    await prisma.project.delete({
      where: { id: projectId },
    });

    return { success: true };
  }
}