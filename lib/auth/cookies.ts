/**
 * Cookie utilities for authentication
 * Handles setting and getting httpOnly cookies for tokens
 * Note: In Next.js 15+, cookies() returns a Promise and must be awaited
 */

import { cookies } from 'next/headers';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

/**
 * Set access token cookie
 */
export async function setAccessTokenCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, token, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60, // 15 minutes in seconds
  });
}

/**
 * Set refresh token cookie
 * @param token - The refresh token
 * @param rememberMe - If true, sets expiry to 30 days, otherwise 7 days
 */
export async function setRefreshTokenCookie(token: string, rememberMe: boolean = false) {
  const cookieStore = await cookies();
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // 30 days or 7 days
  cookieStore.set(REFRESH_TOKEN_COOKIE, token, {
    ...COOKIE_OPTIONS,
    maxAge,
  });
}

/**
 * Get access token from cookie
 */
export async function getAccessTokenCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}

/**
 * Get refresh token from cookie
 */
export async function getRefreshTokenCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
}

/**
 * Clear all auth cookies
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

/**
 * Set both access and refresh tokens
 * @param accessToken - The access token
 * @param refreshToken - The refresh token
 * @param rememberMe - If true, refresh token expires in 30 days, otherwise 7 days
 */
export async function setAuthCookies(accessToken: string, refreshToken: string, rememberMe: boolean = false) {
  await setAccessTokenCookie(accessToken);
  await setRefreshTokenCookie(refreshToken, rememberMe);
}

