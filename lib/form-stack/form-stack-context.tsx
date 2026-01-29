/**
 * FormStack Context
 * React context for managing FormStack state and operations
 */

'use client';

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import type { FormTab, FormStackContextType, FormStackState } from './types';
import { saveFormStack, loadFormStack, clearFormStack } from './storage';

const FormStackContext = createContext<FormStackContextType | undefined>(undefined);

interface FormStackProviderProps {
  children: React.ReactNode;
  formScope: string;
}

export function FormStackProvider({ children, formScope }: FormStackProviderProps) {
  const [tabs, setTabs] = useState<FormTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true); // Start collapsed by default
  const [isFloating, setIsFloating] = useState<boolean>(false);
  const refreshCallbacksRef = useRef<Map<string, () => void | Promise<void>>>(new Map());

  // Load persisted state from session storage on mount
  useEffect(() => {
    const persisted = loadFormStack(formScope);
    if (persisted) {
      setTabs(persisted.tabs);
      setActiveTabId(persisted.activeTabId);
      setIsCollapsed(persisted.isCollapsed ?? true); // Default to collapsed
      setIsFloating(persisted.isFloating ?? false);
    }
  }, [formScope]);

  // Save state to session storage whenever it changes
  useEffect(() => {
    if (tabs.length > 0 || activeTabId !== null) {
      const state: FormStackState = {
        tabs,
        activeTabId,
        formScope,
        isCollapsed,
        isFloating,
      };
      saveFormStack(formScope, state);
    } else {
      // Clear storage when all tabs are closed
      clearFormStack(formScope);
    }
  }, [tabs, activeTabId, formScope, isCollapsed, isFloating]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const toggleFloat = useCallback(() => {
    setIsFloating((prev) => !prev);
  }, []);

  const openTab = useCallback(
    (
      formType: string,
      options?: {
        title?: string;
        formData?: Record<string, any>;
        context?: Record<string, any>;
        autoCloseOnSuccess?: boolean;
      }
    ): string => {
      const now = Date.now();
      const tabId = `tab-${now}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newTab: FormTab = {
        id: tabId,
        title: options?.title || `New ${formType}`,
        formType,
        formComponent: formType, // Will be resolved via registry
        formData: options?.formData,
        context: {
          ...options?.context,
          openedFromParent: options?.context?.openedFromParent ?? true,
        },
        isSaved: false,
        createdAt: now,
        lastVisitedAt: now,
        autoCloseOnSuccess: options?.autoCloseOnSuccess ?? true,
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(tabId);
      
      // Auto-expand panel when opening a new tab (form is being opened)
      if (isCollapsed) {
        setIsCollapsed(false);
      }

      return tabId;
    },
    [isCollapsed]
  );

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.id !== tabId);
      
      // If closing active tab, switch to another tab
      if (activeTabId === tabId) {
        if (newTabs.length > 0) {
          // Switch to the tab that was before this one, or the first one
          const closedIndex = prev.findIndex((tab) => tab.id === tabId);
          const newActiveIndex = closedIndex > 0 ? closedIndex - 1 : 0;
          setActiveTabId(newTabs[newActiveIndex]?.id || null);
        } else {
          setActiveTabId(null);
        }
      }
      
      return newTabs;
    });

    // Unregister refresh callback
    refreshCallbacksRef.current.delete(tabId);
  }, [activeTabId]);

  const switchTab = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) {
        return;
      }

      const wasVisitedBefore = tab.lastVisitedAt !== tab.createdAt;
      const now = Date.now();

      // Update last visited time
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, lastVisitedAt: now } : t))
      );

      setActiveTabId(tabId);

      // Auto-expand when switching to a tab (form is opened)
      if (isCollapsed) {
        setIsCollapsed(false);
      }

      // If revisiting, trigger refresh callback
      if (wasVisitedBefore) {
        const refreshCallback = refreshCallbacksRef.current.get(tabId);
        if (refreshCallback) {
          try {
            await refreshCallback();
          } catch (error) {
            console.error('Error refreshing tab:', error);
          }
        }
      }
    },
    [tabs, isCollapsed]
  );

  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
    refreshCallbacksRef.current.clear();
  }, []);

  const updateTab = useCallback((tabId: string, updates: Partial<FormTab>) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab))
    );
  }, []);

  const registerRefreshCallback = useCallback(
    (tabId: string, callback: () => void | Promise<void>) => {
      refreshCallbacksRef.current.set(tabId, callback);
    },
    []
  );

  const unregisterRefreshCallback = useCallback((tabId: string) => {
    refreshCallbacksRef.current.delete(tabId);
  }, []);

  const currentTab = tabs.find((tab) => tab.id === activeTabId) || null;

  const value: FormStackContextType = {
    tabs,
    activeTabId,
    currentTab,
    formScope,
    isCollapsed,
    isFloating,
    toggleCollapse,
    toggleFloat,
    openTab,
    closeTab,
    switchTab,
    closeAllTabs,
    updateTab,
    registerRefreshCallback,
    unregisterRefreshCallback,
  };

  return <FormStackContext.Provider value={value}>{children}</FormStackContext.Provider>;
}

/**
 * Hook to use FormStack context
 */
export function useFormStackContext(): FormStackContextType {
  const context = React.useContext(FormStackContext);
  if (context === undefined) {
    throw new Error('useFormStackContext must be used within a FormStackProvider');
  }
  return context;
}
