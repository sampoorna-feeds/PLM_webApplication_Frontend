/**
 * Authentication API Service
 * Handles authentication-related API calls to ERP
 * Note: These are now called directly from client (for static hosting)
 */

import { apiPost } from '@/lib/api/client';

const COMPANY = process.env.NEXT_PUBLIC_API_COMPANY || 'Sampoorna Feeds Pvt. Ltd';

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
 * Calls ERP API directly from client
 * Uses system credentials for Basic Auth, user credentials in payload
 */
export async function loginUser(userID: string, password: string): Promise<LoginResponse> {
  const endpoint = `/API_WebVesionLoginWebuser?Company=${encodeURIComponent(COMPANY)}`;
  const payload: LoginRequest = { userID, password };
  
  // Use system credentials for Basic Auth
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL_DEV || '';
  const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME || '';
  const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD || '';
  const authString = `${API_USERNAME}:${API_PASSWORD}`;
  const encodedCredentials = btoa(authString);
  
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${encodedCredentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // Try to extract error message
    try {
      const errorData = await response.json();
      if (errorData.error?.message) {
        throw new Error(errorData.error.message);
      }
      if (errorData.message) {
        throw new Error(errorData.message);
      }
    } catch {
      // If we can't parse error, use status text
    }
    throw new Error(`API request failed: ${response.statusText}`);
  }

  if (response.status === 204) {
    // 204 No Content - return a default response
    return {
      '@odata.context': '',
      value: 'OK',
    } as LoginResponse;
  }

  return response.json();
}

/**
 * Reset password
 * Calls ERP API directly from client using stored credentials
 */
export async function resetPassword(
  userID: string,
  oldPassword: string,
  newPassword: string
): Promise<ResetPasswordResponse> {
  const endpoint = `/API_ResetPasswordWebuser?Company=${encodeURIComponent(COMPANY)}`;
  const payload: ResetPasswordRequest = { userID, oldPassword, newPassword };
  return apiPost<ResetPasswordResponse>(endpoint, payload);
}

/**
 * Forgot password
 * Calls ERP API directly from client
 * Uses system credentials for Basic Auth
 */
export async function forgotPassword(
  userID: string,
  registredModileNo: string
): Promise<ForgotPasswordResponse> {
  const endpoint = `/API_ForgetPasswordForWebUser?Company=${encodeURIComponent(COMPANY)}`;
  const payload: ForgotPasswordRequest = { userID, registredModileNo };
  
  // Use system credentials for Basic Auth
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL_DEV || '';
  const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME || '';
  const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD || '';
  const authString = `${API_USERNAME}:${API_PASSWORD}`;
  const encodedCredentials = btoa(authString);
  
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${encodedCredentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  if (response.status === 204) {
    // 204 No Content - return a default response
    return {
      '@odata.context': '',
      value: 'Password has been sent your registered mobile no.',
    } as ForgotPasswordResponse;
  }

  return response.json();
}
