/**
 * Base API client for ERP OData V4 API
 * Handles authentication and request configuration
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const API_COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || '';
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME || '';
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD || '';

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
 * Creates authentication headers for Basic Auth
 * Format: username:password encoded in base64
 */
function createAuthHeaders(config: ApiConfig): HeadersInit {
  const credentials = `${config.username}:${config.password}`;
  const encodedCredentials = btoa(credentials);
  
  return {
    'Authorization': `Basic ${encodedCredentials}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

/**
 * Base API client configuration
 */
export const apiConfig: ApiConfig = {
  baseUrl: API_BASE_URL,
  company: API_COMPANY,
  username: API_USERNAME,
  password: API_PASSWORD,
};

/**
 * Makes an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${apiConfig.baseUrl}${endpoint}`;
  const headers = createAuthHeaders(apiConfig);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
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

