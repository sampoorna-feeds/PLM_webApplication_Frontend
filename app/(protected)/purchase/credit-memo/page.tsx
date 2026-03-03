"use client";

import {
  FormStackProvider,
  FormStackPanel,
  MiniAccessPanel,
} from "@/components/form-stack";

function PurchaseCreditMemoPageContent() {
  return (
    <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-col px-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Purchase Credit Memo
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage purchase credit memos
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-4">
          <div className="text-muted-foreground text-center">
            <p className="text-lg font-medium">Coming Soon</p>
            <p className="text-sm">
              Purchase credit memo management is under development.
            </p>
          </div>
        </div>
      </div>

      <FormStackPanel />
      <MiniAccessPanel />
    </div>
  );
}

export default function PurchaseCreditMemoPage() {
  return (
    <FormStackProvider formScope="purchase">
      <PurchaseCreditMemoPageContent />
    </FormStackProvider>
  );
}
