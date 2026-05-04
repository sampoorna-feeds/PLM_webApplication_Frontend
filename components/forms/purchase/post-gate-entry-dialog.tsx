"use client";

import { useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  attachGateEntry,
  deleteAttachedGateEntry,
  getAttachedGateEntries,
  getPostGateEntryLineList,
  type AttachedGateEntry,
  type PostGateEntryLine,
} from "@/lib/api/services/purchase-orders.service";
import type { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/utils/date";

interface PostGateEntryDialogProps {
  sourceNo: string;
  disabled?: boolean;
}

function rowId(row: PostGateEntryLine): string {
  return `${row.Gate_Entry_No}::${row.Line_No}`;
}


export function PostGateEntryDialog({
  sourceNo,
  disabled = false,
}: PostGateEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [rows, setRows] = useState<PostGateEntryLine[]>([]);
  const [attachedRows, setAttachedRows] = useState<AttachedGateEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const totalRows = rows.length;
  const selectedCount = selectedIds.size;
  const allSelected = totalRows > 0 && selectedCount === totalRows;
  const someSelected = selectedCount > 0 && selectedCount < totalRows;

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(rowId(row))),
    [rows, selectedIds],
  );

  const loadRows = async () => {
    if (!sourceNo) return;
    setIsLoading(true);
    try {
      const [pending, attached] = await Promise.all([
        getPostGateEntryLineList(sourceNo, "Inward"),
        getAttachedGateEntries(sourceNo, "Inward"),
      ]);
      setRows(pending);
      setAttachedRows(attached);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(
        (error as ApiError).message ?? "Failed to load gate entry lines.",
      );
      setRows([]);
      setAttachedRows([]);
      setSelectedIds(new Set());
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAttached = async (row: AttachedGateEntry) => {
    setIsDeleting(rowId(row as any));
    try {
      await deleteAttachedGateEntry({
        entryType: row.Entry_Type,
        sourceType: row.Source_Type,
        sourceNo: row.Source_No,
        gateEntryNo: row.Gate_Entry_No,
        lineNo: row.Line_No,
      });
      toast.success("Gate entry attachment removed.");
      void loadRows();
    } catch (error) {
      toast.error(
        (error as ApiError).message ?? "Failed to remove attachment.",
      );
    } finally {
      setIsDeleting(null);
    }
  };

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      void loadRows();
    }
  };

  const toggleRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(rows.map((row) => rowId(row))));
  };

  const handlePushSelected = async () => {
    if (selectedRows.length === 0) {
      toast.error("Select at least one row.");
      return;
    }

    setIsPushing(true);
    try {
      await Promise.all(
        selectedRows.map((row) =>
          attachGateEntry({
            sourceType: row.Source_Type || "Purchase Order",
            sourceNo: sourceNo,
            entryType: row.Entry_Type || "Inward",
            gateEntryNo: row.Gate_Entry_No,
            lineNo: row.Line_No,
          }),
        ),
      );

      toast.success(
        `Attached ${selectedRows.length} gate entry line(s) successfully.`,
      );
      setSelectedIds(new Set());
      void loadRows();
    } catch (error) {
      toast.error(
        (error as ApiError).message ??
          "Failed to attach selected gate entries.",
      );
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <>
      <Button
        variant="default"
        size="sm"
        className="h-8"
        onClick={() => onOpenChange(true)}
        disabled={disabled || !sourceNo}
      >
        Post Gate Entry
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Post Gate Entry</DialogTitle>
            <DialogDescription>
              Select inward gate entry lines for source number {sourceNo || "-"}
              .
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                Pending ({rows.length})
              </TabsTrigger>
              <TabsTrigger value="attached">
                Attached ({attachedRows.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4 px-1">
              <div className="max-h-[400px] overflow-auto rounded-md border shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            allSelected
                              ? true
                              : someSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={(checked) =>
                            toggleAll(checked === true)
                          }
                          aria-label="Select all rows"
                        />
                      </TableHead>
                      <TableHead className="px-4 text-xs">Gate Entry No</TableHead>
                      <TableHead className="px-4 text-xs">Line No</TableHead>
                      <TableHead className="px-4 text-xs">Entry Type</TableHead>
                      <TableHead className="px-4 text-xs">Source Type</TableHead>
                      <TableHead className="px-4 text-xs">Source Name</TableHead>
                      <TableHead className="px-4 text-xs">Challan No</TableHead>
                      <TableHead className="px-4 text-xs">Challan Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-sm">
                          <span className="text-muted-foreground inline-flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading gate entry lines...
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-muted-foreground py-8 text-center text-sm"
                        >
                          No pending gate entry lines found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => {
                        const id = rowId(row);
                        return (
                          <TableRow key={id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(id)}
                                onCheckedChange={(checked) =>
                                  toggleRow(id, checked === true)
                                }
                                aria-label={`Select ${row.Gate_Entry_No} line ${row.Line_No}`}
                              />
                            </TableCell>
                            <TableCell className="px-4 text-xs">
                              {row.Gate_Entry_No}
                            </TableCell>
                            <TableCell className="px-4 text-xs">{row.Line_No}</TableCell>
                            <TableCell className="px-4 text-xs">
                              {row.Entry_Type || "-"}
                            </TableCell>
                            <TableCell className="px-4 text-xs">
                              {row.Source_Type || "-"}
                            </TableCell>
                            <TableCell className="px-4 text-xs">
                              {row.Source_Name || "-"}
                            </TableCell>
                            <TableCell className="px-4 text-xs">
                              {row.Challan_No || "-"}
                            </TableCell>
                            <TableCell className="px-4 text-xs">
                              {formatDate(row.Challan_Date)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="attached" className="mt-4 px-1">
              <div className="max-h-[400px] overflow-auto rounded-md border shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4 text-xs">Gate Entry No</TableHead>
                      <TableHead className="px-4 text-xs">Line No</TableHead>
                      <TableHead className="px-4 text-xs">Entry Type</TableHead>
                      <TableHead className="px-4 text-xs">Source Type</TableHead>
                      <TableHead className="w-10 px-4"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-sm">
                          <span className="text-muted-foreground inline-flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading attached lines...
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : attachedRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-muted-foreground py-8 text-center text-sm"
                        >
                          No attached gate entry lines found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attachedRows.map((row) => {
                        const id = rowId(row as any);
                        const isDeletingThis = isDeleting === id;
                        return (
                          <TableRow key={id}>
                            <TableCell className="px-4 text-xs">
                              {row.Gate_Entry_No}
                            </TableCell>
                            <TableCell className="px-4 text-xs">{row.Line_No}</TableCell>
                            <TableCell className="px-4 text-xs">
                              {row.Entry_Type || "-"}
                            </TableCell>
                            <TableCell className="px-4 text-xs">
                              {row.Source_Type || "-"}
                            </TableCell>
                            <TableCell className="px-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDeleteAttached(row)}
                                disabled={isDeletingThis}
                              >
                                {isDeletingThis ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="text-muted-foreground text-sm">
              {selectedCount} of {totalRows} selected
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                }}
                disabled={isPushing}
              >
                Close
              </Button>
              <Button
                onClick={handlePushSelected}
                disabled={isLoading || isPushing || selectedCount === 0}
              >
                {isPushing ? "Pushing..." : "Push Selected"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
