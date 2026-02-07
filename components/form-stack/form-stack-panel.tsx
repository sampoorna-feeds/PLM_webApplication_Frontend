/**
 * FormStack Panel
 * Main sliding panel that displays the active tab's form component
 */

"use client";

import React, { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { getFormComponent } from "@/lib/form-stack/form-registry";
import type { FormComponent } from "@/lib/form-stack/types";
import { FormStackTabs } from "./form-stack-tabs";
import { MiniAccessPanel } from "./mini-access-panel";
import { cn } from "@/lib/utils";

export function FormStackPanel() {
  const {
    tabs,
    activeTabId,
    currentTab,
    isCollapsed,
    toggleCollapse,
    switchTab,
    closeTab,
    closeAllTabs,
  } = useFormStackContext();
  const [isMiniPanelOpen, setIsMiniPanelOpen] = useState(false);
  const [FormComponent, setFormComponent] = useState<FormComponent | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  // Load form component when active tab changes
  // Use formType as dependency, not the full currentTab object to avoid unnecessary reloads
  const currentFormType = currentTab?.formType;
  const currentTabId = currentTab?.id;

  useEffect(() => {
    if (!currentFormType) {
      setFormComponent(null);
      return;
    }

    setIsLoading(true);
    getFormComponent(currentFormType)
      .then((component) => {
        setFormComponent(() => component);
      })
      .catch((error) => {
        console.error("Error loading form component:", error);
        setFormComponent(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentFormType, currentTabId]);

  // Collapsed state - thin vertical bar
  if (isCollapsed) {
    return (
      <div className="bg-muted/30 border-border/50 flex h-full w-12 flex-col items-center border-l py-3">
        {/* Expand Button */}
        <button
          onClick={toggleCollapse}
          className="bg-background border-border/50 hover:bg-muted mb-3 flex h-8 w-8 items-center justify-center rounded-md border shadow-sm transition-colors"
          title="Expand FormStack"
        >
          <ChevronLeft className="text-foreground h-4 w-4" />
        </button>

        {/* Tab Indicators */}
        {tabs.length > 0 && (
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-1.5">
            {tabs.map((tab, index) => {
              const isActive = tab.id === activeTabId;
              const isUnsaved = !tab.isSaved;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    switchTab(tab.id);
                  }}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-background/80 hover:bg-background text-muted-foreground border-border/50 border",
                    isUnsaved && "ring-1 ring-orange-500/50",
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
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={toggleCollapse}
        aria-hidden="true"
      />

      {/* Fixed panel - Wider for sales order and line item forms */}
      <div
        className={cn(
          "bg-background border-border fixed top-0 right-0 z-50 flex h-full flex-col border-l shadow-xl",
          currentTab?.formType === "sales-order" ||
            currentTab?.formType === "line-item"
            ? "w-screen md:w-[75vw] lg:w-[70vw]"
            : "w-screen md:w-[75vw] lg:w-[50vw]",
        )}
      >
        {/* Tabs - Always show at top */}
        {tabs.length > 0 && <FormStackTabs />}

        {/* Header */}
        <div className="bg-muted/30 flex items-center justify-between border-b px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsMiniPanelOpen(!isMiniPanelOpen)}
              title="Open Tabs"
            >
              <Menu className="h-4 w-4" />
              <span className="sr-only">Open Tabs</span>
            </Button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold">
                {currentTab?.title || "FormStack"}
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
            <div className="flex h-full flex-col items-center justify-center px-4 py-12 text-center">
              <div className="bg-muted/50 mb-4 flex h-20 w-20 items-center justify-center rounded-full">
                <div className="bg-muted-foreground/20 flex h-10 w-10 flex-col items-center justify-center gap-1 rounded">
                  <div className="bg-muted-foreground/40 h-0.5 w-6 rounded"></div>
                  <div className="bg-muted-foreground/40 h-0.5 w-6 rounded"></div>
                  <div className="bg-muted-foreground/40 h-0.5 w-6 rounded"></div>
                </div>
              </div>
              <div className="text-foreground mb-1 text-base font-semibold">
                No forms open
              </div>
              <p className="text-muted-foreground text-sm">
                Click on items to open them
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-muted-foreground text-sm">
                Loading form...
              </div>
            </div>
          ) : FormComponent && currentTab ? (
            <FormComponent
              tabId={currentTab.id}
              formData={currentTab.formData}
              context={currentTab.context}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-muted-foreground text-sm">
                Form not found
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mini Access Panel */}
      <MiniAccessPanel
        isOpen={isMiniPanelOpen}
        onOpenChange={setIsMiniPanelOpen}
      />
    </>
  );
}
