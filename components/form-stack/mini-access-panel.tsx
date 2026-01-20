/**
 * Mini Access Panel
 * Floating panel for tab management with search and bulk actions
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Search, X, ChevronLeft, ChevronRight, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFormStackContext } from '@/lib/form-stack/form-stack-context';
import { cn } from '@/lib/utils';

interface MiniAccessPanelProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MiniAccessPanel({ isOpen: controlledOpen, onOpenChange }: MiniAccessPanelProps = {}) {
  const { tabs, activeTabId, switchTab, closeTab, closeAllTabs } = useFormStackContext();
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCloseAllDialog, setShowCloseAllDialog] = useState(false);
  const [tabToClose, setTabToClose] = useState<string | null>(null);
  const [showCloseTabDialog, setShowCloseTabDialog] = useState(false);

  // Use controlled or internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  
  // If controlled, use the provided state
  const isPanelOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setPanelOpen = onOpenChange || setInternalOpen;

  const hasTabs = tabs.length > 0;
  const unsavedCount = tabs.filter((tab) => !tab.isSaved).length;

  // Auto-open when tabs exist (optional - can be removed if not desired)
  // useEffect(() => {
  //   if (hasTabs && !isOpen) {
  //     setIsOpen(true);
  //   }
  // }, [hasTabs, isOpen]);

  // Filter tabs based on search query
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) {
      return tabs;
    }

    const query = searchQuery.toLowerCase();
    return tabs.filter(
      (tab) =>
        tab.title.toLowerCase().includes(query) ||
        tab.formType.toLowerCase().includes(query) ||
        JSON.stringify(tab.formData || {}).toLowerCase().includes(query)
    );
  }, [tabs, searchQuery]);

  const handleCloseAll = () => {
    closeAllTabs();
    setShowCloseAllDialog(false);
    if (tabs.length === 0) {
      setIsOpen(false);
    }
  };

  const handleCloseTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const tab = tabs.find((t) => t.id === tabId);
    if (tab && !tab.isSaved) {
      // Show confirmation for unsaved tabs
      setTabToClose(tabId);
      setShowCloseTabDialog(true);
    } else {
      // Close saved tabs directly
      closeTab(tabId);
      if (tabs.length === 1) {
        setIsOpen(false);
      }
    }
  };

  const handleConfirmCloseTab = () => {
    if (tabToClose) {
      closeTab(tabToClose);
      if (tabs.length === 1) {
        setIsOpen(false);
      }
      setTabToClose(null);
    }
    setShowCloseTabDialog(false);
  };

  const handleCancelCloseTab = () => {
    setTabToClose(null);
    setShowCloseTabDialog(false);
  };

  return (
    <>
      {/* Panel - Modal/Dialog Style */}
      {isPanelOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/10 backdrop-blur-xs z-[60] animate-in fade-in-0"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal */}
          <div
            className={cn(
              'fixed z-[70] w-96 max-w-[calc(100vw-40vw-16px)] bg-background border shadow-xl rounded-lg',
              'top-20 left-1/2 -translate-x-1/2 max-h-[80vh] flex flex-col animate-in slide-in-from-top-2 duration-200',
              hasTabs ? '' : 'max-w-md'
            )}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Open Tabs</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tabs.length} tab{tabs.length !== 1 ? 's' : ''} open
                </p>
              </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPanelOpen(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
            </div>

          {/* Search */}
          <div className="px-4 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tabs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Tab List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-[200px]">
            {filteredTabs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
                {/* Icon */}
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Shield className="w-10 h-10 text-muted-foreground/40" />
                </div>
                <div className="text-base font-semibold text-foreground mb-1">
                  {searchQuery ? 'No tabs found' : 'No tabs open'}
                </div>
                {!searchQuery && (
                  <p className="text-sm text-muted-foreground">
                    Click on items to open them
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTabs.map((tab) => {
                  const isActive = tab.id === activeTabId;
                  const isUnsaved = !tab.isSaved;

                  return (
                    <div
                      key={tab.id}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors border',
                        isActive
                          ? 'bg-primary/5 border-primary/30'
                          : 'hover:bg-muted/50 border-transparent',
                        isUnsaved && 'border-orange-500/30'
                      )}
                      onClick={() => {
                        switchTab(tab.id);
                        setPanelOpen(false); // Close panel when switching
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate flex items-center gap-1.5">
                          {tab.title}
                          {isUnsaved && <span className="text-orange-500 text-xs">*</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {tab.formType}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseTab(tab.id);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                        <span className="sr-only">Close tab</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {hasTabs && (
            <div className="px-4 py-3 border-t bg-muted/30">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setShowCloseAllDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Close All Tabs
              </Button>
            </div>
          )}
        </div>
      </>
      )}

      {/* Close All Confirmation Dialog */}
      <AlertDialog open={showCloseAllDialog} onOpenChange={setShowCloseAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close All Tabs?</AlertDialogTitle>
            <AlertDialogDescription>
              {unsavedCount > 0
                ? `You have ${unsavedCount} unsaved tab${unsavedCount !== 1 ? 's' : ''}. Closing all tabs will lose any unsaved changes. Are you sure?`
                : 'Are you sure you want to close all tabs?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Close All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close Tab Confirmation Dialog */}
      <AlertDialog open={showCloseTabDialog} onOpenChange={setShowCloseTabDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              {tabToClose
                ? (() => {
                    const tab = tabs.find((t) => t.id === tabToClose);
                    return tab
                      ? `The form "${tab.title}" has unsaved changes. Are you sure you want to close it? All unsaved data will be lost.`
                      : 'This form has unsaved changes. Are you sure you want to close it? All unsaved data will be lost.';
                  })()
                : 'This form has unsaved changes. Are you sure you want to close it? All unsaved data will be lost.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelCloseTab}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCloseTab} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Close Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
