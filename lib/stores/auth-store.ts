/**
 * Authentication store using Zustand
 * Manages user authentication state and credentials
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  company: string;
  // Add more user properties as needed
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  credentials: {
    username: string;
    password: string;
    company: string;
  } | null;
  
  // Actions
  login: (username: string, password: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

/**
 * Authentication store
 * Persists to localStorage for session persistence
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      credentials: null,

      login: (username: string, password: string) => {
        // For now, using dummy credentials (temp/temp)
        // TODO: Replace with actual API call when ready
        if (username === 'temp' && password === 'temp') {
          set({
            isAuthenticated: true,
            credentials: { 
              username, 
              password, 
              company: 'Sampoorna Feeds Pvt. Ltd' // Default company from env
            },
            user: {
              id: '1',
              username,
              company: 'Sampoorna Feeds Pvt. Ltd',
            },
          });
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          credentials: null,
        });
      },

      setUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      // Only persist credentials and user, not the entire state
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        credentials: state.credentials,
      }),
    }
  )
);

