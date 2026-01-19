/**
 * FormStack Storage
 * Handles session storage persistence for FormStack tabs
 */

import type { FormStackState } from './types';

const STORAGE_PREFIX = 'formStack_';

/**
 * Get storage key for a form scope
 */
function getStorageKey(formScope: string): string {
  return `${STORAGE_PREFIX}${formScope}`;
}

/**
 * Save FormStack state to session storage
 */
export function saveFormStack(formScope: string, state: FormStackState): void {
  if (typeof window === 'undefined') {
    return; // Server-side, do nothing
  }

  try {
    const key = getStorageKey(formScope);
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving FormStack to session storage:', error);
  }
}

/**
 * Load FormStack state from session storage
 */
export function loadFormStack(formScope: string): FormStackState | null {
  if (typeof window === 'undefined') {
    return null; // Server-side, return null
  }

  try {
    const key = getStorageKey(formScope);
    const stored = sessionStorage.getItem(key);
    
    if (!stored) {
      return null;
    }

    const state = JSON.parse(stored) as FormStackState;
    
    // Validate state structure
    if (!state.tabs || !Array.isArray(state.tabs)) {
      return null;
    }

    return state;
  } catch (error) {
    console.error('Error loading FormStack from session storage:', error);
    return null;
  }
}

/**
 * Clear FormStack state for a specific form scope
 */
export function clearFormStack(formScope: string): void {
  if (typeof window === 'undefined') {
    return; // Server-side, do nothing
  }

  try {
    const key = getStorageKey(formScope);
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing FormStack from session storage:', error);
  }
}

/**
 * Clear all FormStack data from session storage
 * Used on logout
 */
export function clearAllFormStacks(): void {
  if (typeof window === 'undefined') {
    return; // Server-side, do nothing
  }

  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keys.push(key);
      }
    }

    keys.forEach((key) => {
      sessionStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing all FormStacks from session storage:', error);
  }
}
