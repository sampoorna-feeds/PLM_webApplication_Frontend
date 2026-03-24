"use client";

import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PurchaseOrderFormMode } from "./purchase-order-form";

interface PurchaseOrderLinesProps {
  mode: PurchaseOrderFormMode;
  orderNo?: string;
}

export function PurchaseOrderLines({ mode, orderNo }: PurchaseOrderLinesProps) {
  const isDisabled = mode === "create" && !orderNo;

  if (!isDisabled) {
    return null;
  }

  return (
    <Card className="mx-4 mb-4 border-dashed">
      <CardContent className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-xs">
        <AlertCircle className="h-3.5 w-3.5" />
        Line items will be available after the order header is created.
      </CardContent>
    </Card>
  );
}
