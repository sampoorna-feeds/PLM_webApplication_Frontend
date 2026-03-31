"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import type { TransferLine } from "@/lib/api/services/transfer-orders.service";
import { useState, useEffect, useCallback } from "react";
import { getItemsByNos } from "@/lib/api/services/item.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TransferOrderLinesTableProps {
  lines: TransferLine[];
  isLoading: boolean;
  onEdit?: (line: TransferLine) => void;
  onDelete?: (line: TransferLine) => void;
  onRowClick?: (line: TransferLine) => void;
  isReadOnly?: boolean;
}

export function TransferOrderLinesTable({
  lines,
  isLoading,
  onEdit,
  onDelete,
  onRowClick,
  isReadOnly = false,
}: TransferOrderLinesTableProps) {
  const [itemTrackingMap, setItemTrackingMap] = useState<Record<string, boolean>>({});
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);

  const fetchTrackingMap = useCallback(async () => {
    const itemNos = [...new Set(lines.map((l) => l.Item_No).filter(Boolean) as string[])];
    if (itemNos.length === 0) {
      setItemTrackingMap({});
      return;
    }

    setIsLoadingTracking(true);
    try {
      const items = await getItemsByNos(itemNos);
      const map: Record<string, boolean> = {};
      items.forEach((item) => {
        if (item.Item_Tracking_Code?.trim()) {
          map[item.No.trim().toLowerCase()] = true;
        }
      });
      setItemTrackingMap(map);
    } catch (err) {
      console.error("Error fetching item tracking map:", err);
    } finally {
      setIsLoadingTracking(false);
    }
  }, [lines]);

  useEffect(() => {
    fetchTrackingMap();
  }, [fetchTrackingMap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        <span className="text-muted-foreground ml-2 text-sm">
          Loading line items...
        </span>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-8 bg-muted/20 rounded-lg border border-dashed">
        No line items found for this order.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted whitespace-nowrap">
            <TableHead className="w-16">No.</TableHead>
            <TableHead>Item No.</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Appl.-to Item Entry</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Transfer Price</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Qty. to Ship</TableHead>
            <TableHead className="text-right">Quantity Shipped</TableHead>
            <TableHead className="text-right">Qty. to Receive</TableHead>
            <TableHead className="text-right">Quantity Received</TableHead>
            <TableHead>GST Group Code</TableHead>
            <TableHead>HSN/SAC Code</TableHead>
            <TableHead>GST Credit</TableHead>
            {!isReadOnly && <TableHead className="w-20 text-right pr-4 sticky right-0 bg-muted">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => {
            const hasTracking = line.Item_No ? !!itemTrackingMap[line.Item_No.trim().toLowerCase()] : false;
            return (
              <TableRow
                key={`${line.Document_No}-${line.Line_No}`}
                className={cn(
                  "hover:bg-muted/30 transition-colors whitespace-nowrap cursor-pointer",
                  hasTracking && "text-red-500 font-medium"
                )}
                onClick={() => onRowClick?.(line)}
              >
              <TableCell className="font-medium text-muted-foreground">
                {line.Line_No}
              </TableCell>
              <TableCell className="font-semibold">
                {line.Item_No || "-"}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {line.Description || "-"}
              </TableCell>
              <TableCell>
                {line.Appl_to_Item_Entry || "-"}
              </TableCell>
              <TableCell className="text-right font-medium">
                {line.Quantity?.toLocaleString() ?? "0"}
              </TableCell>
              <TableCell className="text-right">
                {line.Transfer_Price != null ? line.Transfer_Price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
              </TableCell>
              <TableCell className="text-right font-bold text-primary">
                {line.Amount != null ? line.Amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
              </TableCell>
              <TableCell className="text-right">
                {line.Qty_to_Ship?.toLocaleString() ?? "0"}
              </TableCell>
              <TableCell className="text-right">
                {line.Quantity_Shipped?.toLocaleString() ?? "0"}
              </TableCell>
              <TableCell className="text-right">
                {line.Qty_to_Receive?.toLocaleString() ?? "0"}
              </TableCell>
              <TableCell className="text-right">
                {line.Quantity_Received?.toLocaleString() ?? "0"}
              </TableCell>
              <TableCell>
                {line.GST_Group_Code || "-"}
              </TableCell>
              <TableCell>
                {line.HSN_SAC_Code || "-"}
              </TableCell>
              <TableCell>
                {line.GST_Credit || "-"}
              </TableCell>
              {!isReadOnly && (
                <TableCell className="text-right pr-4 sticky right-0 bg-background/80 backdrop-blur-sm">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(line);
                      }}
                      title="Edit Line"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(line);
                      }}
                      title="Delete Line"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>

                  </div>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
      </Table>
    </div>
  );
}
