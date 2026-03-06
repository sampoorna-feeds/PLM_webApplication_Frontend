/**
 * Purchase Return Order Form
 * Stub component — full implementation pending API availability.
 */

"use client";

import React, { useEffect } from "react";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { RotateCcw } from "lucide-react";

interface PurchaseReturnOrderFormProps {
  tabId: string;
  formData?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export function PurchaseReturnOrderForm({
  tabId,
}: PurchaseReturnOrderFormProps) {
  const { registerRefresh } = useFormStack(tabId);

  useEffect(() => {
    registerRefresh(async () => {
      console.log("Refreshing Purchase Return Order form...");
    });
  }, [registerRefresh]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <RotateCcw className="text-muted-foreground h-12 w-12 opacity-40" />
          <p className="text-muted-foreground text-lg font-medium">
            Purchase Return Orders
          </p>
          <p className="text-muted-foreground text-sm">Not available for now</p>
        </div>
      </div>
    </div>
  );
}
