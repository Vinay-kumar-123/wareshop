import app from './src/app.js';
import env from './src/config/env.js';
import connectDB from './src/config/db.js';
import authService from './src/services/authService.js';
import logger from './src/utils/logger.js';

let server;

const startServer = async () => {
  // Connect to MongoDB Atlas
  const conn = await connectDB();

  // If DB connected, ensure initial Super Admin is safely bootstrapped
  if (conn) {
    try {
      await authService.bootstrapAdmin();
    } catch (bootstrapErr) {
      logger.warn(`Admin bootstrap notice: ${bootstrapErr.message}`);
    }
  }

  server = app.listen(env.port, () => {
    logger.info(`KONNEVIA Backend API running on port ${env.port} [${env.nodeEnv}]`);
    logger.info(`Health check available at http://localhost:${env.port}/health`);
    logger.info(`API v1 root at http://localhost:${env.port}/api/v1`);
  });

  // Graceful shutdown handling
  const handleShutdown = (signal) => {
    logger.info(`${signal} received. Initiating graceful shutdown...`);
    if (server) {
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer().catch((err) => {
  logger.error('Failed to start server', { error: err.message, stack: err.stack });
  process.exit(1);
});
