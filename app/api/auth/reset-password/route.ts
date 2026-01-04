/**
 * Reset Password API Route
 * Handles password reset for authenticated users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenCookie } from '@/lib/auth/cookies';
import { verifyToken } from '@/lib/auth/jwt';
import { resetPassword } from '@/lib/api/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const accessToken = await getAccessTokenCookie();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyToken(accessToken);
    if (payload.type !== 'access') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Old password and new password are required' },
        { status: 400 }
      );
    }

    // Call ERP reset password API
    const response = await resetPassword(payload.userID, oldPassword, newPassword);

    // Check if reset was successful
    if (response.value !== 'Password has been Sucussfully reset') {
      return NextResponse.json(
        { error: 'Password reset failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: response.value,
    });
  } catch (error) {
    console.error('Reset password error:', error);

    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Invalid old password' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Password reset failed. Please try again.' },
      { status: 500 }
    );
  }
}

