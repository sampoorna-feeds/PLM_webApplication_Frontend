"use client";

import { GLEntryView } from "@/components/forms/ledger/gl-entry-view";

export default function GLEntryPage() {
  return (
    <div className="bg-muted/20 flex h-[calc(100vh-4rem)] w-full overflow-hidden backdrop-blur-3xl">
      <div className="animate-in fade-in flex min-w-0 flex-1 flex-col overflow-hidden duration-500">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pt-2">
          <GLEntryView />
        </div>
      </div>
    </div>
  );
}
