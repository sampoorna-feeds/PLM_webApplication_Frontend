'use client';

/**
 * Authentication Context
 * Provides userID and authentication state throughout the app
 * For static hosting - checks localStorage/sessionStorage instead of server API
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getAuthCredentials, clearAuthCredentials } from '@/lib/auth/storage';

interface AuthContextType {
  userID: string | null;
  username: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userID, setUserID] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Check authentication status by checking localStorage/sessionStorage
   */
  const checkAuth = useCallback(async () => {
    try {
      const credentials = getAuthCredentials();
      
      if (credentials) {
        setUserID(credentials.userID);
        setUsername(credentials.userID); // Use userID as username
        setIsAuthenticated(true);
      } else {
        setUserID(null);
        setUsername(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUserID(null);
      setUsername(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh authentication
   */
  const refreshAuth = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  /**
   * Logout
   * Clears credentials from storage and resets auth state
   */
  const logout = useCallback(async () => {
    try {
      clearAuthCredentials();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUserID(null);
      setUsername(null);
      setIsAuthenticated(false);
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextType = {
    userID,
    username,
    isAuthenticated,
    isLoading,
    refreshAuth,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

