/**
 * Forgot Password API Route
 * Handles forgot password request (public endpoint)
 */

import { NextRequest, NextResponse } from 'next/server';
import { forgotPassword } from '@/lib/api/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userID, registredModileNo } = body;

    if (!userID || !registredModileNo) {
      return NextResponse.json(
        { error: 'UserID and registered mobile number are required' },
        { status: 400 }
      );
    }

    // Call ERP forgot password API
    const response = await forgotPassword(userID, registredModileNo);

    // Check if request was successful
    if (response.value !== 'Password has been sent your registered mobile no.') {
      return NextResponse.json(
        { error: 'Failed to send password' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: response.value,
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    return NextResponse.json(
      { error: 'Failed to process forgot password request. Please try again.' },
      { status: 500 }
    );
  }
}

