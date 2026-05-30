"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportLedgerForm } from "@/components/forms/report-ledger/report-ledger-form";
import { InventorySummaryForm } from "@/components/forms/report-ledger/inventory-summary-form";
import { ItemAvailabilityForm } from "@/components/forms/report-ledger/item-availability-form";
import useLocalState from "@/hooks/use-local-state";

export default function ReportLedgerPage() {
  const [activeTab, setActiveTab] = useLocalState<"ledger" | "summary" | "availability">(
    "report-ledger-active-tab",
    "ledger",
  );

  return (
    <div className="flex h-full max-h-full w-full overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(t) => setActiveTab(t as "ledger" | "summary" | "availability")}
          className="flex h-full w-full flex-1 flex-col"
        >
          <div className="flex shrink-0 flex-col px-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Item Ledger Report
                </h1>
                <p className="text-muted-foreground text-sm">
                  View item transactions and inventory details
                </p>
              </div>
              <TabsList className="grid w-[360px] grid-cols-3">
                <TabsTrigger value="ledger">Ledger</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="availability">Availability</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="ledger" className="flex-1 overflow-hidden px-4">
            <ReportLedgerForm />
          </TabsContent>

          <TabsContent value="summary" className="flex-1 overflow-hidden px-4">
            <InventorySummaryForm />
          </TabsContent>

          <TabsContent value="availability" className="flex-1 overflow-hidden px-4">
            <ItemAvailabilityForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

