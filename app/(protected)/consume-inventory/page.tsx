"use client";

import { ConsumeInventoryForm } from "@/components/forms/consume-inventory/consume-inventory-form";

export default function ConsumeInventoryPage() {
  return (
    <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full overflow-y-auto px-4 py-6">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Consume Inventory</h1>
          <p className="text-muted-foreground text-sm">
            Manage and post inventory consumption entries
          </p>
        </div>
        <ConsumeInventoryForm />
      </div>
    </div>
  );
}
