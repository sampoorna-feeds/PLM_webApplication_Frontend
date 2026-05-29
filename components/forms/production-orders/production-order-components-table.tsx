"use client";

import { Loader2 } from "lucide-react";
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
import { useAssignedTracking } from "./use-assigned-tracking";

import { cn } from "@/lib/utils";

/**
 * Format number with precision preservation
 * Removes trailing zeros but preserves significant digits
 */
function formatQuantity(value: number | undefined | null): string {
  if (value == null) return "-";

  // Convert to string with high precision
  const str = value.toString();

  // If the number has an 'e' notation (very small or large), handle it
  if (str.includes("e")) {
    // Parse the exponential notation and format appropriately
    const num = parseFloat(str);
    // Use toFixed with enough decimal places, then remove trailing zeros
    const formatted = num.toFixed(20);
    return formatted.replace(/\.?0+$/, "");
  }

  // For normal numbers, just remove trailing zeros after decimal
  if (str.includes(".")) {
    return str.replace(/\.?0+$/, "");
  }

  return str;
}

interface ProductionOrderComponentsTableProps {
  components: ProductionOrderComponent[];
  isLoading: boolean;
  onRowClick?: (
    component: ProductionOrderComponent,
    hasTracking: boolean,
  ) => void;
  trackingRefreshTrigger?: number;
}

export function ProductionOrderComponentsTable({
  components,
  isLoading,
  onRowClick,
  trackingRefreshTrigger = 0,
}: ProductionOrderComponentsTableProps) {
  const { trackingMap } = useItemTracking(components);
  const { assignedMap } = useAssignedTracking({
    sourceType: 5407,
    sourceId: components.length > 0 ? components[0].Prod_Order_No : undefined,
    enabled: components.length > 0,
    refreshTrigger: trackingRefreshTrigger,
  });


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        <span className="text-muted-foreground ml-2 text-sm">
          Loading components...
        </span>
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-8">
        No components found for this order.
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 rounded-md border [&_[data-slot=table-container]]:h-full [&_[data-slot=table-container]]:overflow-auto">
      <Table>
        <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm backdrop-blur">
          <TableRow>
            <TableHead className="w-30">Item No.</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-30">Location Code</TableHead>
            <TableHead className="w-25 text-right">Quantity Per</TableHead>
            <TableHead className="w-30 text-right">Expected Qty</TableHead>
            <TableHead className="w-30 text-right">Remaining Qty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {components.map((component) => {
            const itemKey = component.Item_No
              ? component.Item_No.trim().toLowerCase()
              : "";
            const hasTracking = trackingMap[itemKey] || false;
            const isAssigned = assignedMap[component.Line_No] || false;


            return (
              <TableRow
                key={`${component.Prod_Order_No}-${component.Prod_Order_Line_No}-${component.Line_No}`}
                tabIndex={0}
                className={cn(
                  "hover:bg-muted/50 cursor-pointer outline-none focus:bg-primary/10",
                  isAssigned
                    ? "text-green-700 bg-green-50/50 hover:bg-green-100/70 focus:bg-green-100 dark:text-green-400 dark:bg-green-950/40 dark:hover:bg-green-900/50 dark:focus:bg-green-900/60"
                    : hasTracking
                      ? "text-red-700 bg-red-50 hover:bg-red-100 focus:bg-red-100/80 dark:text-red-400 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:focus:bg-red-900/60"
                      : "",
                )}
                onClick={() => onRowClick?.(component, hasTracking)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRowClick?.(component, hasTracking);
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const next = e.currentTarget.nextElementSibling as HTMLElement;
                    if (next && next.tabIndex === 0) next.focus();
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const prev = e.currentTarget.previousElementSibling as HTMLElement;
                    if (prev && prev.tabIndex === 0) prev.focus();
                  }
                }}
              >
                <TableCell className="font-medium">
                  {component.Item_No || "-"}
                </TableCell>
                <TableCell>{component.Description || "-"}</TableCell>
                <TableCell>{component.Location_Code || "-"}</TableCell>
                <TableCell className="text-right">
                  {formatQuantity(component.Quantity_per)}
                </TableCell>
                <TableCell className="text-right">
                  {formatQuantity(component.Expected_Quantity)}
                </TableCell>
                <TableCell className="text-right">
                  {formatQuantity(component.Remaining_Quantity)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
