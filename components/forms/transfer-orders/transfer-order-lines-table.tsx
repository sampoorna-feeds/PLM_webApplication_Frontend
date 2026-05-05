"use client";

import { Check, Loader2, Package, Pencil, Trash2, X } from "lucide-react";
import type { TransferLine } from "@/lib/api/services/transfer-orders.service";
import { useState, useEffect, useCallback, useRef } from "react";
import { getItemsByNos } from "@/lib/api/services/item.service";
import { CalculatorInput } from "@/components/ui/calculator-input";
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
  onUpdateLine?: (line: TransferLine, updates: Partial<TransferLine>) => Promise<void>;
  isReadOnly?: boolean;
}

export function TransferOrderLinesTable({
  lines,
  isLoading,
  onEdit,
  onDelete,
  onRowClick,
  onUpdateLine,
  isReadOnly = false,
}: TransferOrderLinesTableProps) {
  const [itemTrackingMap, setItemTrackingMap] = useState<Record<string, boolean>>({});
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    lineNo: number;
    field: "Qty_to_Ship" | "Qty_to_Receive";
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);

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
            <TableHead className="text-right">Qty. to Receive</TableHead>
            <TableHead className="text-right">Quantity Shipped</TableHead>
            <TableHead className="text-right">Quantity Received</TableHead>
            <TableHead>GST Group Code</TableHead>
            <TableHead>HSN/SAC Code</TableHead>
            <TableHead>GST Credit</TableHead>
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
              <TableCell 
                className={cn(
                  "text-right transition-all duration-200",
                  editingCell?.lineNo === line.Line_No && editingCell?.field === "Qty_to_Ship" 
                    ? "p-0 min-w-[120px]" 
                    : "hover:bg-primary/5 cursor-text font-medium"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCell({ lineNo: line.Line_No, field: "Qty_to_Ship" });
                  const val = line.Qty_to_Ship;
                  setEditValue(val === 0 ? "" : val?.toString() || "");
                }}
              >
                {editingCell?.lineNo === line.Line_No && editingCell?.field === "Qty_to_Ship" ? (
                  <div 
                    className="flex items-center gap-1 p-1 animate-in fade-in zoom-in duration-200" 
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setIsUpdating(true);
                        try {
                          await onUpdateLine?.(line, { Qty_to_Ship: Number(editValue) });
                          setEditingCell(null);
                        } finally {
                          setIsUpdating(false);
                        }
                      } else if (e.key === "Escape") {
                        setEditingCell(null);
                      }
                    }}
                  >
                    <CalculatorInput
                      value={editValue}
                      onValueChange={setEditValue}
                      className="h-8 text-right font-bold focus-visible:ring-1"
                      autoFocus
                    />
                    <div className="flex flex-col gap-0.5">
                      <Button 
                        size="icon-xs" 
                        variant="ghost" 
                        className="h-4 w-4 text-green-600 hover:bg-green-50"
                        disabled={isUpdating}
                        onClick={async () => {
                          setIsUpdating(true);
                          try {
                            await onUpdateLine?.(line, { Qty_to_Ship: Number(editValue) });
                            setEditingCell(null);
                          } finally {
                            setIsUpdating(false);
                          }
                        }}
                      >
                        {isUpdating ? <Loader2 className="h-2 w-2 animate-spin" /> : <Check className="h-2 w-2" />}
                      </Button>
                      <Button 
                        size="icon-xs" 
                        variant="ghost" 
                        className="h-4 w-4 text-muted-foreground"
                        onClick={() => setEditingCell(null)}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  line.Qty_to_Ship?.toLocaleString() ?? "0"
                )}
              </TableCell>

              <TableCell 
                className={cn(
                  "text-right transition-all duration-200",
                  editingCell?.lineNo === line.Line_No && editingCell?.field === "Qty_to_Receive" 
                    ? "p-0 min-w-[120px]" 
                    : "hover:bg-primary/5 cursor-text font-medium"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCell({ lineNo: line.Line_No, field: "Qty_to_Receive" });
                  const val = line.Qty_to_Receive;
                  setEditValue(val === 0 ? "" : val?.toString() || "");
                }}
              >
                {editingCell?.lineNo === line.Line_No && editingCell?.field === "Qty_to_Receive" ? (
                  <div 
                    className="flex items-center gap-1 p-1 animate-in fade-in zoom-in duration-200" 
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setIsUpdating(true);
                        try {
                          await onUpdateLine?.(line, { Qty_to_Receive: Number(editValue) });
                          setEditingCell(null);
                        } finally {
                          setIsUpdating(false);
                        }
                      } else if (e.key === "Escape") {
                        setEditingCell(null);
                      }
                    }}
                  >
                    <CalculatorInput
                      value={editValue}
                      onValueChange={setEditValue}
                      className="h-8 text-right font-bold focus-visible:ring-1"
                      autoFocus
                    />
                    <div className="flex flex-col gap-0.5">
                      <Button 
                        size="icon-xs" 
                        variant="ghost" 
                        className="h-4 w-4 text-green-600 hover:bg-green-50"
                        disabled={isUpdating}
                        onClick={async () => {
                          setIsUpdating(true);
                          try {
                            await onUpdateLine?.(line, { Qty_to_Receive: Number(editValue) });
                            setEditingCell(null);
                          } finally {
                            setIsUpdating(false);
                          }
                        }}
                      >
                        {isUpdating ? <Loader2 className="h-2 w-2 animate-spin" /> : <Check className="h-2 w-2" />}
                      </Button>
                      <Button 
                        size="icon-xs" 
                        variant="ghost" 
                        className="h-4 w-4 text-muted-foreground"
                        onClick={() => setEditingCell(null)}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  line.Qty_to_Receive?.toLocaleString() ?? "0"
                )}
              </TableCell>

              <TableCell className="text-right">
                {line.Quantity_Shipped?.toLocaleString() ?? "0"}
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
            </TableRow>
          );
        })}
      </TableBody>
      </Table>
    </div>
  );
}
