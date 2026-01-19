/**
 * useFormStack Hook
 * Custom hook for form components to interact with FormStack
 */

import { useEffect, useCallback } from 'react';
import { useFormStackContext } from './form-stack-context';
import type { FormTab } from './types';

export function useFormStack(tabId: string) {
  const context = useFormStackContext();
  const tab = context.tabs.find((t) => t.id === tabId);

  // Register refresh callback when component mounts
  useEffect(() => {
    if (!tab) {
      return;
    }

    // This will be overridden by form components that provide their own refresh callback
    const defaultRefresh = () => {
      // Default: no-op
    };

    context.registerRefreshCallback(tabId, defaultRefresh);

    return () => {
      context.unregisterRefreshCallback(tabId);
    };
  }, [tabId, context, tab]);

  const markAsSaved = useCallback(() => {
    if (tab) {
      context.updateTab(tabId, { isSaved: true });
    }
  }, [tab, tabId, context]);

  const updateFormData = useCallback((formData: Record<string, any>) => {
    if (tab) {
      context.updateTab(tabId, { formData });
    }
  }, [tab, tabId, context]);

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
      context.closeTab(tabId);
    }
  }, [tab, tabId, context, markAsSaved]);

  return {
    tab,
    currentTab: context.currentTab,
    isActive: context.activeTabId === tabId,
    markAsSaved,
    updateFormData,
    handleSuccess,
    registerRefresh: (callback: () => void | Promise<void>) => {
      context.registerRefreshCallback(tabId, callback);
    },
    closeTab: () => context.closeTab(tabId),
    updateTab: (updates: Partial<FormTab>) => context.updateTab(tabId, updates),
  };
}
