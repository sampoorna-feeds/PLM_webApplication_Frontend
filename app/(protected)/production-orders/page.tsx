"use client";

import { FinishedOrdersView } from "@/components/forms/production-orders";
import { ReleasedOrdersView } from "@/components/forms/production-orders/released-orders-view";
import {
  FormStackProvider,
  FormStackPanel,
  MiniAccessPanel,
} from "@/components/form-stack";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function ProductionOrderPage() {
  const [activeTab, setActiveTab] = useState<"released" | "finished">(
    "released",
  );

  return (
    <FormStackProvider formScope="production-orders">
      <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
        <div className="flex min-w-0 flex-1 flex-col">
          <Tabs
            value={activeTab}
            onValueChange={(t) => setActiveTab(t as "released" | "finished")}
            className="flex h-full w-full flex-1 flex-col"
          >
            <div className="flex shrink-0 flex-col px-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Production Orders
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Manage and track production orders
                  </p>
                </div>
                <TabsList className="grid w-100 grid-cols-2">
                  <TabsTrigger value="released">Released</TabsTrigger>
                  <TabsTrigger value="finished">Finished</TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent
              value="released"
              className="flex-1 overflow-hidden px-4"
            >
              <ReleasedOrdersView />
            </TabsContent>

            <TabsContent
              value="finished"
              className="flex-1 overflow-hidden p-4"
            >
              <FinishedOrdersView />
            </TabsContent>
          </Tabs>
        </div>

        {/* FormStack Panel */}
        <FormStackPanel />

        {/* Mini Access Panel */}
        <MiniAccessPanel />
      </div>
    </FormStackProvider>
  );
}
