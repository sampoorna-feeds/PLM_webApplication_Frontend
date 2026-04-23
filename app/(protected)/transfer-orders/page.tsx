"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FormStackProvider,
  FormStackPanel,
  MiniAccessPanel,
} from "@/components/form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { TransferOrderView } from "@/components/forms/transfer-orders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TransferOrderStatusTab } from "@/components/forms/transfer-orders/use-transfer-orders";

type TransferTab = "open" | "pending" | "released" | "all";

const TAB_STATUS_MAP: Record<TransferTab, TransferOrderStatusTab | ""> = {
  open: "Open",
  pending: "Pending Approval",
  released: "Released",
  all: "",
};

function TransferOrderPageContent() {
  const { openTab } = useFormStackContext();
  const refetchRef = useRef<(() => void) | null>(null);
  const [activeTab, setActiveTab] = useState<TransferTab>("all");

  const handleCreateOrder = () => {
    openTab("transfer-order", {
      title: "Create Transfer Order",
      context: {
        openedFromParent: true,
        onOrderCreated: () => {
          refetchRef.current?.();
        },
        onOrderPosted: () => {
          refetchRef.current?.();
        },
      },
      autoCloseOnSuccess: true,
    });
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(tab) => setActiveTab(tab as TransferTab)}
          className="flex h-full w-full flex-1 flex-col"
        >
          <div className="flex shrink-0 flex-col px-4 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Transfer Orders
                </h1>
                <p className="text-muted-foreground text-sm">
                  {activeTab === "all" 
                    ? "Manage and track all transfer orders" 
                    : `Viewing ${activeTab} transfer orders`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <TabsList className="grid w-fit grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="open">Open</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="released">Released</TabsTrigger>
                </TabsList>
                <Button onClick={handleCreateOrder} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Order
                </Button>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
            <TransferOrderView
              statusFilter={TAB_STATUS_MAP[activeTab] as any}
              onPlaceOrder={() => refetchRef.current?.()}
              registerRefetch={(refetch) => {
                refetchRef.current = refetch;
              }}
            />
          </div>
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
