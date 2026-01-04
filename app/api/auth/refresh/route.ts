/**
 * Refresh Token API Route
 * Refreshes access token using refresh token
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRefreshTokenCookie, setAccessTokenCookie, clearAuthCookies } from '@/lib/auth/cookies';
import { verifyToken, generateAccessToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = await getRefreshTokenCookie();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token found' },
        { status: 401 }
      );
    }

    // Verify refresh token
    const payload = verifyToken(refreshToken);

    if (payload.type !== 'refresh') {
      await clearAuthCookies();
      return NextResponse.json(
        { error: 'Invalid token type' },
        { status: 401 }
      );
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(payload.userID, payload.username);
    await setAccessTokenCookie(newAccessToken);

    return NextResponse.json({
      success: true,
      userID: payload.userID,
      username: payload.username,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Clear cookies on error
    await clearAuthCookies();

    if (error instanceof Error && error.message === 'Token expired') {
      return NextResponse.json(
        { error: 'Session expired. Please login again.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 401 }
    );
  }
}

