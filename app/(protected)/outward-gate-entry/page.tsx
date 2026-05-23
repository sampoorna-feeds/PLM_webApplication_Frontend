"use client";

import { FormStackProvider, FormStackPanel, MiniAccessPanel } from "@/components/form-stack";
import { OutwardGateEntryPageContent } from "@/components/forms/outward-gate-entry/outward-gate-entry-page";

export default function OutwardGateEntryPage() {
  return (
    <FormStackProvider formScope="outward-gate-entry">
      <div className="flex h-full max-h-full w-full overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <OutwardGateEntryPageContent />
        </div>
        <FormStackPanel />
        <MiniAccessPanel />
      </div>
    </FormStackProvider>
  );
}
