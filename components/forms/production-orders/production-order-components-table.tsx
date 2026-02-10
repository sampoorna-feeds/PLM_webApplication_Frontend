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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Comp. Line</TableHead>
            <TableHead className="w-20">Prod. Line</TableHead>
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
            const itemKey = component.Item_No
              ? component.Item_No.trim().toLowerCase()
              : "";
            const hasTracking = trackingMap[itemKey] || false;

            return (
              <TableRow
                key={`${component.Prod_Order_No}-${component.Prod_Order_Line_No}-${component.Line_No}`}
                className={cn(
                  hasTracking && "text-red-600",
                  "hover:bg-muted/50 cursor-pointer",
                )}
                onClick={() => onRowClick?.(component, hasTracking)}
              >
                <TableCell>{component.Line_No}</TableCell>
                <TableCell>{component.Prod_Order_Line_No}</TableCell>
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
                <TableCell className="text-center">
                  {component.Substitution_Available ? (
                    <Check className="mx-auto h-4 w-4 text-green-600" />
                  ) : (
                    <X className="text-muted-foreground mx-auto h-4 w-4" />
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
