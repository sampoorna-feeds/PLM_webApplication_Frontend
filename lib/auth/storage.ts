/**
 * Client-side authentication storage utilities
 * Handles storing and retrieving user credentials from localStorage/sessionStorage
 * For static hosting - no server-side cookies needed
 */

const AUTH_STORAGE_KEY = 'sf_auth_credentials';
const USERNAME_STORAGE_KEY = 'sf_remembered_username';

export interface AuthCredentials {
  userID: string;
  password: string;
}

/**
 * Set authentication credentials in storage
 * Uses sessionStorage for better security (clears on tab close)
 * Uses localStorage if rememberMe is true (persists across sessions)
 */
export function setAuthCredentials(
  userID: string,
  password: string,
  rememberMe: boolean = false
): void {
  if (typeof window === 'undefined') {
    return; // Server-side, do nothing
  }

  const storage = rememberMe ? localStorage : sessionStorage;
  const credentials: AuthCredentials = { userID, password };
  
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(credentials));
  
  // Also store username separately for "Remember Me" functionality
  if (rememberMe) {
    localStorage.setItem(USERNAME_STORAGE_KEY, userID);
  } else {
    localStorage.removeItem(USERNAME_STORAGE_KEY);
  }
}

/**
 * Get authentication credentials from storage
 * Checks both sessionStorage and localStorage (sessionStorage takes precedence)
 */
export function getAuthCredentials(): AuthCredentials | null {
  if (typeof window === 'undefined') {
    return null; // Server-side, return null
  }

  // Check sessionStorage first (more secure, takes precedence)
  const sessionCreds = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (sessionCreds) {
    try {
      return JSON.parse(sessionCreds) as AuthCredentials;
    } catch {
      // Invalid JSON, clear it
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  // Fall back to localStorage (for "Remember Me")
  const localCreds = localStorage.getItem(AUTH_STORAGE_KEY);
  if (localCreds) {
    try {
      return JSON.parse(localCreds) as AuthCredentials;
    } catch {
      // Invalid JSON, clear it
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  return null;
}

/**
 * Clear authentication credentials from both storages
 */
export function clearAuthCredentials(): void {
  if (typeof window === 'undefined') {
    return; // Server-side, do nothing
  }

  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(USERNAME_STORAGE_KEY);
}

/**
 * Check if user is authenticated (has credentials in storage)
 */
export function isAuthenticated(): boolean {
  return getAuthCredentials() !== null;
}

/**
 * Get remembered username (for login form pre-fill)
 */
export function getRememberedUsername(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(USERNAME_STORAGE_KEY);
}
