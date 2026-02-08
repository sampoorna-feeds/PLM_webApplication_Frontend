/**
 * Place Order page - Full page sales order creation
 * 3-step form with FormStack for Add/Edit Line Item only
 */

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FormStackProvider, FormStackPanel } from "@/components/form-stack";
import { SalesOrderFormContent } from "@/components/forms/sales/sales-order-form";
import { useFormStackContext } from "@/lib/form-stack/form-stack-context";

const TAB_ID = "sales-order-place-order";

function PlaceOrderContent() {
  const router = useRouter();
  const { openTab } = useFormStackContext();

  return (
    <div className="flex h-full min-h-0 w-full">
      {/* Main form - full width */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <SalesOrderFormContent
            onSuccess={() => router.push("/sales-form")}
            openLineItemTab={(params) => openTab("line-item", params)}
            tabId={TAB_ID}
            persistFormData={undefined}
          />
        </div>
      </div>

      {/* FormStack Panel - for Add/Edit Line Item */}
      <FormStackPanel />
    </div>
  );
}

export default function PlaceOrderPage() {
  return (
    <FormStackProvider formScope="sales">
      <PlaceOrderContent />
    </FormStackProvider>
  );
}
