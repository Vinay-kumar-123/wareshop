export const successResponse = (
  res,
  data = null,
  message = 'Success',
  statusCode = 200,
  meta = null
) => {
  const payload = {
    success: true,
    message,
    data,
  };
  if (meta && typeof meta === 'object') {
    Object.assign(payload, meta);
  }
  return res.status(statusCode).json(payload);
};

export const errorResponse = (
  res,
  message = 'An error occurred',
  statusCode = 500,
  errors = null,
  code = null
) => {
  const body = {
    success: false,
    message,
  };
  if (code && typeof code === 'string') {
    body.code = code;
  }
  if (errors) {
    body.errors = errors;
  }
  return res.status(statusCode).json(body);
};
