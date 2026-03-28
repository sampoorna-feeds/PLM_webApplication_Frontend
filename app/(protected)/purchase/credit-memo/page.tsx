"use client";

import { useRef, useState } from "react";
import {
  FormStackProvider,
  FormStackPanel,
  MiniAccessPanel,
} from "@/components/form-stack";
import { PurchaseCreditMemoView } from "@/components/forms/purchase-orders/index";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PurchaseOrderTab = "open" | "pending" | "approved" | "all";

const TAB_STATUS_MAP: Record<
  PurchaseOrderTab,
  "Open" | "Pending Approval" | "Released" | ""
> = {
  open: "Open",
  pending: "Pending Approval",
  approved: "Released",
  all: "",
};

function PurchaseCreditMemoPageContent() {
  const refetchRef = useRef<(() => void) | null>(null);
  const [activeTab, setActiveTab] = useState<PurchaseOrderTab>("all");

  return (
    <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(t) => setActiveTab(t as PurchaseOrderTab)}
          className="flex h-full w-full flex-1 flex-col"
        >
          <div className="flex shrink-0 flex-col px-4 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Purchase Credit Memos
                </h1>
                <p className="text-muted-foreground text-sm">
                  Manage and track credit memos
                </p>
              </div>
              <TabsList className="grid w-fit grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent
            value="open"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
          >
            <PurchaseCreditMemoView
              statusFilter={TAB_STATUS_MAP.open}
              onPlaceOrder={() => {
                refetchRef.current?.();
              }}
              registerRefetch={(refetch: () => void) => {
                refetchRef.current = refetch;
              }}
            />
          </TabsContent>

          <TabsContent
            value="pending"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
          >
            <PurchaseCreditMemoView
              statusFilter={TAB_STATUS_MAP.pending}
              onPlaceOrder={() => {
                refetchRef.current?.();
              }}
              registerRefetch={(refetch: () => void) => {
                refetchRef.current = refetch;
              }}
            />
          </TabsContent>

          <TabsContent
            value="approved"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
          >
            <PurchaseCreditMemoView
              statusFilter={TAB_STATUS_MAP.approved}
              onPlaceOrder={() => {
                refetchRef.current?.();
              }}
              registerRefetch={(refetch: () => void) => {
                refetchRef.current = refetch;
              }}
            />
          </TabsContent>

          <TabsContent
            value="all"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
          >
            <PurchaseCreditMemoView
              statusFilter={TAB_STATUS_MAP.all}
              onPlaceOrder={() => {
                refetchRef.current?.();
              }}
              registerRefetch={(refetch: () => void) => {
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

export default function PurchaseCreditMemoPage() {
  return (
    <FormStackProvider formScope="purchase">
      <PurchaseCreditMemoPageContent />
    </FormStackProvider>
  );
}
