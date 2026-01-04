/**
 * Login API Route
 * Handles user login, validates credentials, generates tokens, and sets cookies
 */

import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/api/services/auth.service';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { setAuthCookies } from '@/lib/auth/cookies';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userID, password, rememberMe = false } = body;

    if (!userID || !password) {
      return NextResponse.json(
        { error: 'UserID and password are required' },
        { status: 400 }
      );
    }

    // Call ERP login API
    const response = await loginUser(userID, password);

    // Check if login was successful (ERP returns "OK" in value field)
    if (response.value !== 'OK') {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate tokens
    const accessToken = generateAccessToken(userID, userID);
    const refreshToken = generateRefreshToken(userID, userID);

    // Set cookies with rememberMe option
    await setAuthCookies(accessToken, refreshToken, rememberMe === true);

    // Return success response
    return NextResponse.json({
      success: true,
      userID,
      username: userID,
    });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof Error) {
      // Check if it's an API error
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}

