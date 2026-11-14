import mongoose from 'mongoose';
import env from '../config/env.js';

export const healthController = {
  getHealth(req, res) {
    const dbStateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    const isConnected = mongoose.connection.readyState === 1;

    return res.status(200).json({
      status: 'ok',
      service: 'konnevia-backend',
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: dbStateMap[mongoose.connection.readyState] || 'unknown',
        connected: isConnected,
      },
    });
  },
};

export default healthController;
