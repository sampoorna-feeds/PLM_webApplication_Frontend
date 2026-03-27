"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorDialog, ErrorDetail } from "@/components/ui/error-dialog";
import {
  itemChargeAssignmentService,
  ItemChargeAssignment,
  SourceType,
  ItemChargeSourceLine,
} from "@/lib/api/services/item-charge-assignment.service";
import { ItemChargeSelectionDialog } from "./item-charge-selection-dialog";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

const FIELD_INPUT_CLASS =
  "disabled:opacity-100 disabled:text-foreground font-normal text-xs disabled:pointer-events-none disabled:bg-muted/30";

type SortDirection = "asc" | "desc" | null;

interface ColumnConfig {
  id: keyof ItemChargeAssignment | string;
  label: string;
  sortable?: boolean;
  filterType?: "text" | "number" | "date";
  align?: "left" | "right" | "center";
  width?: string;
}

const ASSIGNMENT_COLUMNS: ColumnConfig[] = [
  {
    id: "Applies_toDocType",
    label: "Applies-to Doc. Type",
    sortable: true,
    filterType: "text",
    width: "120px",
  },
  {
    id: "Applies_toDocNo",
    label: "Applies-to Doc. No.",
    sortable: true,
    filterType: "text",
    width: "150px",
  },
  {
    id: "Applies_toDocLineNo",
    label: "Doc. Line No.",
    sortable: true,
    filterType: "number",
    width: "100px",
    align: "center",
  },
  {
    id: "ItemNo",
    label: "Item No.",
    sortable: true,
    filterType: "text",
    width: "120px",
  },
  {
    id: "Description",
    label: "Description",
    sortable: true,
    filterType: "text",
    width: "200px",
  },
  {
    id: "QtytoAssign",
    label: "Qty. to Assign",
    sortable: true,
    filterType: "number",
    width: "100px",
    align: "right",
  },
  {
    id: "QtytoHandle",
    label: "Qty. to Handle",
    sortable: true,
    filterType: "number",
    width: "100px",
    align: "right",
  },
  {
    id: "QtyAssigned",
    label: "Qty. Assigned",
    sortable: true,
    filterType: "number",
    width: "100px",
    align: "right",
  },
  {
    id: "AmounttoAssign",
    label: "Amount to Assign",
    sortable: true,
    filterType: "number",
    width: "130px",
    align: "right",
  },
  {
    id: "AmounttoHandle",
    label: "Amount to Handle",
    sortable: true,
    filterType: "number",
    width: "130px",
    align: "right",
  },
  {
    id: "GrossWeight",
    label: "Gross Weight",
    sortable: true,
    filterType: "number",
    width: "100px",
    align: "right",
  },
  {
    id: "UnitVolume",
    label: "Unit Volume",
    sortable: true,
    filterType: "number",
    width: "100px",
    align: "right",
  },
  {
    id: "QtyToReceiveBase",
    label: "Qty. Rec. (B)",
    sortable: true,
    filterType: "number",
    width: "120px",
    align: "right",
  },
  {
    id: "QtyReceivedBase",
    label: "Qty. Rec'd (B)",
    sortable: true,
    filterType: "number",
    width: "120px",
    align: "right",
  },
  {
    id: "QtyToShipBase",
    label: "Qty. Ship (B)",
    sortable: true,
    filterType: "number",
    width: "120px",
    align: "right",
  },
  {
    id: "QtyShippedBase",
    label: "Qty. Shipp'd (B)",
    sortable: true,
    filterType: "number",
    width: "120px",
    align: "right",
  },
];

interface ItemChargeAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docType: string;
  docNo: string;
  docLineNo: number;
  itemChargeNo: string;
  itemChargeDescription: string;
  totalQuantity: number;
  totalAmount: number;
}

export function ItemChargeAssignmentDialog({
  open,
  onOpenChange,
  docType,
  docNo,
  docLineNo,
  itemChargeNo,
  itemChargeDescription,
  totalQuantity,
  totalAmount,
}: ItemChargeAssignmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [lines, setLines] = useState<ItemChargeAssignment[]>([]);
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());

  // Sorting State
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Filtering State
  const [columnFilters, setColumnFilters] = useState<
    Record<string, { value: string; valueTo?: string }>
  >({});

  // Selection Dialog State
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [selectionType, setSelectionType] = useState<SourceType>("Receipt");

  // Error Dialog State
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [apiErrors, setApiErrors] = useState<ErrorDetail[]>([]);

  const showError = (title: string, message: string, error?: any) => {
    setErrorTitle(title);
    setErrorMessage(message);
    if (error) {
      setApiErrors([
        {
          message: error.message || "Unknown error occurred",
          code: error.code,
          status: error.status,
          details: error.details,
        },
      ]);
    } else {
      setApiErrors([]);
    }
    setErrorDialogOpen(true);
  };

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await itemChargeAssignmentService.getAssignments({
        docType,
        docNo,
        docLineNo,
        itemChargeNo,
      });
      setLines(data);
    } catch (error: any) {
      console.error("Failed to fetch assignments:", error);
      showError(
        "Fetch Failed",
        "Could not load assignments from the server.",
        error,
      );
    } finally {
      setLoading(false);
    }
  }, [docType, docNo, docLineNo, itemChargeNo]);

  useEffect(() => {
    if (open) {
      fetchAssignments();
      setSelectedLines(new Set());
    }
  }, [open, fetchAssignments]);

  const handleOpenSelection = (type: SourceType) => {
    setSelectionType(type);
    setSelectionOpen(true);
  };

  const handleLinesAdded = async (sourceLines: ItemChargeSourceLine[]) => {
    setLoading(true);
    try {
      const apiGetType =
        itemChargeAssignmentService.getApiGetType(selectionType);

      // Post all selected lines to the API
      await Promise.all(
        sourceLines.map((sl) =>
          itemChargeAssignmentService.postAssignment({
            sourceDoc: docNo,
            sourceLine: docLineNo,
            getType: apiGetType,
            chargeDocNo: sl.Document_No,
            chargeLineNo: sl.Line_No,
            assignmentType: "Purchase",
          }),
        ),
      );

      toast.success(`Successfully added ${sourceLines.length} assignments`);
      await fetchAssignments();
    } catch (error: any) {
      console.error("Failed to post assignments:", error);
      showError(
        "Assignment Failed",
        "Failed to sync some assignments with the server.",
        error,
      );
      await fetchAssignments();
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = async (criteria: string) => {
    try {
      setLoading(true);
      await itemChargeAssignmentService.suggestAssignment({
        docNo,
        lineNo: docLineNo,
        totalQtyToAssign: totalQuantity,
        tTotalAmtToAssign: totalAmount,
        totalQtyToHandle: totalQuantity,
        totalAmtToHandle: totalAmount,
        selectionTxt: criteria,
      });

      toast.success(`Successfully suggested assignments by ${criteria}`);
      await fetchAssignments();
    } catch (error: any) {
      console.error("Failed to suggest assignments:", error);
      showError(
        "Suggestion Failed",
        "Failed to suggest assignments. Please try again or assign manually.",
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  // Filtered and Sorted Lines
  const filteredAndSortedLines = useMemo(() => {
    let result = lines;

    // 1. Global search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (line) =>
          line.Applies_toDocNo.toLowerCase().includes(lowerQuery) ||
          line.Description.toLowerCase().includes(lowerQuery) ||
          line.ItemNo.toLowerCase().includes(lowerQuery) ||
          line.Applies_toDocType.toLowerCase().includes(lowerQuery),
      );
    }

    // 2. Column filters
    Object.entries(columnFilters).forEach(([columnId, filter]) => {
      if (!filter.value && !filter.valueTo) return;

      result = result.filter((line) => {
        const value = (line as any)[columnId];
        if (value === null || value === undefined) return false;

        const stringValue = String(value).toLowerCase();
        const filterValue = filter.value.toLowerCase();

        // Basic text filter (comma separated)
        if (filterValue.includes(",")) {
          const parts = filterValue
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
          return parts.some((p) => stringValue.includes(p));
        }

        return stringValue.includes(filterValue);
      });
    });

    // 3. Sorting
    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        const valA = (a as any)[sortColumn];
        const valB = (b as any)[sortColumn];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        const comparison = valA < valB ? -1 : 1;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [lines, searchQuery, columnFilters, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedLines.length / pageSize) || 1;
  const paginatedLines = filteredAndSortedLines.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  const handleDeleteLine = async (line: ItemChargeAssignment) => {
    try {
      setLoading(true);
      await itemChargeAssignmentService.deleteAssignment(line);
      setLines((prev) => prev.filter((l) => l.Line_No !== line.Line_No));
      const nextSelected = new Set(selectedLines);
      const uniqueKey = `${line.Applies_toDocNo}-${line.Line_No}`;
      nextSelected.delete(uniqueKey);
      setSelectedLines(nextSelected);
      toast.success("Assignment deleted");
    } catch (error: any) {
      console.error("Failed to delete assignment:", error);
      showError(
        "Deletion Failed",
        "Failed to delete assignment from server.",
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLine = (
    lineNo: number,
    field: keyof ItemChargeAssignment,
    value: number,
  ) => {
    setLines((prev) =>
      prev.map((l) => (l.Line_No === lineNo ? { ...l, [field]: value } : l)),
    );
  };

  // Calculations for Footer
  const totals = useMemo(() => {
    const toAssignQty = lines.reduce(
      (sum, l) => sum + (Number(l.QtytoAssign) || 0),
      0,
    );
    const toAssignAmt = lines.reduce(
      (sum, l) => sum + (Number(l.AmounttoAssign) || 0),
      0,
    );
    const toHandleQty = lines.reduce(
      (sum, l) => sum + (Number(l.QtytoHandle) || 0),
      0,
    );
    const toHandleAmt = lines.reduce(
      (sum, l) => sum + (Number(l.AmounttoHandle) || 0),
      0,
    );

    return {
      assignableQty: totalQuantity,
      assignableAmt: totalAmount,
      toAssignQty,
      toAssignAmt,
      remToAssignQty: totalQuantity - toAssignQty,
      remToAssignAmt: totalAmount - toAssignAmt,
      toHandleQty,
      toHandleAmt,
      remToHandleQty: totalQuantity - toHandleQty,
      remToHandleAmt: totalAmount - toHandleAmt,
    };
  }, [lines, totalQuantity, totalAmount]);

  const toggleSelectAll = () => {
    if (
      selectedLines.size === filteredAndSortedLines.length &&
      filteredAndSortedLines.length > 0
    ) {
      setSelectedLines(new Set());
    } else {
      setSelectedLines(
        new Set(
          filteredAndSortedLines.map(
            (l) => `${l.Applies_toDocNo}-${l.Line_No}`,
          ),
        ),
      );
    }
  };

  const toggleSelectLine = (line: ItemChargeAssignment) => {
    const uniqueKey = `${line.Applies_toDocNo}-${line.Line_No}`;
    const next = new Set(selectedLines);
    if (next.has(uniqueKey)) {
      next.delete(uniqueKey);
    } else {
      next.add(uniqueKey);
    }
    setSelectedLines(next);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) =>
        prev === "asc" ? "desc" : prev === "desc" ? null : "asc",
      );
      if (sortDirection === "desc") setSortColumn(null);
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleColumnFilter = (
    columnId: string,
    value: string,
    valueTo?: string,
  ) => {
    setColumnFilters((prev) => {
      if (!value && !valueTo) {
        const { [columnId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [columnId]: { value, valueTo } };
    });
    setCurrentPage(1);
  };

  const fieldInputClass = cn(
    "h-full w-full rounded-none border-0 text-center tabular-nums focus:bg-background/80 transition-all pr-0 text-xs bg-transparent ring-0 focus-visible:ring-1 focus-visible:ring-primary/40",
    FIELD_INPUT_CLASS,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="border-border bg-background flex h-[95vh] w-[95vw] flex-col gap-0 space-y-0 overflow-hidden rounded-xl p-0 shadow-2xl sm:max-w-[95vw] sm:border">
          <DialogHeader className="border-border space-y-3 border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-foreground flex items-center gap-2 text-lg font-extrabold tracking-tight">
                Item Charge Assignment (Purch)
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums">
                  {itemChargeNo} — {itemChargeDescription}
                </span>
              </DialogTitle>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-primary hover:text-primary-foreground flex h-7 items-center gap-1.5 px-3 text-[10px] font-bold tracking-wider uppercase transition-all"
                onClick={() => handleOpenSelection("Receipt")}
              >
                <ArrowUp className="h-3 w-3" />
                Get Receipt Lines
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-primary hover:text-primary-foreground flex h-7 items-center gap-1.5 px-3 text-[10px] font-bold tracking-wider uppercase transition-all"
                onClick={() => handleOpenSelection("SalesShipment")}
              >
                <ArrowDown className="h-3 w-3" />
                Get Sales Shipment Lines
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-primary hover:text-primary-foreground flex h-7 items-center gap-1.5 px-3 text-[10px] font-bold tracking-wider uppercase transition-all"
                onClick={() => handleOpenSelection("Transfer")}
              >
                <ArrowUpDown className="h-3 w-3" />
                Get Transfer Receipt Lines
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-primary hover:text-primary-foreground flex h-7 items-center gap-1.5 px-3 text-[10px] font-bold tracking-wider uppercase transition-all"
                onClick={() => handleOpenSelection("ReturnReceipt")}
              >
                <ChevronRight className="h-3 w-3" />
                Get Return Receipt Lines
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-primary hover:text-primary-foreground flex h-7 items-center gap-1.5 px-3 text-[10px] font-bold tracking-wider uppercase transition-all"
                onClick={() => handleOpenSelection("ReturnShipment")}
              >
                <ChevronLeft className="h-3 w-3" />
                Get Return Shipment Lines
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hover:bg-primary hover:text-primary-foreground border-primary/50 text-primary flex h-7 items-center gap-1.5 px-3 text-[10px] font-bold tracking-wider uppercase transition-all"
                    disabled={loading}
                  >
                    <Zap className="h-3 w-3 fill-current" />
                    Suggest Assignment
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem
                    className="text-xs font-medium"
                    onClick={() => handleSuggest("Equally")}
                  >
                    Equally
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs font-medium"
                    onClick={() => handleSuggest("By Amount")}
                  >
                    By Amount
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs font-medium"
                    onClick={() => handleSuggest("By Weight")}
                  >
                    By Weight
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs font-medium"
                    onClick={() => handleSuggest("By Volume")}
                  >
                    By Volume
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="relative w-full">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search assignments by Doc No, Item No or Description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </DialogHeader>

          <div className="bg-background/50 flex flex-1 flex-col overflow-hidden">
            {loading && lines.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="text-primary h-12 w-12 animate-spin" />
                  <p className="text-muted-foreground animate-pulse font-medium">
                    Fetching assignments...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-hidden">
                  <div className="bg-background flex h-full flex-col overflow-hidden">
                    <div className="relative flex-1 overflow-auto">
                      <Table className="relative w-full border-collapse">
                        <TableHeader className="bg-muted border-border sticky top-0 z-30 border-b shadow-sm">
                          <TableRow className="h-9 hover:bg-transparent [&_th]:border-b">
                            <TableHead className="bg-muted sticky left-0 z-40 w-16 px-4 text-center align-middle">
                              <Checkbox
                                checked={
                                  filteredAndSortedLines.length > 0 &&
                                  selectedLines.size ===
                                    filteredAndSortedLines.length
                                }
                                onCheckedChange={toggleSelectAll}
                                className="mr-3 rounded-none shadow-none"
                              />
                            </TableHead>
                            {ASSIGNMENT_COLUMNS.map((col) => (
                              <SortableTableHead
                                key={col.id}
                                column={col}
                                isActive={sortColumn === col.id}
                                sortDirection={
                                  sortColumn === col.id ? sortDirection : null
                                }
                                filterValue={columnFilters[col.id]?.value ?? ""}
                                onSort={handleSort}
                                onFilter={handleColumnFilter}
                              />
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedLines.length === 0 ? (
                            <TableRow className="border-none hover:bg-transparent">
                              <TableCell
                                colSpan={18}
                                className="text-muted-foreground h-96 text-center text-sm font-medium italic opacity-50"
                              >
                                {searchQuery
                                  ? "(No assignments match your search)"
                                  : "(There is nothing to show in this view)"}
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedLines.map((line) => {
                              const uniqueKey = `${line.Applies_toDocNo}-${line.Line_No}`;
                              const isSelected = selectedLines.has(uniqueKey);
                              return (
                                <TableRow
                                  key={uniqueKey}
                                  className="group border-border h-9 cursor-pointer border-b transition-colors"
                                  onClick={() => toggleSelectLine(line)}
                                >
                                  <TableCell
                                    className="bg-background sticky left-0 z-20 w-16 px-4 text-center align-middle transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() =>
                                        toggleSelectLine(line)
                                      }
                                      className="mr-3 rounded-none shadow-none"
                                    />
                                  </TableCell>
                                  <TableCell className="px-3 py-0 text-center align-middle text-[10px] whitespace-nowrap">
                                    {line.Applies_toDocType || "—"}
                                  </TableCell>
                                  <TableCell className="text-primary px-3 py-0 text-center align-middle text-xs tabular-nums">
                                    {line.Applies_toDocNo}
                                  </TableCell>
                                  <TableCell className="px-3 py-0 text-center align-middle text-[10px] tabular-nums">
                                    {line.Applies_toDocLineNo}
                                  </TableCell>
                                  <TableCell className="px-3 py-0 text-center align-middle text-xs tabular-nums">
                                    {line.ItemNo}
                                  </TableCell>
                                  <TableCell className="max-w-[200px] truncate px-3 py-0 text-center align-middle text-[10px]">
                                    {line.Description}
                                  </TableCell>
                                  <TableCell
                                    className="h-9 p-0 text-center align-middle"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Input
                                      type="text"
                                      className={fieldInputClass}
                                      style={{ height: "36px" }}
                                      value={line.QtytoAssign}
                                      onChange={(e) =>
                                        handleUpdateLine(
                                          line.Line_No,
                                          "QtytoAssign",
                                          parseFloat(e.target.value) || 0,
                                        )
                                      }
                                    />
                                  </TableCell>
                                  <TableCell
                                    className="h-9 p-0 text-center align-middle"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Input
                                      type="text"
                                      className={fieldInputClass}
                                      style={{ height: "36px" }}
                                      value={line.QtytoHandle}
                                      onChange={(e) =>
                                        handleUpdateLine(
                                          line.Line_No,
                                          "QtytoHandle",
                                          parseFloat(e.target.value) || 0,
                                        )
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="px-3 text-center align-middle text-[11px] tabular-nums">
                                    {line.QtyAssigned}
                                  </TableCell>
                                  <TableCell
                                    className="h-9 p-0 text-center align-middle"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Input
                                      type="text"
                                      className={fieldInputClass}
                                      style={{ height: "36px" }}
                                      value={line.AmounttoAssign}
                                      onChange={(e) =>
                                        handleUpdateLine(
                                          line.Line_No,
                                          "AmounttoAssign",
                                          parseFloat(e.target.value) || 0,
                                        )
                                      }
                                    />
                                  </TableCell>
                                  <TableCell
                                    className="h-9 p-0 text-center align-middle"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Input
                                      type="text"
                                      className={fieldInputClass}
                                      style={{ height: "36px" }}
                                      value={line.AmounttoHandle}
                                      onChange={(e) =>
                                        handleUpdateLine(
                                          line.Line_No,
                                          "AmounttoHandle",
                                          parseFloat(e.target.value) || 0,
                                        )
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="px-3 py-0 text-center align-middle text-[11px] tabular-nums">
                                    {line.GrossWeight}
                                  </TableCell>
                                  <TableCell className="px-3 py-0 text-center align-middle text-[11px] tabular-nums">
                                    {line.UnitVolume}
                                  </TableCell>
                                  <TableCell className="px-3 py-0 text-center align-middle text-[11px] tabular-nums">
                                    {line.QtyToReceiveBase || 0}
                                  </TableCell>
                                  <TableCell className="px-3 py-0 text-center align-middle text-[11px] tabular-nums">
                                    {line.QtyReceivedBase || 0}
                                  </TableCell>
                                  <TableCell className="px-3 py-0 text-center align-middle text-[11px] tabular-nums">
                                    {line.QtyToShipBase || 0}
                                  </TableCell>
                                  <TableCell className="px-3 py-0 text-center align-middle text-[11px] tabular-nums">
                                    {line.QtyShippedBase || 0}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Section */}
                    <div className="bg-muted/20 flex items-center justify-between border-t px-4 py-1.5">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                            Rows:
                          </span>
                          <Select
                            value={pageSize.toString()}
                            onValueChange={(val) => setPageSize(Number(val))}
                          >
                            <SelectTrigger className="bg-background h-7 w-14 text-[10px] font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent title="Rows per page">
                              {[10, 20, 50, 100].map((size) => (
                                <SelectItem
                                  key={size}
                                  value={size.toString()}
                                  className="text-[10px]"
                                >
                                  {size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                          {filteredAndSortedLines.length} Records
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                          Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="bg-background h-7 w-7"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((prev) => prev - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="bg-background h-7 w-7"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((prev) => prev + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Totals Section */}
                {!loading && lines.length > 0 && (
                  <div className="bg-muted/10 border-border overflow-x-auto border-t px-4 py-2">
                    <Table className="border-collapse">
                      <TableHeader className="bg-transparent">
                        <TableRow className="h-6 border-none hover:bg-transparent">
                          <TableHead className="h-6 w-[150px]"></TableHead>
                          <TableHead className="text-muted-foreground h-6 w-[120px] px-4 text-right text-[9px] font-black uppercase">
                            Assignable
                          </TableHead>
                          <TableHead className="text-muted-foreground h-6 w-[120px] px-4 text-right text-[9px] font-black uppercase">
                            To Assign
                          </TableHead>
                          <TableHead className="text-muted-foreground h-6 w-[120px] px-4 text-right text-[9px] font-black uppercase">
                            Rem. to Assign
                          </TableHead>
                          <TableHead className="text-muted-foreground h-6 w-[120px] px-4 text-right text-[9px] font-black uppercase">
                            To Handle
                          </TableHead>
                          <TableHead className="text-muted-foreground h-6 w-[120px] px-4 text-right text-[9px] font-black uppercase">
                            Rem. to Handle
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="h-7 border-none hover:bg-transparent">
                          <TableCell className="text-foreground h-7 px-4 py-0 text-[11px] font-bold">
                            Total (Qty.)
                          </TableCell>
                          <TableCell className="h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums">
                            {totals.assignableQty.toLocaleString()}
                          </TableCell>
                          <TableCell className="h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums">
                            {totals.toAssignQty.toLocaleString()}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums",
                              totals.remToAssignQty !== 0
                                ? "text-destructive"
                                : "text-green-600",
                            )}
                          >
                            {totals.remToAssignQty.toLocaleString()}
                          </TableCell>
                          <TableCell className="h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums">
                            {totals.toHandleQty.toLocaleString()}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums",
                              totals.remToHandleQty !== 0
                                ? "text-destructive"
                                : "text-green-600",
                            )}
                          >
                            {totals.remToHandleQty.toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow className="h-7 border-none hover:bg-transparent">
                          <TableCell className="text-foreground h-7 px-4 py-0 text-[11px] font-bold">
                            Total (Amount)
                          </TableCell>
                          <TableCell className="h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums">
                            {totals.assignableAmt.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums">
                            {totals.toAssignAmt.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums",
                              totals.remToAssignAmt !== 0
                                ? "text-destructive"
                                : "text-green-600",
                            )}
                          >
                            {totals.remToAssignAmt.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums">
                            {totals.toHandleAmt.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "h-7 px-4 py-0 text-right text-[12px] font-black tabular-nums",
                              totals.remToHandleAmt !== 0
                                ? "text-destructive"
                                : "text-green-600",
                            )}
                          >
                            {totals.remToHandleAmt.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="border-border bg-background shadow-top-lg flex items-center justify-end gap-2 border-t px-4 py-2">
            <Button
              variant={"destructive"}
              className="border-destructive/50 border-3 px-6"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ItemChargeSelectionDialog
        open={selectionOpen}
        onOpenChange={setSelectionOpen}
        type={selectionType}
        onAddSelected={handleLinesAdded}
      />

      <ErrorDialog
        open={errorDialogOpen}
        onOpenChange={setErrorDialogOpen}
        title={errorTitle}
        message={errorMessage}
        errors={apiErrors}
      />
    </>
  );
}

interface SortableTableHeadProps {
  column: ColumnConfig;
  isActive: boolean;
  sortDirection: SortDirection;
  filterValue: string;
  onSort: (column: string) => void;
  onFilter: (columnId: string, value: string, valueTo?: string) => void;
}

function SortableTableHead({
  column,
  isActive,
  sortDirection,
  filterValue,
  onSort,
  onFilter,
}: SortableTableHeadProps) {
  const getSortIcon = () => {
    if (!isActive || !sortDirection) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-3 w-3" />;
    }
    return <ArrowDown className="h-3 w-3" />;
  };

  return (
    <th
      className={cn(
        "bg-muted text-foreground h-10 px-3 py-3 text-left align-middle text-[10px] font-bold tracking-tight whitespace-nowrap uppercase select-none",
        isActive && "text-primary",
      )}
      style={{ width: column.width }}
    >
      <div
        className={cn(
          "flex items-center gap-1.5",
          column.align === "right"
            ? "justify-end"
            : column.align === "center"
              ? "justify-center"
              : "",
        )}
      >
        <span
          className="hover:text-primary cursor-pointer transition-colors"
          onClick={() => column.sortable && onSort(column.id as string)}
        >
          {column.label}
        </span>
        {column.sortable && (
          <button
            type="button"
            className="hover:text-primary transition-colors"
            onClick={() => onSort(column.id as string)}
          >
            {getSortIcon()}
          </button>
        )}
        {column.filterType && (
          <ColumnFilter
            column={column}
            value={filterValue}
            onChange={(value) => onFilter(column.id as string, value)}
          />
        )}
      </div>
    </th>
  );
}

interface ColumnFilterProps {
  column: ColumnConfig;
  value: string;
  onChange: (value: string) => void;
}

function ColumnFilter({ column, value, onChange }: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const hasFilter = !!value;

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleApply = () => {
    onChange(localValue);
    setOpen(false);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "hover:bg-background/50 rounded p-0.5 transition-colors",
            hasFilter
              ? "text-primary"
              : "text-muted-foreground/50 hover:text-muted-foreground",
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Filter className={cn("h-3 w-3", hasFilter ? "fill-current" : "")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <Label className="text-xs font-medium">Filter {column.label}</Label>
          <Input
            placeholder="Search..."
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={handleApply}
          >
            Apply
          </Button>
          {hasFilter && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
