/**
 * Base API client for ERP OData V4 API
 * Makes direct calls to DEV API from client
 * Auth APIs go through Next.js server to PROD API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL_DEV || '';
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME || '';
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD || '';

/**
 * Creates Basic Auth header for direct API calls
 */
function createAuthHeaders(): HeadersInit {
  const credentials = `${API_USERNAME}:${API_PASSWORD}`;
  const encodedCredentials = btoa(credentials);
  
  return {
    'Authorization': `Basic ${encodedCredentials}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

export interface ApiConfig {
  baseUrl: string;
  company: string;
  username: string;
  password: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

/**
 * Makes a direct API request to DEV API
 * Uses Basic Auth from environment variables
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...createAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = {
        message: `API request failed: ${response.statusText}`,
        status: response.status,
      };
      throw error;
    }

    // Handle 204 No Content response (success but no body)
    if (response.status === 204) {
      return null as T;
    }

    // Check if response has content to parse
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    // If no JSON content, return null
    return null as T;
  } catch (error) {
    if (error instanceof Error) {
      throw {
        message: error.message,
        code: 'NETWORK_ERROR',
      } as ApiError;
    }
    throw error;
  }
}

/**
 * GET request helper
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  endpoint: string,
  data: unknown
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T>(
  endpoint: string,
  data: unknown
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

