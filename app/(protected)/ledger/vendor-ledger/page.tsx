"use client";

import { VendorLedgerView } from "@/components/forms/ledger/vendor-ledger-view";

export default function VendorLedgerPage() {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <VendorLedgerView />
        </div>
      </div>
    </div>
  );
}
