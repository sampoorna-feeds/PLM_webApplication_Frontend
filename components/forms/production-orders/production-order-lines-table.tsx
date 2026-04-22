"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import type { ProductionOrderLine } from "@/lib/api/services/production-orders.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useItemTracking } from "./use-item-tracking";
import { cn } from "@/lib/utils";

interface ProductionOrderLinesTableProps {
  lines: ProductionOrderLine[];
  isLoading: boolean;
  onRowClick?: (line: ProductionOrderLine, hasTracking: boolean) => void;
  onDeleteLine?: (line: ProductionOrderLine) => Promise<void>;
}

export function ProductionOrderLinesTable({
  lines,
  isLoading,
  onRowClick,
  onDeleteLine,
}: ProductionOrderLinesTableProps) {
  // Fetch item tracking info for all lines
  const { trackingMap } = useItemTracking(lines);
  const [deletingLineNo, setDeletingLineNo] = useState<number | null>(null);
  const [pendingDeleteLine, setPendingDeleteLine] =
    useState<ProductionOrderLine | null>(null);

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteLine || !onDeleteLine) return;
    setDeletingLineNo(pendingDeleteLine.Line_No);
    setPendingDeleteLine(null);
    try {
      await onDeleteLine(pendingDeleteLine);
    } finally {
      setDeletingLineNo(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        <span className="text-muted-foreground ml-2 text-sm">
          Loading order lines...
        </span>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-8">
        No line items found for this order.
      </div>
    );
  }

  return (
    <>
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
              {onDeleteLine && (
                <TableHead className="w-12 text-center"></TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => {
              const itemKey = line.Item_No
                ? line.Item_No.trim().toLowerCase()
                : "";
              const hasTracking = trackingMap[itemKey] || false;
              const isDeleting = deletingLineNo === line.Line_No;

              return (
                <TableRow
                  key={`${line.Prod_Order_No}-${line.Line_No}`}
                  className={cn(
                    hasTracking && "text-red-600",
                    "hover:bg-muted/50 cursor-pointer",
                  )}
                  onClick={() => onRowClick?.(line, hasTracking)}
                >
                  <TableCell>{line.Line_No}</TableCell>
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
                  {onDeleteLine && (
                    <TableCell
                      className="text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-700"
                        disabled={isDeleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDeleteLine(line);
                        }}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!pendingDeleteLine}
        onOpenChange={(open) => !open && setPendingDeleteLine(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Line?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete line{" "}
              <strong>{pendingDeleteLine?.Line_No}</strong>
              {pendingDeleteLine?.Item_No && (
                <>
                  {" "}
                  ({pendingDeleteLine.Item_No}
                  {pendingDeleteLine.Description
                    ? ` – ${pendingDeleteLine.Description}`
                    : ""}
                  )
                </>
              )}
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
