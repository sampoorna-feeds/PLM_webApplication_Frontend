/**
 * FormStack Panel
 * Main sliding panel that displays the active tab's form component
 */

'use client';

import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormStackContext } from '@/lib/form-stack/form-stack-context';
import { getFormComponent } from '@/lib/form-stack/form-registry';
import type { FormComponent } from '@/lib/form-stack/types';
import { FormStackTabs } from './form-stack-tabs';
import { MiniAccessPanel } from './mini-access-panel';
import { cn } from '@/lib/utils';

export function FormStackPanel() {
  const { tabs, activeTabId, currentTab, isCollapsed, toggleCollapse, switchTab, closeTab, closeAllTabs } = useFormStackContext();
  const [isMiniPanelOpen, setIsMiniPanelOpen] = useState(false);
  const [FormComponent, setFormComponent] = useState<FormComponent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load form component when active tab changes
  useEffect(() => {
    if (!currentTab) {
      setFormComponent(null);
      return;
    }

    setIsLoading(true);
    getFormComponent(currentTab.formType)
      .then((component) => {
        setFormComponent(() => component);
      })
      .catch((error) => {
        console.error('Error loading form component:', error);
        setFormComponent(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentTab]);

  // Collapsed state - thin vertical bar
  if (isCollapsed) {
    return (
      <div className="w-12 bg-muted/30 border-l border-border/50 flex flex-col items-center py-3 h-full">
        {/* Expand Button */}
        <button
          onClick={toggleCollapse}
          className="w-8 h-8 rounded-md bg-background shadow-sm border border-border/50 flex items-center justify-center hover:bg-muted transition-colors mb-3"
          title="Expand FormStack"
        >
          <ChevronLeft className="h-4 w-4 text-foreground" />
        </button>
        
        {/* Tab Indicators */}
        {tabs.length > 0 && (
          <div className="flex flex-col gap-2 flex-1 overflow-y-auto px-1.5">
            {tabs.map((tab, index) => {
              const isActive = tab.id === activeTabId;
              const isUnsaved = !tab.isSaved;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    // Switch to tab and expand
                    switchTab(tab.id);
                    if (isCollapsed) {
                      toggleCollapse();
                    }
                  }}
                  className={cn(
                    'w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-background/80 hover:bg-background text-muted-foreground border border-border/50',
                    isUnsaved && 'ring-1 ring-orange-500/50'
                  )}
                  title={tab.title}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Expanded state - full panel (fixed with blurred background)
  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={toggleCollapse}
        aria-hidden="true"
      />
      
      {/* Fixed panel - Wider for sales order forms to accommodate line items table */}
      <div className={cn(
        "fixed top-0 right-0 h-full bg-background border-l border-border flex flex-col z-50 shadow-xl",
        currentTab?.formType === 'sales-order' 
          ? "w-[60vw] max-w-[60vw]" 
          : "w-[40vw] max-w-[40vw]"
      )}>
        {/* Tabs - Always show at top */}
        {tabs.length > 0 && <FormStackTabs />}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsMiniPanelOpen(!isMiniPanelOpen)}
              title="Open Tabs"
            >
              <Menu className="h-4 w-4" />
              <span className="sr-only">Open Tabs</span>
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">
                {currentTab?.title || 'FormStack'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleCollapse}
              title="Collapse FormStack"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Collapse</span>
            </Button>
            {currentTab && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  if (tabs.length === 1) {
                    closeAllTabs();
                  } else if (currentTab) {
                    closeTab(currentTab.id);
                  }
                }}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            )}
          </div>
        </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <div className="w-10 h-10 rounded bg-muted-foreground/20 flex flex-col gap-1 items-center justify-center">
                <div className="w-6 h-0.5 bg-muted-foreground/40 rounded"></div>
                <div className="w-6 h-0.5 bg-muted-foreground/40 rounded"></div>
                <div className="w-6 h-0.5 bg-muted-foreground/40 rounded"></div>
              </div>
            </div>
            <div className="text-base font-semibold text-foreground mb-1">
              No forms open
            </div>
            <p className="text-sm text-muted-foreground">
              Click on items to open them
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading form...</div>
          </div>
        ) : FormComponent && currentTab ? (
          <FormComponent
            tabId={currentTab.id}
            formData={currentTab.formData}
            context={currentTab.context}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Form not found</div>
          </div>
        )}
      </div>
      </div>
      
      {/* Mini Access Panel */}
      <MiniAccessPanel isOpen={isMiniPanelOpen} onOpenChange={setIsMiniPanelOpen} />
    </>
  );
}
