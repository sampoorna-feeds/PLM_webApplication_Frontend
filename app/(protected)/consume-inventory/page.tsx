"use client";

import { ConsumeInventoryForm } from "@/components/forms/consume-inventory/consume-inventory-form";

export default function ConsumeInventoryPage() {
  return (
    <div className="flex h-full max-h-full w-full overflow-y-auto px-4 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <ConsumeInventoryForm />
      </div>
    </div>
  );
}
