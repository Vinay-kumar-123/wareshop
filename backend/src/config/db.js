import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';
import { errorResponse } from '../utils/apiResponse.js';

// Disable command buffering globally so database outages fail fast with 503 instead of 10s hangs
mongoose.set('bufferCommands', false);

export function redactMongoUri(text) {
  if (!text) return '';
  return String(text).replace(/mongodb(?:\+srv)?:\/\/[^\s"']+/gi, '<redacted-mongodb-uri>');
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

export function requireDatabaseReady(req, res, next) {
  if (!isDatabaseReady()) {
    return errorResponse(
      res,
      'Service temporarily unavailable. Database connection is not ready.',
      503
    );
  }
  return next();
}

let listenersAttached = false;

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    logger.info('Mongoose connection state: connected');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('Mongoose connection state: disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('Mongoose connection state: reconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('Mongoose connection error', { error: redactMongoUri(err?.message) });
  });
}

attachConnectionListeners();

export const connectDB = async () => {
  attachConnectionListeners();

  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false,
    };
    if (env.mongodbDbName) {
      options.dbName = env.mongodbDbName;
    }

    const conn = await mongoose.connect(env.mongodbUri, options);
    logger.info(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${redactMongoUri(error.message)}`);
    if (env.isProduction) {
      logger.error('Exiting due to failed production database connection');
      process.exit(1);
    } else {
      logger.warn('Running in non-production mode without active MongoDB connection');
      return null;
    }
  }
};

export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected cleanly');
    }
  } catch (error) {
    logger.error(`Error disconnecting MongoDB: ${redactMongoUri(error.message)}`);
  }
};

export default connectDB;
