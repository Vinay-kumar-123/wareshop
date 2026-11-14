const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';

// Default request timeout in milliseconds (15s for file uploads or slow cold starts)
const REQUEST_TIMEOUT_MS = 15_000;

// In-memory only admin Bearer token (never written to localStorage)
let inMemoryAuthToken = null;

// In-memory provider Bearer token (paired with HttpOnly wareshop_provider_session cookie)
let inMemoryProviderToken = null;

export function setAuthToken(token) {
  inMemoryAuthToken = typeof token === 'string' && token.trim() ? token.trim() : null;
}

export function clearAuthToken() {
  inMemoryAuthToken = null;
}

export function getAuthToken() {
  return inMemoryAuthToken;
}

export function setProviderToken(token) {
  inMemoryProviderToken = typeof token === 'string' && token.trim() ? token.trim() : null;
}

export function clearProviderToken() {
  inMemoryProviderToken = null;
}

export function getProviderToken() {
  return inMemoryProviderToken;
}

export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function isProviderEndpoint(endpoint) {
  return (
    endpoint.startsWith('/provider-auth') ||
    endpoint.startsWith('/provider-portal') ||
    endpoint.startsWith('/leads/partner')
  );
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const defaultHeaders = {
    'X-Requested-With': 'XMLHttpRequest',
  };

  // Only set application/json if body is not FormData
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const activeToken = isProviderEndpoint(endpoint) ? inMemoryProviderToken : inMemoryAuthToken;

  if (activeToken && !options.headers?.Authorization && !options.headers?.authorization) {
    defaultHeaders['Authorization'] = `Bearer ${activeToken}`;
  }

  const config = {
    method: options.method || 'GET',
    credentials: 'include',
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
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
      'Unable to connect to the WARESHOP server. Please verify your connection or try again shortly.',
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
