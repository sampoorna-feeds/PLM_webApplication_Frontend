"use client";

import { useRef, useState } from "react";
import {
  FormStackProvider,
  FormStackPanel,
  MiniAccessPanel,
} from "@/components/form-stack";
import { TransferOrderView } from "@/components/forms/transfer-orders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TransferOrderTab = "open" | "released";

const TAB_STATUS_MAP: Record<TransferOrderTab, "Open" | "Released"> = {
  open: "Open",
  released: "Released",
};

function TransferOrderPageContent() {
  const refetchRef = useRef<(() => void) | null>(null);
  const [activeTab, setActiveTab] = useState<TransferOrderTab>("open");

  return (
    <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(t) => setActiveTab(t as TransferOrderTab)}
          className="flex h-full w-full flex-1 flex-col"
        >
          <div className="flex shrink-0 flex-col px-4 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Transfer Orders
                </h1>
                <p className="text-muted-foreground text-sm">
                  Manage and track transfer orders
                </p>
              </div>
              <TabsList className="grid w-fit grid-cols-2">
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="released">Released</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent
            value="open"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
          >
            <TransferOrderView
              statusFilter={TAB_STATUS_MAP.open}
              onPlaceOrder={() => {
                refetchRef.current?.();
              }}
              registerRefetch={(refetch) => {
                refetchRef.current = refetch;
              }}
            />
          </TabsContent>

          <TabsContent
            value="released"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
          >
            <TransferOrderView
              statusFilter={TAB_STATUS_MAP.released}
              onPlaceOrder={() => {
                refetchRef.current?.();
              }}
              registerRefetch={(refetch) => {
                refetchRef.current = refetch;
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      <FormStackPanel />
      <MiniAccessPanel />
    </div>
  );
}

export default function TransferOrderPage() {
  return (
    <FormStackProvider formScope="transfer">
      <TransferOrderPageContent />
    </FormStackProvider>
  );
}
