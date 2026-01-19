/**
 * FormStack Tabs
 * Tab bar component showing all open tabs
 */

'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormStackContext } from '@/lib/form-stack/form-stack-context';
import { cn } from '@/lib/utils';

export function FormStackTabs() {
  const { tabs, activeTabId, switchTab, closeTab } = useFormStackContext();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-0 border-b bg-background overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isUnsaved = !tab.isSaved;

        return (
          <div
            key={tab.id}
            className={cn(
              'group relative flex items-center gap-2 px-4 py-2.5 border-r border-b-2 transition-colors cursor-pointer min-w-0',
              isActive
                ? 'border-b-primary bg-background border-t-2 border-t-primary'
                : 'border-b-transparent border-t-2 border-t-transparent hover:bg-muted/50',
              isUnsaved && 'border-b-orange-500'
            )}
            onClick={() => switchTab(tab.id)}
          >
            <span
              className={cn(
                'text-sm font-medium truncate flex-1',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {tab.title}
              {isUnsaved && <span className="ml-1 text-orange-500">*</span>}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Close tab</span>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
