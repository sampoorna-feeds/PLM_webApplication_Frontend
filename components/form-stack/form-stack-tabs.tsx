/**
 * FormStack Tabs
 * Tab bar component showing all open tabs
 */

"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { cn } from "@/lib/utils";

export function FormStackTabs() {
  const { tabs, activeTabId, switchTab, closeTab } = useFormStackContext();
  const [tabToClose, setTabToClose] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (tabs.length === 0) {
    return null;
  }

  const handleCloseClick = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = tabs.find((t) => t.id === tabId);
    if (tab && !tab.isSaved) {
      // Show confirmation for unsaved tabs
      setTabToClose(tabId);
      setShowConfirmDialog(true);
    } else {
      // Close saved tabs directly
      closeTab(tabId);
    }
  };

  const handleConfirmClose = () => {
    if (tabToClose) {
      closeTab(tabToClose);
      setTabToClose(null);
    }
    setShowConfirmDialog(false);
  };

  const handleCancelClose = () => {
    setTabToClose(null);
    setShowConfirmDialog(false);
  };

  const tabToCloseData = tabToClose
    ? tabs.find((t) => t.id === tabToClose)
    : null;

  return (
    <>
      <div className="bg-background flex gap-0 overflow-x-auto border-b">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isUnsaved = !tab.isSaved;

          return (
            <div
              key={tab.id}
              className={cn(
                "group relative flex min-w-0 cursor-pointer items-center gap-2 border-r border-b-2 px-4 py-2.5 transition-colors",
                isActive
                  ? "border-b-primary bg-background border-t-primary border-t-2"
                  : "hover:bg-muted/50 border-t-2 border-t-transparent border-b-transparent",
                isUnsaved && "border-b-orange-500",
              )}
              onClick={() => switchTab(tab.id)}
            >
              <span
                className={cn(
                  "flex-1 truncate text-sm font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {tab.title}
                {isUnsaved && <span className="ml-1 text-orange-500">*</span>}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-5 w-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => handleCloseClick(e, tab.id)}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Close tab</span>
              </Button>
            </div>
          );
        })}
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              {tabToCloseData
                ? `The form "${tabToCloseData.title}" has unsaved changes. Are you sure you want to close it? All unsaved data will be lost.`
                : "This form has unsaved changes. Are you sure you want to close it? All unsaved data will be lost."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClose}
              variant="destructive"
            >
              Close Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
