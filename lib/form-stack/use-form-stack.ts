/**
 * useFormStack Hook
 * Custom hook for form components to interact with FormStack
 */

import { useEffect, useCallback, useMemo } from "react";
import { useFormStackContext } from "./form-stack-context";
import type { FormTab } from "./types";

export function useFormStack(tabId: string) {
  const context = useFormStackContext();

  // Extract stable function references from context
  const {
    tabs,
    activeTabId,
    currentTab,
    registerRefreshCallback,
    unregisterRefreshCallback,
    updateTab: contextUpdateTab,
    closeTab: contextCloseTab,
  } = context;

  // Memoize tab lookup to prevent unnecessary re-renders
  const tab = useMemo(() => tabs.find((t) => t.id === tabId), [tabs, tabId]);

  // Register refresh callback when component mounts
  useEffect(() => {
    if (!tab) {
      return;
    }

    // This will be overridden by form components that provide their own refresh callback
    const defaultRefresh = () => {
      // Default: no-op
    };

    registerRefreshCallback(tabId, defaultRefresh);

    return () => {
      unregisterRefreshCallback(tabId);
    };
  }, [tabId, tab, registerRefreshCallback, unregisterRefreshCallback]);

  const markAsSaved = useCallback(() => {
    if (tab) {
      contextUpdateTab(tabId, { isSaved: true });
    }
  }, [tab, tabId, contextUpdateTab]);

  const updateFormData = useCallback(
    (formData: Record<string, any>) => {
      if (tab) {
        contextUpdateTab(tabId, { formData });
      }
    },
    [tab, tabId, contextUpdateTab],
  );

  const handleSuccess = useCallback(async () => {
    if (!tab) {
      return;
    }

    // Mark as saved
    markAsSaved();

    // Auto-close if enabled and opened from parent
    if (
      tab.autoCloseOnSuccess !== false &&
      tab.context?.openedFromParent === true
    ) {
      contextCloseTab(tabId);
    }
  }, [tab, tabId, contextCloseTab, markAsSaved]);

  return {
    tab,
    currentTab,
    isActive: activeTabId === tabId,
    markAsSaved,
    updateFormData,
    handleSuccess,
    registerRefresh: (callback: () => void | Promise<void>) => {
      registerRefreshCallback(tabId, callback);
    },
    closeTab: () => contextCloseTab(tabId),
    updateTab: (updates: Partial<FormTab>) => contextUpdateTab(tabId, updates),
  };
}
