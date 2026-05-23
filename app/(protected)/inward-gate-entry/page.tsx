"use client";

import { FormStackProvider, FormStackPanel, MiniAccessPanel } from "@/components/form-stack";
import { InwardGateEntryPageContent } from "@/components/forms/inward-gate-entry/inward-gate-entry-page";

export default function InwardGateEntryPage() {
  return (
    <FormStackProvider formScope="inward-gate-entry">
      <div className="flex h-full max-h-full w-full overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <InwardGateEntryPageContent />
        </div>
        <FormStackPanel />
        <MiniAccessPanel />
      </div>
    </FormStackProvider>
  );
}

