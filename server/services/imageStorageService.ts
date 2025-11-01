/**
 * Image Storage Service
 * Handles image uploads and management using Cloudinary
 */

import { v2 as cloudinary } from 'cloudinary';

interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

interface UploadOptions {
  folder?: string;
  transformation?: any[];
  format?: string;
  quality?: string | number;
}

export class ImageStorageService {
  constructor(
    cloudName: string,
    apiKey: string,
    apiSecret: string
  ) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  /**
   * Upload image from buffer
   */
  async uploadFromBuffer(
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: options.folder || 'instagram-posts',
        resource_type: 'image' as const,
        transformation: options.transformation || [
          { width: 1080, height: 1080, crop: 'fill', gravity: 'auto' },
          { quality: options.quality || 'auto:good' },
          { fetch_format: options.format || 'auto' }
        ],
      };

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(new Error(`Upload failed: ${error.message}`));
            return;
          }

          if (!result) {
            reject(new Error('Upload failed: No result returned'));
            return;
          }

          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Upload image from URL
   */
  async uploadFromUrl(
    url: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const uploadOptions = {
        folder: options.folder || 'instagram-posts',
        transformation: options.transformation || [
          { width: 1080, height: 1080, crop: 'fill', gravity: 'auto' },
          { quality: options.quality || 'auto:good' },
          { fetch_format: options.format || 'auto' }
        ],
      };

      const result = await cloudinary.uploader.upload(url, uploadOptions);

      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error: any) {
      throw new Error(`Upload from URL failed: ${error.message}`);
    }
  }

  /**
   * Delete image by public ID
   */
  async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error: any) {
      console.error(`Failed to delete image ${publicId}:`, error);
      return false;
    }
  }

  /**
   * Get optimized image URL with transformations
   */
  getOptimizedUrl(publicId: string, options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
  } = {}): string {
    return cloudinary.url(publicId, {
      width: options.width || 1080,
      height: options.height || 1080,
      crop: options.crop || 'fill',
      gravity: 'auto',
      quality: options.quality || 'auto:good',
      fetch_format: options.format || 'auto',
      secure: true,
    });
  }

  /**
   * Generate Instagram-optimized URL (1080x1080)
   */
  getInstagramUrl(publicId: string): string {
    return this.getOptimizedUrl(publicId, {
      width: 1080,
      height: 1080,
      crop: 'fill',
      quality: 'auto:good',
      format: 'jpg',
    });
  }

  /**
   * Validate image before upload
   */
  validateImage(buffer: Buffer): { valid: boolean; error?: string } {
    // Check file size (max 8MB for Instagram)
    const maxSize = 8 * 1024 * 1024; // 8MB
    if (buffer.length > maxSize) {
      return {
        valid: false,
        error: `Image too large (${(buffer.length / 1024 / 1024).toFixed(2)}MB, max 8MB)`,
      };
    }

    // Check if it's a valid image by looking at magic numbers
    const signature = buffer.slice(0, 4).toString('hex');
    const validSignatures = [
      'ffd8ffe0', // JPEG
      'ffd8ffe1', // JPEG
      '89504e47', // PNG
      '47494638', // GIF
    ];

    if (!validSignatures.some(sig => signature.startsWith(sig))) {
      return {
        valid: false,
        error: 'Invalid image format (must be JPEG, PNG, or GIF)',
      };
    }

    return { valid: true };
  }
}

export default ImageStorageService;
