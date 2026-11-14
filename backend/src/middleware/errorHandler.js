import logger from '../utils/logger.js';
import { errorResponse } from '../utils/apiResponse.js';

export const errorHandler = (err, req, res, next) => {
  // 1. CORS rejection -> 403 Forbidden
  if (err.code === 'ERR_CORS_BLOCKED' || (err.message && err.message.startsWith('CORS blocked'))) {
    return errorResponse(res, 'Origin is not permitted by CORS policy.', 403);
  }

  // 2. JSON parse error -> 400 Bad Request
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    return errorResponse(res, 'Malformed JSON request body.', 400);
  }

  // 3. Mongoose CastError (invalid ObjectId) -> 404 Not Found / 400 Bad Request
  if (err.name === 'CastError') {
    if (err.kind === 'ObjectId') {
      return errorResponse(res, 'Requested resource was not found.', 404);
    }
    return errorResponse(res, `Invalid value provided for field "${err.path}".`, 400);
  }

  // 4. Mongoose ValidationError -> 400 Bad Request
  if (err.name === 'ValidationError') {
    const fieldErrors = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return errorResponse(
      res,
      fieldErrors[0]?.message || 'Validation failed.',
      400,
      fieldErrors.length > 0 ? fieldErrors : null
    );
  }

  // 5. MongoDB Duplicate Key Error (E11000) -> 409 Conflict
  if (err.code === 11000) {
    return errorResponse(
      res,
      'A record with the provided unique value already exists.',
      409
    );
  }

  // 6. Disconnected / buffering Mongo errors -> 503 Service Unavailable
  if (
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoNotConnectedError' ||
    (err.message && /not connected|buffering timed out|client must be connected/i.test(err.message))
  ) {
    return errorResponse(
      res,
      'Service temporarily unavailable. Please try again shortly.',
      503
    );
  }

  const statusCode = err.statusCode || err.status || 500;

  logger.error('Request Error', {
    reqId: req.id,
    statusCode,
    message: err.message,
    url: req.originalUrl,
    method: req.method,
  });

  const message =
    statusCode >= 500
      ? 'An unexpected server error occurred. Please try again later.'
      : err.message || 'Request could not be processed.';

  return errorResponse(res, message, statusCode);
};

export const notFoundHandler = (req, res) => {
  return errorResponse(res, 'Requested endpoint was not found.', 404);
};
