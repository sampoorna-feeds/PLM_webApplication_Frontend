"use client";

import { Loader2, Check, X } from "lucide-react";
import type { ProductionOrderComponent } from "@/lib/api/services/production-orders.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useItemTracking } from "./use-item-tracking";
import { cn } from "@/lib/utils";

interface ProductionOrderComponentsTableProps {
  components: ProductionOrderComponent[];
  isLoading: boolean;
  onRowClick?: (component: ProductionOrderComponent, hasTracking: boolean) => void;
}

export function ProductionOrderComponentsTable({
  components,
  isLoading,
  onRowClick,
}: ProductionOrderComponentsTableProps) {
  // Fetch item tracking info for all components
  const { trackingMap } = useItemTracking(components);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading components...
        </span>
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        No components found for this order.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-30">Item No.</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-30">Location Code</TableHead>
            <TableHead className="w-25 text-right">Quantity Per</TableHead>
            <TableHead className="w-30 text-right">Expected Qty</TableHead>
            <TableHead className="w-30 text-right">Remaining Qty</TableHead>
            <TableHead className="w-30 text-center">
              Substitution Available
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {components.map((component) => {
            // Check if this item has a tracking code
            const hasTracking = trackingMap[component.Item_No] || false;

            return (
              <TableRow
                key={`${component.Prod_Order_No}-${component.Prod_Order_Line_No}-${component.Line_No}`}
                className={cn(
                  hasTracking && "text-red-600",
                  "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => onRowClick?.(component, hasTracking)}
              >
                <TableCell className="font-medium">
                  {component.Item_No || "-"}
                </TableCell>
                <TableCell>{component.Description || "-"}</TableCell>
                <TableCell>{component.Location_Code || "-"}</TableCell>
                <TableCell className="text-right">
                  {component.Quantity_per?.toLocaleString() ?? "-"}
                </TableCell>
                <TableCell className="text-right">
                  {component.Expected_Quantity?.toLocaleString() ?? "-"}
                </TableCell>
                <TableCell className="text-right">
                  {component.Remaining_Quantity?.toLocaleString() ?? "-"}
                </TableCell>
                <TableCell className="text-center">
                  {component.Substitution_Available ? (
                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground mx-auto" />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
