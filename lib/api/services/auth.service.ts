/**
 * Authentication API Service
 * Handles authentication-related API calls to ERP
 * Note: These are called server-side from API routes, not from client
 */

// Use DEV API for authentication-related calls
const ERP_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL_DEV || '';
const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || 'Sampoorna Feeds Pvt. Ltd';
const ERP_API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME || '';
const ERP_API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD || '';

/**
 * Make direct API call to ERP (server-side only)
 */
async function apiPostDirect<T>(endpoint: string, data: unknown): Promise<T> {
  const url = `${ERP_API_BASE_URL}${endpoint}`;
  const credentials = `${ERP_API_USERNAME}:${ERP_API_PASSWORD}`;
  const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export interface LoginRequest {
  userID: string;
  password: string;
}

export interface LoginResponse {
  '@odata.context': string;
  value: string;
}

export interface ResetPasswordRequest {
  userID: string;
  oldPassword: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  '@odata.context': string;
  value: string;
}

export interface ForgotPasswordRequest {
  userID: string;
  registredModileNo: string;
}

export interface ForgotPasswordResponse {
  '@odata.context': string;
  value: string;
}

/**
 * Login user
 */
export async function loginUser(userID: string, password: string): Promise<LoginResponse> {
  const endpoint = `/API_WebVesionLoginWebuser?Company=${encodeURIComponent(COMPANY)}`;
  const payload: LoginRequest = { userID, password };
  return apiPostDirect<LoginResponse>(endpoint, payload);
}

/**
 * Reset password
 */
export async function resetPassword(
  userID: string,
  oldPassword: string,
  newPassword: string
): Promise<ResetPasswordResponse> {
  const endpoint = `/API_ResetPasswordWebuser?Company=${encodeURIComponent(COMPANY)}`;
  const payload: ResetPasswordRequest = { userID, oldPassword, newPassword };
  return apiPostDirect<ResetPasswordResponse>(endpoint, payload);
}

/**
 * Forgot password
 */
export async function forgotPassword(
  userID: string,
  registredModileNo: string
): Promise<ForgotPasswordResponse> {
  const endpoint = `/API_ForgetPasswordForWebUser?Company=${encodeURIComponent(COMPANY)}`;
  const payload: ForgotPasswordRequest = { userID, registredModileNo };
  return apiPostDirect<ForgotPasswordResponse>(endpoint, payload);
}
