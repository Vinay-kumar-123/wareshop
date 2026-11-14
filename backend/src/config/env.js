import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Search for .env in current working directory and fallback to backend/.env
const candidateEnvPaths = [
  process.env.NODE_ENV === 'test' ? path.resolve(process.cwd(), '.env.test') : null,
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
].filter(Boolean);

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

export const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv,
  isProduction,
  isDevelopment: nodeEnv === 'development',
  isTest: nodeEnv === 'test',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/konnevia',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000',

  // Owner Admin Credentials
  admin: {
    email: (process.env.ADMIN_EMAIL || 'admin@konnevia.in').trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'Konnevia@Admin2026!',
    jwtSecret: process.env.JWT_SECRET || 'konnevia-secret-superadmin-key-2026',
    autoRotate: process.env.ADMIN_AUTO_ROTATE_PASSWORD === 'true',
  },

  // Image Upload & Storage Configuration
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local', // 'local' or 'cloudinary'
    uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '..', '..', 'uploads'),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5,
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
      folder: process.env.CLOUDINARY_FOLDER || 'konnevia/providers',
    },
  },
};

export default env;
