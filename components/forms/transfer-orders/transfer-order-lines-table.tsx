"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import type { TransferLine } from "@/lib/api/services/transfer-orders.service";
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
  isReadOnly?: boolean;
}

export function TransferOrderLinesTable({
  lines,
  isLoading,
  onEdit,
  onDelete,
  isReadOnly = false,
}: TransferOrderLinesTableProps) {
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
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className="w-16">No.</TableHead>
            <TableHead className="w-30">Item No.</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-20">UOM</TableHead>
            <TableHead className="w-25 text-right">Quantity</TableHead>
            <TableHead className="w-25 text-right">Price</TableHead>
            <TableHead className="w-25 text-right">Amount</TableHead>
            {!isReadOnly && <TableHead className="w-20 text-right pr-4">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow
              key={`${line.Document_No}-${line.Line_No}`}
              className="hover:bg-muted/30 transition-colors"
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
              <TableCell>{line.Unit_of_Measure_Code || "-"}</TableCell>
              <TableCell className="text-right font-medium">
                {line.Quantity?.toLocaleString() ?? "0"}
              </TableCell>
              <TableCell className="text-right">
                {line.Transfer_Price != null ? line.Transfer_Price.toLocaleString() : "0.00"}
              </TableCell>
              <TableCell className="text-right font-bold text-primary">
                {line.Amount != null ? line.Amount.toLocaleString() : "0.00"}
              </TableCell>
              {!isReadOnly && (
                <TableCell className="text-right pr-4">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit?.(line)}
                      title="Edit Line"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete?.(line)}
                      title="Delete Line"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
