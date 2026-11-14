const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

// Default request timeout in milliseconds (15s for file uploads or slow cold starts)
const REQUEST_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Retrieve stored admin session token if available
  let authToken = null;
  try {
    authToken = localStorage.getItem('konnevia_admin_token');
  } catch {
    // LocalStorage inaccessible (e.g. strict private browsing)
  }

  const defaultHeaders = {};
  // Only set application/json if body is not FormData
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  if (authToken && !options.headers?.Authorization && !options.headers?.authorization) {
    defaultHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  const config = {
    method: options.method || 'GET',
    credentials: 'include', // Ensures cookies are transmitted in cross-origin / same-origin requests
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    ...options,
    signal: controller.signal,
  };

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      data = await response.text().catch(() => null);
    }

    if (!response.ok) {
      const errorMessage = data?.message || `HTTP Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') {
      throw new ApiError(
        'The request timed out. Please check your connection and try again.',
        0
      );
    }
    throw new ApiError(
      'Unable to connect to the KONNEVIA server. Please verify your connection or try again shortly.',
      0
    );
  }
}

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options = {}) =>
    request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
  put: (endpoint, body, options = {}) =>
    request(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
  patch: (endpoint, body, options = {}) =>
    request(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
  delete: (endpoint, options = {}) => request(endpoint, { method: 'DELETE', ...options }),
  upload: (endpoint, formData, options = {}) =>
    request(endpoint, {
      method: 'POST',
      body: formData,
      ...options,
    }),
};

export default api;
