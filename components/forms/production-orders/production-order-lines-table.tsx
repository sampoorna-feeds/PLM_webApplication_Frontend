"use client";

import { Loader2 } from "lucide-react";
import type { ProductionOrderLine } from "@/lib/api/services/production-orders.service";
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

interface ProductionOrderLinesTableProps {
  lines: ProductionOrderLine[];
  isLoading: boolean;
  onRowClick?: (line: ProductionOrderLine, hasTracking: boolean) => void;
}

export function ProductionOrderLinesTable({
  lines,
  isLoading,
  onRowClick,
}: ProductionOrderLinesTableProps) {
  // Fetch item tracking info for all lines
  const { trackingMap } = useItemTracking(lines);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading order lines...
        </span>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        No line items found for this order.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Line No.</TableHead>
            <TableHead className="w-30">Item No.</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-30">Location Code</TableHead>
            <TableHead className="w-25 text-right">Quantity</TableHead>
            <TableHead className="w-20">UOM</TableHead>
            <TableHead className="w-30 text-right">Finished Qty</TableHead>
            <TableHead className="w-30 text-right">Remaining Qty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => {
            // Check if this item has a tracking code
            const itemKey = line.Item_No ? line.Item_No.trim().toLowerCase() : "";
            const hasTracking = trackingMap[itemKey] || false;
            
            return (
              <TableRow 
                key={`${line.Prod_Order_No}-${line.Line_No}`}
                className={cn(
                  hasTracking && "text-red-600",
                  "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => onRowClick?.(line, hasTracking)}
              >
                <TableCell>
                  {line.Line_No}
                </TableCell>
                <TableCell className="font-medium">
                  {line.Item_No || "-"}
                </TableCell>
                <TableCell>{line.Description || "-"}</TableCell>
                <TableCell>{line.Location_Code || "-"}</TableCell>
                <TableCell className="text-right">
                  {line.Quantity?.toLocaleString() ?? "-"}
                </TableCell>
                <TableCell>{line.Unit_of_Measure_Code || "-"}</TableCell>
                <TableCell className="text-right">
                  {line.Finished_Quantity?.toLocaleString() ?? "-"}
                </TableCell>
                <TableCell className="text-right">
                  {line.Remaining_Quantity?.toLocaleString() ?? "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

