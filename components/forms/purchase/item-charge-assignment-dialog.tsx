"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Trash2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { itemChargeAssignmentService, ItemChargeAssignment, SourceType, ItemChargeSourceLine } from "@/lib/api/services/item-charge-assignment.service";
import { ItemChargeSelectionDialog } from "./item-charge-selection-dialog";
import { cn } from "@/lib/utils";

const FIELD_INPUT_CLASS = "disabled:opacity-100 disabled:text-foreground font-medium text-xs disabled:pointer-events-none disabled:bg-muted/30";

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
  
  // Selection Dialog State
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [selectionType, setSelectionType] = useState<SourceType>("Receipt");

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
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      toast.error("Failed to load existing assignments");
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
      const apiGetType = itemChargeAssignmentService.getApiGetType(selectionType);
      
      // Post all selected lines to the API
      await Promise.all(sourceLines.map(sl => 
        itemChargeAssignmentService.postAssignment({
          sourceDoc: docNo,
          sourceLine: docLineNo,
          getType: apiGetType,
          chargeDocNo: sl.Document_No,
          chargeLineNo: sl.Line_No,
          assignmentType: "Purchase"
        })
      ));

      toast.success(`Successfully added ${sourceLines.length} assignments`);
      await fetchAssignments();
    } catch (error) {
      console.error("Failed to post assignments:", error);
      toast.error("Failed to sync some assignments with the server");
      fetchAssignments();
    } finally {
      setLoading(false);
    }
  };

  // Filtered and Paginated Lines
  const filteredLines = useMemo(() => {
    let result = lines;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(line => 
        line.Applies_toDocNo.toLowerCase().includes(lowerQuery) ||
        line.Description.toLowerCase().includes(lowerQuery) ||
        line.ItemNo.toLowerCase().includes(lowerQuery) ||
        line.Applies_toDocType.toLowerCase().includes(lowerQuery)
      );
    }
    return result;
  }, [lines, searchQuery]);

  const totalPages = Math.ceil(filteredLines.length / pageSize) || 1;
  const paginatedLines = filteredLines.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  const handleDeleteLine = async (line: ItemChargeAssignment) => {
    try {
      setLoading(true);
      await itemChargeAssignmentService.deleteAssignment(line);
      setLines(prev => prev.filter(l => l.Line_No !== line.Line_No));
      const nextSelected = new Set(selectedLines);
      const uniqueKey = `${line.Applies_toDocNo}-${line.Line_No}`;
      nextSelected.delete(uniqueKey);
      setSelectedLines(nextSelected);
      toast.success("Assignment deleted");
    } catch (error) {
      console.error("Failed to delete assignment:", error);
      toast.error("Failed to delete assignment from server");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLine = (lineNo: number, field: keyof ItemChargeAssignment, value: number) => {
    setLines(prev => prev.map(l => l.Line_No === lineNo ? { ...l, [field]: value } : l));
  };

  // Calculations for Footer
  const totals = useMemo(() => {
    const toAssignQty = lines.reduce((sum, l) => sum + (Number(l.QtytoAssign) || 0), 0);
    const toAssignAmt = lines.reduce((sum, l) => sum + (Number(l.AmounttoAssign) || 0), 0);
    const toHandleQty = lines.reduce((sum, l) => sum + (Number(l.QtytoHandle) || 0), 0);
    const toHandleAmt = lines.reduce((sum, l) => sum + (Number(l.AmounttoHandle) || 0), 0);

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
    if (selectedLines.size === filteredLines.length && filteredLines.length > 0) {
      setSelectedLines(new Set());
    } else {
      setSelectedLines(new Set(filteredLines.map(l => `${l.Applies_toDocNo}-${l.Line_No}`)));
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

  const fieldInputClass = cn("h-full w-full rounded-none border-0 text-right tabular-nums focus:bg-background/80 transition-all font-bold pr-3 text-xs bg-transparent ring-0 focus-visible:ring-1 focus-visible:ring-primary/40", FIELD_INPUT_CLASS);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[95vw] w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden border-border bg-background shadow-2xl rounded-xl sm:border">
          <DialogHeader className="p-6 border-b border-border space-y-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                Item Charge Assignment (Purch)
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold tabular-nums">
                  {itemChargeNo} — {itemChargeDescription}
                </span>
              </DialogTitle>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 px-4 text-[11px] font-bold uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-all" onClick={() => handleOpenSelection("Receipt")}>
                Get Receipt Lines
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-4 text-[11px] font-bold uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-all" onClick={() => handleOpenSelection("SalesShipment")}>
                Get Sales Shipment Lines
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-4 text-[11px] font-bold uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-all" onClick={() => handleOpenSelection("Transfer")}>
                Get Transfer Receipt Lines
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-4 text-[11px] font-bold uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-all" onClick={() => handleOpenSelection("ReturnReceipt")}>
                Get Return Receipt Lines
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-4 text-[11px] font-bold uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-all" onClick={() => handleOpenSelection("ReturnShipment")}>
                Get Return Shipment Lines
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden bg-background/50">
            {/* Table Controls */}
            <div className="flex items-center justify-between gap-4 py-3 px-6 border-b bg-background/80 backdrop-blur-sm">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assignments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs focus-visible:ring-primary/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9 font-bold text-xs uppercase tracking-wider"
                  onClick={() => setSelectionOpen(true)}
                >
                  Add Lines
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4 scrollbar-thin">
              {loading && lines.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground font-medium animate-pulse">Fetching assignments...</p>
                  </div>
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden flex flex-col shadow-sm bg-background">
                  <div className="overflow-auto relative">
                    <Table className="relative w-full border-collapse">
                      <TableHeader className="bg-muted/80 sticky top-0 z-20 backdrop-blur-sm border-b border-border shadow-sm">
                        <TableRow className="h-12 hover:bg-transparent">
                          <TableHead className="w-12 text-center border-r border-border/50">
                            <Checkbox
                              checked={filteredLines.length > 0 && selectedLines.size === filteredLines.length}
                              onCheckedChange={toggleSelectAll}
                              className="rounded-sm"
                            />
                          </TableHead>
                          <TableHead className="w-[120px] text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter">Applies-to Doc. Type</TableHead>
                          <TableHead className="w-[150px] text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter">Applies-to Doc. No.</TableHead>
                          <TableHead className="w-[100px] text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter">Doc. Line No.</TableHead>
                          <TableHead className="w-[120px] text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter">Item No.</TableHead>
                          <TableHead className="min-w-[200px] text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter">Description</TableHead>
                          <TableHead className="w-[100px] text-right text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter bg-primary/5">Qty. to Assign</TableHead>
                          <TableHead className="w-[100px] text-right text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter bg-primary/5">Qty. to Handle</TableHead>
                          <TableHead className="w-[100px] text-right text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter">Qty. Assigned</TableHead>
                          <TableHead className="w-[130px] text-right text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter bg-primary/5">Amount to Assign</TableHead>
                          <TableHead className="w-[130px] text-right text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter bg-primary/5">Amount to Handle</TableHead>
                          <TableHead className="w-[100px] text-right text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter">Gross Weight</TableHead>
                          <TableHead className="w-[100px] text-right text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter">Unit Volume</TableHead>
                          <TableHead className="w-[120px] text-right text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter">Qty. Rec. (B)</TableHead>
                          <TableHead className="w-[120px] text-right text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter text-blue-600">Qty. Rec'd (B)</TableHead>
                          <TableHead className="w-[120px] text-right text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter">Qty. Ship (B)</TableHead>
                          <TableHead className="w-[120px] text-right text-[10px] font-black text-foreground border-r border-border/50 px-3 uppercase tracking-tighter text-green-600">Qty. Shipp'd (B)</TableHead>
                          <TableHead className="w-12 text-center px-3"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedLines.length === 0 ? (
                          <TableRow className="hover:bg-transparent border-none">
                            <TableCell colSpan={18} className="h-96 text-center text-muted-foreground text-sm font-medium opacity-50 italic">
                              {searchQuery ? "(No assignments match your search)" : "(There is nothing to show in this view)"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedLines.map((line) => {
                            const uniqueKey = `${line.Applies_toDocNo}-${line.Line_No}`;
                            const isSelected = selectedLines.has(uniqueKey);
                            return (
                              <TableRow
                                key={uniqueKey}
                                className={cn(
                                  "group h-10 border-b border-border transition-colors cursor-pointer",
                                  isSelected ? "bg-primary/5 shadow-inner" : "hover:bg-muted/30"
                                )}
                                onClick={() => toggleSelectLine(line)}
                              >
                                <TableCell className="text-center py-0 border-r border-border/50" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleSelectLine(line)}
                                    className="rounded-sm"
                                  />
                                </TableCell>
                                <TableCell className="text-[10px] py-0 border-r border-border/50 px-3 text-muted-foreground whitespace-nowrap">{line.Applies_toDocType || "—"}</TableCell>
                                <TableCell className="font-bold text-xs py-0 border-r border-border/50 px-3 tabular-nums text-primary/80">{line.Applies_toDocNo}</TableCell>
                                <TableCell className="text-[10px] py-0 border-r border-border/50 px-3 text-muted-foreground tabular-nums text-center">{line.Applies_toDocLineNo}</TableCell>
                                <TableCell className="text-xs font-semibold py-0 border-r border-border/50 px-3 tabular-nums">{line.ItemNo}</TableCell>
                                <TableCell className="text-[10px] py-0 border-r border-border/50 px-3 text-muted-foreground truncate max-w-[200px]">
                                  {line.Description}
                                </TableCell>
                                <TableCell className="p-0 border-r border-border/50 h-10 bg-primary/5" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    type="text"
                                    className={fieldInputClass}
                                    value={line.QtytoAssign}
                                    onChange={(e) => handleUpdateLine(line.Line_No, "QtytoAssign", parseFloat(e.target.value) || 0)}
                                  />
                                </TableCell>
                                <TableCell className="p-0 border-r border-border/50 h-10 bg-primary/5" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    type="text"
                                    className={fieldInputClass}
                                    value={line.QtytoHandle}
                                    onChange={(e) => handleUpdateLine(line.Line_No, "QtytoHandle", parseFloat(e.target.value) || 0)}
                                  />
                                </TableCell>
                                <TableCell className="text-right text-[11px] font-bold tabular-nums text-foreground/60 px-3 border-r border-border/50">{line.QtyAssigned}</TableCell>
                                <TableCell className="p-0 border-r border-border/50 h-10 bg-primary/5" onClick={(e) => e.stopPropagation()}>
                                  <Input 
                                    type="text"
                                    className={fieldInputClass}
                                    value={line.AmounttoAssign}
                                    onChange={(e) => handleUpdateLine(line.Line_No, "AmounttoAssign", parseFloat(e.target.value) || 0)}
                                  />
                                </TableCell>
                                <TableCell className="p-0 border-r border-border/50 h-10 bg-primary/5" onClick={(e) => e.stopPropagation()}>
                                  <Input 
                                    type="text"
                                    className={fieldInputClass}
                                    value={line.AmounttoHandle}
                                    onChange={(e) => handleUpdateLine(line.Line_No, "AmounttoHandle", parseFloat(e.target.value) || 0)}
                                  />
                                </TableCell>
                                <TableCell className="text-right text-[11px] tabular-nums text-muted-foreground px-3 border-r border-border/50">{line.GrossWeight}</TableCell>
                                <TableCell className="text-right text-[11px] tabular-nums text-muted-foreground px-3 border-r border-border/50">{line.UnitVolume}</TableCell>
                                <TableCell className="text-right text-[11px] tabular-nums text-muted-foreground px-3 border-r border-border/50">{line.QtyToReceiveBase || 0}</TableCell>
                                <TableCell className="text-right text-[11px] font-bold tabular-nums text-blue-600 px-3 border-r border-border/50">{line.QtyReceivedBase || 0}</TableCell>
                                <TableCell className="text-right text-[11px] tabular-nums text-muted-foreground px-3 border-r border-border/50">{line.QtyToShipBase || 0}</TableCell>
                                <TableCell className="text-right text-[11px] font-bold tabular-nums text-green-600 px-3 border-r border-border/50">{line.QtyShippedBase || 0}</TableCell>
                                <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteLine(line)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Section */}
                  <div className="border-t px-4 py-3 flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">Rows per page:</span>
                        <Select
                          value={pageSize.toString()}
                          onValueChange={(val) => setPageSize(Number(val))}
                        >
                          <SelectTrigger className="w-16 h-8 text-xs font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[10, 20, 50, 100].map((size) => (
                              <SelectItem key={size} value={size.toString()} className="text-xs">
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        {filteredLines.length} {filteredLines.length === 1 ? 'record' : 'records'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => prev - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => prev + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Totals Section */}
            {!loading && lines.length > 0 && (
              <div className="bg-muted/10 border-t border-border overflow-x-auto">
                <Table className="border-collapse">
                  <TableHeader className="bg-transparent">
                    <TableRow className="h-8 hover:bg-transparent border-none">
                      <TableHead className="w-[150px]"></TableHead>
                      <TableHead className="w-[120px] text-[10px] font-black text-muted-foreground uppercase text-right px-6">Assignable</TableHead>
                      <TableHead className="w-[120px] text-[10px] font-black text-muted-foreground uppercase text-right px-6">To Assign</TableHead>
                      <TableHead className="w-[120px] text-[10px] font-black text-muted-foreground uppercase text-right px-6">Rem. to Assign</TableHead>
                      <TableHead className="w-[120px] text-[10px] font-black text-muted-foreground uppercase text-right px-6">To Handle</TableHead>
                      <TableHead className="w-[120px] text-[10px] font-black text-muted-foreground uppercase text-right px-6">Rem. to Handle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="h-10 hover:bg-transparent border-none">
                      <TableCell className="text-xs font-bold text-foreground px-6 py-0">Total (Qty.)</TableCell>
                      <TableCell className="text-sm font-black tabular-nums text-right px-6 py-0">{totals.assignableQty.toLocaleString()}</TableCell>
                      <TableCell className="text-sm font-black tabular-nums text-right px-6 py-0">{totals.toAssignQty.toLocaleString()}</TableCell>
                      <TableCell className={cn("text-sm font-black tabular-nums text-right px-6 py-0", totals.remToAssignQty !== 0 ? "text-destructive" : "text-green-600")}>{totals.remToAssignQty.toLocaleString()}</TableCell>
                      <TableCell className="text-sm font-black tabular-nums text-right px-6 py-0">{totals.toHandleQty.toLocaleString()}</TableCell>
                      <TableCell className={cn("text-sm font-black tabular-nums text-right px-6 py-0", totals.remToHandleQty !== 0 ? "text-destructive" : "text-green-600")}>{totals.remToHandleQty.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow className="h-10 hover:bg-transparent border-none">
                      <TableCell className="text-xs font-bold text-foreground px-6 py-0">Total (Amount)</TableCell>
                      <TableCell className="text-sm font-black tabular-nums text-right px-6 py-0">{totals.assignableAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-sm font-black tabular-nums text-right px-6 py-0">{totals.toAssignAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className={cn("text-sm font-black tabular-nums text-right px-6 py-0", totals.remToAssignAmt !== 0 ? "text-destructive" : "text-green-600")}>{totals.remToAssignAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-sm font-black tabular-nums text-right px-6 py-0">{totals.toHandleAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className={cn("text-sm font-black tabular-nums text-right px-6 py-0", totals.remToHandleAmt !== 0 ? "text-destructive" : "text-green-600")}>{totals.remToHandleAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 border-t border-border bg-background items-center flex justify-end gap-3 shadow-top-lg">
            <Button 
              variant="outline" 
              size="default" 
              className="px-8 font-bold h-11 border-border/50" 
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
    </>
  );
}
