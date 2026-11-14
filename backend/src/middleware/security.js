import crypto from 'crypto';
import mongoose from 'mongoose';
import { errorResponse } from '../utils/apiResponse.js';

const SAFE_REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;

/**
 * Attaches a validated unique Request ID to incoming requests for audit and tracing.
 * Prevents header/log injection from untrusted x-request-id values.
 */
export function requestIdMiddleware(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const reqId =
    typeof incoming === 'string' && SAFE_REQUEST_ID_REGEX.test(incoming.trim())
      ? incoming.trim()
      : crypto.randomUUID();
  req.id = reqId;
  res.setHeader('x-request-id', reqId);
  next();
}

/**
 * Prevents NoSQL operator injection by stripping out '$' and '.' from object keys
 */
export function sanitizeNoSql(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeNoSql);
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = typeof value === 'object' && value !== null ? sanitizeNoSql(value) : value;
  }
  return clean;
}

export function noSqlSanitizerMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNoSql(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeNoSql(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeNoSql(req.params);
  }
  next();
}

/**
 * Fail-closed database readiness middleware for API routes.
 * Immediately returns HTTP 503 if MongoDB is disconnected instead of hanging or throwing 500.
 */
export function requireDatabaseReady(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return errorResponse(
      res,
      'Service temporarily unavailable. Database connection is not ready.',
      503
    );
  }
  next();
}

/**
 * Escapes regex metacharacters to prevent ReDoS / regex injection in MongoDB queries.
 */
export function escapeRegex(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 120).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default {
  requestIdMiddleware,
  noSqlSanitizerMiddleware,
  sanitizeNoSql,
  requireDatabaseReady,
  escapeRegex,
};
