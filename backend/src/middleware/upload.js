import multer from 'multer';
import env from '../config/env.js';
import { ALLOWED_MIME_TYPES } from '../services/storageService.js';
import { errorResponse } from '../utils/apiResponse.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Validate MIME type
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    error.message = 'Unsupported file format. Please upload a JPEG, PNG, or WebP image.';
    cb(error, false);
  }
};

const maxSizeBytes = (env.storage?.maxFileSizeMb || 5) * 1024 * 1024;

export const upload = multer({
  storage,
  limits: {
    fileSize: maxSizeBytes,
    files: 1,
  },
  fileFilter,
});

/**
 * Middleware wrapper for single shop image upload
 */
export function handleShopImageUpload(req, res, next) {
  const uploadSingle = upload.single('shopImage');

  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return errorResponse(
          res,
          `Image is too large. Maximum allowed size is ${env.storage.maxFileSizeMb}MB.`,
          400
        );
      }
      return errorResponse(res, err.message || 'File upload error', 400);
    } else if (err) {
      return errorResponse(res, err.message || 'File processing failed', 400);
    }
    next();
  });
}

export default handleShopImageUpload;
