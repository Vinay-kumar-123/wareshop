import ActivityLog from '../models/ActivityLog.js';
import logger from '../utils/logger.js';

export async function logAdminActivity({
  adminEmail,
  action,
  targetType,
  targetId = '',
  details = {},
  req = null,
}) {
  try {
    const ip = req ? req.ip || req.socket?.remoteAddress || '' : '';
    const userAgent = req ? req.headers['user-agent'] || '' : '';

    // Mask sensitive details if any
    const safeDetails = { ...details };
    delete safeDetails.password;
    delete safeDetails.token;
    delete safeDetails.sessionToken;
    delete safeDetails.sessionTokenHash;

    await ActivityLog.create({
      adminEmail: (adminEmail || 'system').toLowerCase(),
      action,
      targetType,
      targetId: String(targetId),
      details: safeDetails,
      ip,
      userAgent,
    });
  } catch (err) {
    logger.warn('Failed to record administrative activity log', { error: err.message, action });
  }
}

export default logAdminActivity;
