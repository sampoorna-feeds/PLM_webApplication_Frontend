"use client";

import { useState } from "react";
import {
  FormStackProvider,
  FormStackPanel,
  MiniAccessPanel,
} from "@/components/form-stack";
import { QCReceiptView } from "@/components/forms/qc-receipt/qc-receipt-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function QCReceiptPage() {
  const [activeTab, setActiveTab] = useState<string>("all");

  return (
    <FormStackProvider formScope="qc-receipt">
      <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
        <div className="flex min-w-0 flex-1 flex-col">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex h-full w-full flex-1 flex-col"
          >
            <div className="flex shrink-0 flex-col px-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    QC Receipt
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Manage and track quality control receipts
                  </p>
                </div>
                <TabsList className="grid w-[480px] grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="Open">Open</TabsTrigger>
                  <TabsTrigger value="Approved">Approved</TabsTrigger>
                  <TabsTrigger value="Posted">Posted</TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
              <TabsContent value={activeTab} className="flex-1 mt-0 h-full">
                <QCReceiptView 
                  statusFilter={activeTab === "all" || activeTab === "Posted" ? undefined : activeTab} 
                  isPosted={activeTab === "Posted"}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <FormStackPanel />
        <MiniAccessPanel />
      </div>
    </FormStackProvider>
  );
}
