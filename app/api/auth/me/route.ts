/**
 * Get Current User API Route
 * Returns current user info from token
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenCookie } from '@/lib/auth/cookies';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessTokenCookie();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(accessToken);

    if (payload.type !== 'access') {
      return NextResponse.json(
        { error: 'Invalid token type' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      userID: payload.userID,
      username: payload.username,
      isAuthenticated: true,
    });
  } catch (error) {
    console.error('Get user error:', error);

    if (error instanceof Error && error.message === 'Token expired') {
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

