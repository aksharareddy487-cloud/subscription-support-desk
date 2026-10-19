/**
 * Unified API Client with Automatic Session Cookie and CSRF Handling.
 * For use in React by Dodda Ashwith (#1) and other frontend team members.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

let cachedCsrfToken = null;

/**
 * Fetches the CSRF token from the server if not already cached.
 */
export const getCsrfToken = async () => {
  if (cachedCsrfToken) return cachedCsrfToken;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
      method: 'GET',
      credentials: 'include', // Ensures session cookie is sent/received
    });
    if (res.ok) {
      const data = await res.json();
      cachedCsrfToken = data.csrfToken;
      return cachedCsrfToken;
    }
  } catch (err) {
    console.warn('[CSRF Fetch Failed]:', err.message);
  }
  return null;
};

/**
 * Custom fetch wrapper with credentials and CSRF header injected.
 */
export const apiClient = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Add CSRF token for mutating requests
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = await getCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include', // Crucial for Express session cookie
  });

  const contentType = response.headers.get('content-type');
  const data = contentType && contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    // If CSRF expired or invalid, invalidate cached token
    if (response.status === 403 && data?.code === 'CSRF_VALIDATION_FAILED') {
      cachedCsrfToken = null;
    }
    const error = new Error(data?.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
