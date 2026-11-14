import crypto from 'crypto';

/**
 * Attaches a unique Request ID to incoming requests for audit and tracing
 */
export function requestIdMiddleware(req, res, next) {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
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
    // Drop keys that attempt mongo operator injection
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

export default { requestIdMiddleware, noSqlSanitizerMiddleware, sanitizeNoSql };
