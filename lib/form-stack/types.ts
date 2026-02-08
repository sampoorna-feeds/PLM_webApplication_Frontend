/**
 * FormStack Types
 * Type definitions for the FormStack tab management system
 */

export interface FormTab {
  id: string;
  title: string;
  formType: string;
  formComponent: string; // Component name/identifier
  formData?: Record<string, any>;
  context?: Record<string, any>;
  isSaved: boolean;
  createdAt: number;
  lastVisitedAt: number;
  autoCloseOnSuccess?: boolean; // Flag to prevent auto-close (default: true)
}

export interface FormStackState {
  tabs: FormTab[];
  activeTabId: string | null;
  formScope: string; // e.g., 'sales'
  isCollapsed?: boolean; // Whether the panel is collapsed
  isFloating?: boolean; // Whether the panel is floating (popped to left)
}

export interface FormStackContextType {
  tabs: FormTab[];
  activeTabId: string | null;
  currentTab: FormTab | null;
  formScope: string;
  isCollapsed: boolean;
  isFloating: boolean;
  toggleCollapse: () => void;
  toggleFloat: () => void;
  openTab: (
    formType: string,
    options?: {
      title?: string;
      formData?: Record<string, any>;
      context?: Record<string, any>;
      autoCloseOnSuccess?: boolean;
    },
  ) => string; // Returns tab ID
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  closeAllTabs: () => void;
  updateTab: (tabId: string, updates: Partial<FormTab>) => void;
  registerRefreshCallback: (
    tabId: string,
    callback: () => void | Promise<void>,
  ) => void;
  unregisterRefreshCallback: (tabId: string) => void;
}

export type FormComponent = React.ComponentType<{
  tabId: string;
  formData?: Record<string, any>;
  context?: Record<string, any>;
}>;
