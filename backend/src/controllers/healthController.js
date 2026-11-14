import mongoose from 'mongoose';

const dbStateMap = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export const healthController = {
  /**
   * Liveness probe: confirms the HTTP server process is responsive.
   */
  getLiveness(req, res) {
    return res.status(200).json({
      status: 'alive',
      service: 'wareshop-backend',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    });
  },

  /**
   * Readiness probe: confirms MongoDB connection is ready to serve traffic.
   * Returns HTTP 503 when database is not connected.
   */
  getReadiness(req, res) {
    const readyState = mongoose.connection.readyState;
    const isConnected = readyState === 1;

    return res.status(isConnected ? 200 : 503).json({
      status: isConnected ? 'ok' : 'unavailable',
      ready: isConnected,
      service: 'wareshop-backend',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStateMap[readyState] || 'unknown',
        connected: isConnected,
      },
    });
  },

  /**
   * Combined health check: never returns healthy (200/ok) when database readiness fails.
   */
  getHealth(req, res) {
    const readyState = mongoose.connection.readyState;
    const isConnected = readyState === 1;

    return res.status(isConnected ? 200 : 503).json({
      status: isConnected ? 'ok' : 'unavailable',
      ready: isConnected,
      service: 'wareshop-backend',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: dbStateMap[readyState] || 'unknown',
        connected: isConnected,
      },
    });
  },
};

export default healthController;
