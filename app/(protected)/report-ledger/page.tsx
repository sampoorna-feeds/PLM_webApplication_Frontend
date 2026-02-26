"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportLedgerForm } from "@/components/forms/report-ledger/report-ledger-form";
import { Construction } from "lucide-react";

export default function ReportLedgerPage() {
  const [activeTab, setActiveTab] = useState<"ledger" | "summary">("ledger");

  return (
    <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(t) => setActiveTab(t as "ledger" | "summary")}
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
              <TabsList className="grid w-100 grid-cols-2">
                <TabsTrigger value="ledger">Ledger</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="ledger" className="flex-1 overflow-hidden px-4">
            <ReportLedgerForm />
          </TabsContent>

          <TabsContent value="summary" className="flex-1 overflow-hidden p-4">
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <div className="bg-muted rounded-full p-4">
                <Construction className="text-muted-foreground h-10 w-10" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold">Coming Soon</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  The summary view is currently under development.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
