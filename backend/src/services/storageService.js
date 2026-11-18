import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { validateAndSanitizeImage } from '../utils/imageSecurity.js';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function sanitizeOriginalFilename(name) {
  return String(name || 'property-image')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
}

function createCloudinarySignature(params, apiSecret) {
  const sortedQuery = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto
    .createHash('sha1')
    .update(`${sortedQuery}${apiSecret}`)
    .digest('hex');
}

/**
 * Storage Service Abstraction
 * Validates image magic bytes, strips EXIF/metadata, and uploads to either
 * Cloudinary (server-side signed upload) or local filesystem storage.
 */
export const storageService = {
  async uploadImage(file) {
    if (!file) {
      const error = new Error('No file provided for upload');
      error.statusCode = 400;
      throw error;
    }

    const maxSizeBytes = (env.storage.maxFileSizeMb || 5) * 1024 * 1024;
    if (file.size > maxSizeBytes || (file.buffer && file.buffer.length > maxSizeBytes)) {
      const error = new Error(`File size exceeds maximum limit of ${env.storage.maxFileSizeMb}MB.`);
      error.statusCode = 400;
      throw error;
    }

    // Validate magic bytes, structural integrity, and strip EXIF/GPS metadata
    const sanitized = validateAndSanitizeImage(file, ALLOWED_MIME_TYPES);
    const cleanFile = {
      ...file,
      buffer: sanitized.buffer,
      mimetype: sanitized.mimeType,
      size: sanitized.size,
      originalname: sanitizeOriginalFilename(file.originalname),
    };

    const isProduction = process.env.NODE_ENV === 'production' || env.isProduction;
    const isConfiguredVal = (v) => Boolean(v && !/^<.*>$/.test(v.trim()));
    const provider = (process.env.STORAGE_PROVIDER || env.storage.provider || 'local').trim();
    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || env.storage.cloudinary.cloudName || '').trim();
    const apiKey = (process.env.CLOUDINARY_API_KEY || env.storage.cloudinary.apiKey || '').trim();
    const apiSecret = (process.env.CLOUDINARY_API_SECRET || env.storage.cloudinary.apiSecret || '').trim();

    if (provider === 'cloudinary') {
      if (!isConfiguredVal(cloudName) || !isConfiguredVal(apiKey) || !isConfiguredVal(apiSecret)) {
        const error = new Error('Cloud image storage is not configured');
        error.statusCode = 503;
        throw error;
      }
      return await this._uploadToCloudinary(cleanFile, {
        cloudName,
        apiKey,
        apiSecret,
        folder: (process.env.CLOUDINARY_FOLDER || env.storage.cloudinary.folder || 'wareshop/providers').trim(),
      });
    }

    if (isProduction) {
      const error = new Error('Local disk image storage is disabled in production');
      error.statusCode = 503;
      throw error;
    }

    return await this._uploadToLocalStorage(cleanFile);
  },

  async _uploadToLocalStorage(file) {
    const uploadDir = env.storage.uploadDir;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const extMap = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = extMap[file.mimetype] || '.jpg';
    const uniqueKey = `shop-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const targetPath = path.join(uploadDir, uniqueKey);

    await fs.promises.writeFile(targetPath, file.buffer);
    logger.info('Image saved to local storage', { key: uniqueKey, size: file.size });

    return {
      url: `/uploads/${uniqueKey}`,
      publicId: uniqueKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    };
  },

  async _uploadToCloudinary(file, { cloudName, apiKey, apiSecret, folder }) {
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = {
      folder,
      timestamp,
    };
    const signature = createCloudinarySignature(paramsToSign, apiSecret);

    const base64DataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const body = new URLSearchParams({
      file: base64DataUri,
      api_key: apiKey,
      timestamp: String(timestamp),
      folder,
      signature,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
        signal: controller.signal,
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.secure_url) {
        const errMsg = result?.error?.message || 'Cloudinary image upload failed';
        logger.error('Cloudinary upload failure', { error: errMsg });
        const err = new Error('Cloud image storage upload failed');
        err.statusCode = 502;
        throw err;
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
      };
    } finally {
      clearTimeout(timeout);
    }
  },

  async deleteImage(publicId) {
    if (!publicId || typeof publicId !== 'string') return;

    const isProduction = process.env.NODE_ENV === 'production' || env.isProduction;
    const isConfiguredVal = (v) => Boolean(v && !/^<.*>$/.test(v.trim()));
    const provider = (process.env.STORAGE_PROVIDER || env.storage.provider || 'local').trim();
    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || env.storage.cloudinary.cloudName || '').trim();
    const apiKey = (process.env.CLOUDINARY_API_KEY || env.storage.cloudinary.apiKey || '').trim();
    const apiSecret = (process.env.CLOUDINARY_API_SECRET || env.storage.cloudinary.apiSecret || '').trim();

    if (provider === 'cloudinary') {
      if (!isConfiguredVal(cloudName) || !isConfiguredVal(apiKey) || !isConfiguredVal(apiSecret)) {
        logger.warn('Skipping Cloudinary asset deletion: Cloudinary credentials not configured', {
          publicId,
        });
        return;
      }
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = createCloudinarySignature({ public_id: publicId, timestamp }, apiSecret);
        const body = new URLSearchParams({
          public_id: publicId,
          api_key: apiKey,
          timestamp: String(timestamp),
          signature,
        });
        await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
      } catch (err) {
        logger.warn('Failed to delete Cloudinary asset', { publicId, error: err.message });
      }
    } else if (!isProduction) {
      // Prevent path traversal on local delete (development/test only)
      const safeBasename = path.basename(publicId);
      const localFile = path.join(env.storage.uploadDir, safeBasename);
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
