"use client";

import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { Button } from "@/components/ui/button";

export function PurchaseOrderForm() {
  const { closeTab } = useFormStackContext();

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center">
      <h2 className="text-xl font-semibold">New Purchase Order</h2>
      <p className="text-muted-foreground">This form is under development.</p>
    </div>
  );
}
