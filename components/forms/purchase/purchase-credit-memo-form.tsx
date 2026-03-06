/**
 * Purchase Credit Memo Form
 * Stub component — full implementation pending API availability.
 */

"use client";

import React, { useEffect } from "react";
import { useFormStack } from "@/lib/form-stack/use-form-stack";
import { Receipt } from "lucide-react";

interface PurchaseCreditMemoFormProps {
  tabId: string;
  formData?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export function PurchaseCreditMemoForm({ tabId }: PurchaseCreditMemoFormProps) {
  const { registerRefresh } = useFormStack(tabId);

  useEffect(() => {
    registerRefresh(async () => {
      console.log("Refreshing Purchase Credit Memo form...");
    });
  }, [registerRefresh]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <Receipt className="text-muted-foreground h-12 w-12 opacity-40" />
          <p className="text-muted-foreground text-lg font-medium">
            Purchase Credit Memos
          </p>
          <p className="text-muted-foreground text-sm">Not available for now</p>
        </div>
      </div>
    </div>
  );
}
