"use client";

import { useRef, useState } from "react";
import {
  FormStackProvider,
  FormStackPanel,
  MiniAccessPanel,
} from "@/components/form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { SalesOrderView } from "@/components/forms/sales-orders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SalesOrderTab = "open" | "pending" | "approved";

const TAB_STATUS_MAP: Record<SalesOrderTab, "Open" | "Pending Approval" | "Released"> = {
  open: "Open",
  pending: "Pending Approval",
  approved: "Released",
};

function SalesOrderPageContent() {
  const refetchRef = useRef<(() => void) | null>(null);
  const [activeTab, setActiveTab] = useState<SalesOrderTab>("open");

  return (
    <div className="flex h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={(t) => setActiveTab(t as SalesOrderTab)}
          className="flex h-full w-full flex-1 flex-col"
        >
          <div className="flex shrink-0 flex-col px-4 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Sales Orders
                </h1>
                <p className="text-muted-foreground text-sm">
                  Manage and track sales orders
                </p>
              </div>
              <TabsList className="grid w-fit grid-cols-3">
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
            <SalesOrderView
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
            value="pending"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
          >
            <SalesOrderView
              statusFilter={TAB_STATUS_MAP.pending}
              onPlaceOrder={() => {
                refetchRef.current?.();
              }}
              registerRefetch={(refetch) => {
                refetchRef.current = refetch;
              }}
            />
          </TabsContent>

          <TabsContent
            value="approved"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3"
          >
            <SalesOrderView
              statusFilter={TAB_STATUS_MAP.approved}
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

export default function SalesOrderPage() {
  return (
    <FormStackProvider formScope="sales">
      <SalesOrderPageContent />
    </FormStackProvider>
  );
}
