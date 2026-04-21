"use client";

import { useRef } from "react";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FormStackProvider,
  FormStackPanel,
  MiniAccessPanel,
} from "@/components/form-stack";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";
import { TransferOrderView } from "@/components/forms/transfer-orders";



function TransferOrderPageContent() {
  const { openTab } = useFormStackContext();
  const refetchRef = useRef<(() => void) | null>(null);

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
            <div className="flex items-center gap-4">
              <Button onClick={handleCreateOrder} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Order
              </Button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
          <TransferOrderView
            onPlaceOrder={() => {
              refetchRef.current?.();
            }}
            registerRefetch={(refetch) => {
              refetchRef.current = refetch;
            }}
          />
        </div>
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
