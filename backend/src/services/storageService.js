import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import env from '../config/env.js';
import logger from '../utils/logger.js';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Storage Service Abstraction
 * Manages file uploads to either Cloudinary (cloud object storage)
 * or local filesystem storage with secure metadata generation.
 */
export const storageService = {
  /**
   * Upload an image buffer or file object
   * @param {Object} file - Multer file object ({ buffer, originalname, mimetype, size })
   * @returns {Promise<Object>} Image metadata object
   */
  async uploadImage(file) {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const error = new Error('Invalid file type. Only JPEG, PNG, and WebP images are permitted.');
      error.statusCode = 400;
      throw error;
    }

    const maxSizeBytes = env.storage.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const error = new Error(`File size exceeds maximum limit of ${env.storage.maxFileSizeMb}MB.`);
      error.statusCode = 400;
      throw error;
    }

    // Cloudinary Storage Provider
    if (
      env.storage.provider === 'cloudinary' &&
      env.storage.cloudinary.cloudName &&
      env.storage.cloudinary.apiKey &&
      env.storage.cloudinary.apiSecret
    ) {
      return await this._uploadToCloudinary(file);
    }

    // Default: Local Storage Provider
    return await this._uploadToLocalStorage(file);
  },

  async _uploadToLocalStorage(file) {
    const uploadDir = env.storage.uploadDir;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Determine safe extension
    const extMap = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = extMap[file.mimetype] || '.jpg';
    const uniqueKey = `shop-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const targetPath = path.join(uploadDir, uniqueKey);

    await fs.promises.writeFile(targetPath, file.buffer);
    logger.info('Shop image saved to local storage', { key: uniqueKey, size: file.size });

    return {
      url: `/uploads/${uniqueKey}`,
      publicId: uniqueKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    };
  },

  async _uploadToCloudinary(file) {
    // Dynamic import to avoid crash if cloudinary package is not loaded
    const cloudinaryModule = await import('cloudinary');
    const cloudinary = cloudinaryModule.v2 || cloudinaryModule.default;

    cloudinary.config({
      cloud_name: env.storage.cloudinary.cloudName,
      api_key: env.storage.cloudinary.apiKey,
      api_secret: env.storage.cloudinary.apiSecret,
    });

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: env.storage.cloudinary.folder,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload failure', { error: error.message });
            return reject(new Error('Cloud image storage upload failed: ' + error.message));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedAt: new Date(),
          });
        }
      );
      uploadStream.end(file.buffer);
    });
  },

  async deleteImage(publicId) {
    if (!publicId) return;

    if (env.storage.provider === 'cloudinary' && env.storage.cloudinary.cloudName) {
      try {
        const cloudinaryModule = await import('cloudinary');
        const cloudinary = cloudinaryModule.v2 || cloudinaryModule.default;
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        logger.warn('Failed to delete Cloudinary asset', { publicId, error: err.message });
      }
    } else {
      const localFile = path.join(env.storage.uploadDir, publicId);
      if (fs.existsSync(localFile)) {
        try {
          await fs.promises.unlink(localFile);
        } catch (err) {
          logger.warn('Failed to delete local file', { path: localFile, error: err.message });
        }
      }
    }
  },
};

export default storageService;
