"use client";

import { GLEntryView } from "@/components/forms/ledger/gl-entry-view";

export default function GLEntryPage() {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <GLEntryView />
        </div>
      </div>
    </div>
  );
}
