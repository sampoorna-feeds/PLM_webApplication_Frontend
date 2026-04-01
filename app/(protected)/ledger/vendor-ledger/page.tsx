"use client";

import { VendorLedgerView } from "@/components/forms/ledger/vendor-ledger-view";

export default function VendorLedgerPage() {
  return (
    <div className="bg-muted/20 flex h-[calc(100vh-4rem)] w-full overflow-hidden backdrop-blur-3xl">
      <div className="animate-in fade-in flex min-w-0 flex-1 flex-col overflow-hidden duration-500">
        <div className="flex shrink-0 flex-col px-6 pt-5 pb-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">
                Vendor Ledger
              </h1>
              <p className="text-foreground/70 text-sm font-medium">
                Detailed transaction history and outstanding balance for vendors
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pt-2">
          <VendorLedgerView />
        </div>
      </div>
    </div>
  );
}
