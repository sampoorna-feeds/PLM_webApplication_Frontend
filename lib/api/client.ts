/**
 * Base API client for ERP OData V4 API
 * Makes direct calls to ERP API from client
 * Uses system credentials from environment variables for Basic Auth
 * User credentials are stored for login validation only
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL_DEV || "";
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME || "";
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD || "";

/**
 * Creates Basic Auth header for direct API calls
 * Uses system credentials from environment variables
 */
function createAuthHeaders(): HeadersInit {
  // Use system credentials from environment variables
  const credentials = `${API_USERNAME}:${API_PASSWORD}`;
  const encodedCredentials = btoa(credentials);

  return {
    Authorization: `Basic ${encodedCredentials}`,
    "Content-Type": "application/json",
    Accept: "application/json",
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
  details?: string;
}

/**
 * Makes a direct API request to ERP API
 * Uses Basic Auth from environment variables (system credentials)
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
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
      // Try to extract detailed error message from response
      let errorMessage = `API request failed: ${response.statusText}`;
      let errorCode: string | undefined;
      let errorDetails: string | undefined;

      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();

          // Handle OData error format
          if (errorData.error) {
            errorMessage = errorData.error.message || errorMessage;
            errorCode = errorData.error.code;
            errorDetails = JSON.stringify(errorData.error, null, 2);
          }
          // Handle custom error format
          else if (errorData.message) {
            errorMessage = errorData.message;
            errorCode = errorData.code;
            if (errorData.details) {
              errorDetails =
                typeof errorData.details === "string"
                  ? errorData.details
                  : JSON.stringify(errorData.details, null, 2);
            }
          }
          // Handle ERP-specific error format
          else if (errorData.value) {
            errorMessage = String(errorData.value);
          }
          // If response is an object, stringify it for details
          else if (typeof errorData === "object") {
            errorDetails = JSON.stringify(errorData, null, 2);
          }
        } else {
          // Try to get text response
          const textResponse = await response.text();
          if (textResponse) {
            errorMessage = textResponse;
            errorDetails = textResponse;
          }
        }
      } catch (parseError) {
        // If we can't parse the error response, use the default message
        console.error("Error parsing error response:", parseError);
      }

      const error: ApiError = {
        message: errorMessage,
        status: response.status,
        code: errorCode,
      };

      // Attach details to error object for access
      (error as ApiError & { details?: string }).details = errorDetails;

      throw error;
    }

    // Handle 204 No Content response (success but no body)
    if (response.status === 204) {
      return null as T;
    }

    // Check if response has content to parse
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    // If no JSON content, return null
    return null as T;
  } catch (error) {
    if (error instanceof Error) {
      throw {
        message: error.message,
        code: "NETWORK_ERROR",
      } as ApiError;
    }
    throw error;
  }
}

/**
 * GET request helper
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: "GET" });
}

/**
 * POST request helper
 */
export async function apiPost<T>(endpoint: string, data: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T>(endpoint: string, data: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
      "If-Match": "*", // Required for OData PATCH requests
    },
  });
}

/**
 * DELETE request helper
 * @param endpoint - API endpoint
 * @param data - Optional request body data
 */
export async function apiDelete<T>(
  endpoint: string,
  data?: unknown,
): Promise<T> {
  const options: RequestInit = { method: "DELETE" };
  if (data !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(data);
  }
  return apiRequest<T>(endpoint, options);
}
