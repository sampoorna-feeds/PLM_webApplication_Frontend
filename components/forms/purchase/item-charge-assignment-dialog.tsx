"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw } from "lucide-react";
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
import { itemChargeAssignmentService, ItemChargeAssignment, SourceType } from "@/lib/api/services/item-charge-assignment.service";
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
  const [lines, setLines] = useState<ItemChargeAssignment[]>([]);
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());

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

  const handleGetLines = async (type: SourceType) => {
    try {
      setLoading(true);
      // Pass docNo to filter source lines by the current document
      const sourceLines = await itemChargeAssignmentService.getSourceLines(type, docNo);
      
      const newLines: ItemChargeAssignment[] = sourceLines.map((sl, idx) => ({
        Document_Type: docType,
        Document_No: docNo,
        Document_Line_No: docLineNo,
        Line_No: (lines.length + idx + 1) * 10000,
        ItemChargeNo: itemChargeNo,
        Applies_toDocType: type === "Receipt" ? "Receipt" : type,
        Applies_toDocNo: sl.Document_No,
        Applies_toDocLineNo: sl.Line_No,
        ItemNo: sl.No || sl.Item_No || "",
        Description: sl.Description,
        QtytoAssign: 0,
        QtytoHandle: 0,
        QtyAssigned: 0,
        AmounttoAssign: 0,
        AmounttoHandle: 0,
        GrossWeight: 0,
        UnitVolume: 0,
      }));

      setLines(prev => [...prev, ...newLines]);
      toast.success(`Fetched ${newLines.length} lines from ${type}`);
    } catch (error) {
      console.error(`Failed to fetch ${type} lines:`, error);
      toast.error(`Failed to load ${type} lines`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLines.size === lines.length && lines.length > 0) {
      setSelectedLines(new Set());
    } else {
      setSelectedLines(new Set(lines.map(l => l.Line_No)));
    }
  };

  const toggleSelectLine = (lineNo: number) => {
    const next = new Set(selectedLines);
    if (next.has(lineNo)) {
      next.delete(lineNo);
    } else {
      next.add(lineNo);
    }
    setSelectedLines(next);
  };

  const handleSave = () => {
    toast.success("Assignment saved");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl h-[90vh] flex flex-col p-0 overflow-hidden border-border bg-background shadow-none rounded-lg sm:border">
        <DialogHeader className="p-6 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Item Charge Assignment
              <span className="text-muted-foreground font-medium text-sm ml-3 tabular-nums">
                {itemChargeNo} — {itemChargeDescription}
              </span>
            </DialogTitle>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider" onClick={() => handleGetLines("Receipt")}>
              Get Receipt Lines
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider" onClick={() => handleGetLines("SalesShipment")}>
              Get Shipment Lines
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider" onClick={() => handleGetLines("Transfer")}>
              Get Transfer Lines
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider" onClick={() => handleGetLines("ReturnReceipt")}>
              Get Return Receipt Lines
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider" onClick={() => handleGetLines("ReturnShipment")}>
              Get Return Shipment Lines
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-background p-4 sm:p-6 ml-0">
          {loading && lines.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex-1 min-h-0 border border-border rounded-md overflow-hidden flex flex-col shadow-sm">
              <div className="overflow-auto flex-1">
                <Table className="relative w-full">
                  <TableHeader className="bg-primary/5 sticky top-0 z-10 border-b border-primary/20">
                    <TableRow className="h-10 hover:bg-transparent border-none">
                      <TableHead className="w-12 text-center border-r border-border/50">
                        <Checkbox 
                          checked={lines.length > 0 && selectedLines.size === lines.length}
                          onCheckedChange={toggleSelectAll}
                          className="rounded-sm"
                        />
                      </TableHead>
                      <TableHead className="w-[180px] text-[10px] font-bold text-primary border-r border-border/50 px-3 uppercase tracking-wider">Source No.</TableHead>
                      <TableHead className="w-[100px] text-[10px] font-bold text-primary border-r border-border/50 px-3 uppercase tracking-wider">Line No.</TableHead>
                      <TableHead className="w-[140px] text-[10px] font-bold text-primary border-r border-border/50 px-3 uppercase tracking-wider">Item No.</TableHead>
                      <TableHead className="min-w-[250px] text-[10px] font-bold text-primary border-r border-border/50 px-3 uppercase tracking-wider">Description</TableHead>
                      <TableHead className="w-[130px] text-right text-[10px] font-bold text-primary border-r border-border/50 px-3 uppercase tracking-wider">Qty to Assign</TableHead>
                      <TableHead className="w-[130px] text-right text-[10px] font-bold text-primary border-r border-border/50 px-3 uppercase tracking-wider">Amount to Assign</TableHead>
                      <TableHead className="w-[120px] text-right text-[10px] font-bold text-primary px-3 uppercase tracking-wider pr-4">Assigned</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow className="hover:bg-transparent border-none">
                      <TableCell colSpan={8} className="h-96 text-center text-muted-foreground text-lg font-medium opacity-50 italic">
                        No lines found. Fetch source lines to begin.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map((line, idx) => {
                      const isSelected = selectedLines.has(line.Line_No);
                      return (
                          <TableRow 
                            key={`${line.Line_No}-${idx}`} 
                            className={`group h-10 border-b border-border transition-colors cursor-pointer ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}
                            onClick={() => toggleSelectLine(line.Line_No)}
                          >
                            <TableCell className="text-center py-0 border-r border-border/50" onClick={(e) => e.stopPropagation()}>
                              <Checkbox 
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectLine(line.Line_No)}
                                className="rounded-sm"
                              />
                            </TableCell>
                            <TableCell className="font-semibold text-xs py-0 border-r border-border/50 tabular-nums px-3 tracking-tight">{line.Applies_toDocNo}</TableCell>
                            <TableCell className="text-xs py-0 border-r border-border/50 text-muted-foreground tabular-nums px-3">{line.Applies_toDocLineNo}</TableCell>
                            <TableCell className="text-xs py-0 border-r border-border/50 text-foreground tabular-nums font-medium px-3">{line.ItemNo}</TableCell>
                            <TableCell className="text-xs py-0 border-r border-border/50 text-muted-foreground truncate max-w-[400px] px-3">
                              {line.Description}
                            </TableCell>
                            <TableCell className="p-0 border-r border-border/50 h-10" onClick={(e) => e.stopPropagation()}>
                              <Input 
                                type="number"
                                className={cn("h-full w-full rounded-none border-0 text-right tabular-nums group-hover:bg-background/20 transition-all font-medium pr-3 text-xs", FIELD_INPUT_CLASS)}
                                defaultValue={line.QtytoAssign}
                              />
                            </TableCell>
                            <TableCell className="p-0 border-r border-border/50 h-10" onClick={(e) => e.stopPropagation()}>
                              <Input 
                                type="number"
                                className={cn("h-full w-full rounded-none border-0 text-right tabular-nums group-hover:bg-background/20 transition-all font-medium pr-3 text-xs", FIELD_INPUT_CLASS)}
                                defaultValue={line.AmounttoAssign.toFixed(2)}
                              />
                            </TableCell>
                            <TableCell className="text-right text-xs pr-4 py-0 font-bold tabular-nums text-foreground/80">{line.QtyAssigned}</TableCell>
                          </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

        <DialogFooter className="p-6 border-t border-border bg-background items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">Total Qty:</span>
                <span className="text-sm font-bold text-foreground tabular-nums">{totalQuantity}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">Total Amount:</span>
                <span className="text-sm font-bold text-foreground tabular-nums">{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="destructive" 
              size="default" 
              className="px-6 font-bold" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="default"
              size="default" 
              className="px-8 font-bold" 
              onClick={handleSave}
              disabled={loading}
            >
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
