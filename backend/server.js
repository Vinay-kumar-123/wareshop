import app from './src/app.js';
import env, { validateEnv } from './src/config/env.js';
import connectDB, { disconnectDB } from './src/config/db.js';
import authService from './src/services/authService.js';
import logger from './src/utils/logger.js';

let server;
let isShuttingDown = false;

const startServer = async () => {
  // 1. Validate environment configuration before starting
  validateEnv(env);

  // 2. Connect to MongoDB Atlas
  const conn = await connectDB();

  // 3. In development only, optionally provision initial admin if valid credentials are configured
  if (conn && env.isDevelopment && env.admin.email && env.admin.password) {
    try {
      await authService.bootstrapAdmin();
    } catch (bootstrapErr) {
      logger.warn(`Admin bootstrap notice: ${bootstrapErr.message}`);
    }
  }

  server = app.listen(env.port, () => {
    logger.info(`WARESHOP Backend API running on port ${env.port} [${env.nodeEnv}]`);
    logger.info(`Health check available at http://localhost:${env.port}/health`);
    logger.info(`API v1 root at http://localhost:${env.port}/api/v1`);
  });

  // Graceful shutdown handling
  const handleShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`${signal} received. Initiating graceful shutdown...`);

    const forceExitTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out after 10s. Forcing exit.');
      process.exit(1);
    }, 10_000);
    forceExitTimer.unref();

    try {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
        logger.info('HTTP server closed.');
      }
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      logger.error('Error during graceful shutdown', { error: err.message });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });
};

startServer().catch((err) => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});
