"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Search, Check } from "lucide-react";
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
import { itemChargeAssignmentService, ItemChargeSourceLine, SourceType } from "@/lib/api/services/item-charge-assignment.service";
import { cn } from "@/lib/utils";

interface ItemChargeSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: SourceType;
  onAddSelected: (lines: ItemChargeSourceLine[]) => void;
}

export function ItemChargeSelectionDialog({
  open,
  onOpenChange,
  type,
  onAddSelected,
}: ItemChargeSelectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sourceLines, setSourceLines] = useState<ItemChargeSourceLine[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSourceLines = useCallback(async (search?: string) => {
    try {
      setLoading(true);
      const data = await itemChargeAssignmentService.getSourceLines(type, undefined, search);
      setSourceLines(data);
      setSelectedIndices(new Set());
    } catch (error) {
      console.error(`Failed to fetch ${type} lines:`, error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (open) {
      fetchSourceLines();
      setSearchTerm("");
    }
  }, [open, fetchSourceLines]);

  const handleSearch = () => {
    fetchSourceLines(searchTerm);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === sourceLines.length && sourceLines.length > 0) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(sourceLines.map((_, i) => i)));
    }
  };

  const toggleSelectLine = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const handleAdd = () => {
    const selected = Array.from(selectedIndices).map(i => sourceLines[i]);
    onAddSelected(selected);
    onOpenChange(false);
  };

  const titles: Record<SourceType, string> = {
    Receipt: "Get Purchase Receipt Lines",
    SalesShipment: "Get Sales Shipment Lines",
    Transfer: "Get Transfer Receipt Lines",
    ReturnReceipt: "Get Return Receipt Lines",
    ReturnShipment: "Get Return Shipment Lines",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl h-[80vh] flex flex-col p-0 overflow-hidden border-border bg-background shadow-lg rounded-lg sm:border">
        <DialogHeader className="p-6 border-b border-border">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {titles[type]}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Document No. or Item No..."
                className="pl-9 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="border border-border rounded-md overflow-hidden flex flex-col shadow-sm h-full">
            <div className="overflow-auto flex-1">
              <Table className="relative w-full">
                <TableHeader className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                  <TableRow className="h-10 hover:bg-transparent">
                    <TableHead className="w-12 text-center border-r border-border/50">
                      <Checkbox
                        checked={sourceLines.length > 0 && selectedIndices.size === sourceLines.length}
                        onCheckedChange={toggleSelectAll}
                        className="rounded-sm"
                      />
                    </TableHead>
                    <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-wider border-r border-border/50 px-3">Document No.</TableHead>
                    <TableHead className="w-[100px] text-[10px] font-bold uppercase tracking-wider border-r border-border/50 px-3">Line No.</TableHead>
                    <TableHead className="w-[140px] text-[10px] font-bold uppercase tracking-wider border-r border-border/50 px-3">Item No.</TableHead>
                    <TableHead className="min-w-[200px] text-[10px] font-bold uppercase tracking-wider border-r border-border/50 px-3">Description</TableHead>
                    <TableHead className="w-[100px] text-right text-[10px] font-bold uppercase tracking-wider border-r border-border/50 px-3">Quantity</TableHead>
                    <TableHead className="w-[80px] text-center text-[10px] font-bold uppercase tracking-wider border-r border-border/50 px-3">UOM</TableHead>
                    <TableHead className="w-[120px] text-[10px] font-bold uppercase tracking-wider px-3">Posting Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">Loading lines...</p>
                      </TableCell>
                    </TableRow>
                  ) : sourceLines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center text-muted-foreground italic">
                        No lines found. Try a different search term.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sourceLines.map((line, idx) => {
                      const isSelected = selectedIndices.has(idx);
                      const itemNo = line.No || line.Item_No || "";
                      return (
                        <TableRow
                          key={`${line.Document_No}-${line.Line_No}-${idx}`}
                          className={cn(
                            "group h-10 border-b border-border cursor-pointer transition-colors",
                            isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                          )}
                          onClick={() => toggleSelectLine(idx)}
                        >
                          <TableCell className="text-center py-0 border-r border-border/50" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectLine(idx)}
                              className="rounded-sm"
                            />
                          </TableCell>
                          <TableCell className="text-xs font-semibold tabular-nums px-3 py-0 border-r border-border/50">{line.Document_No}</TableCell>
                          <TableCell className="text-xs tabular-nums text-muted-foreground px-3 py-0 border-r border-border/50">{line.Line_No}</TableCell>
                          <TableCell className="text-xs font-medium px-3 py-0 border-r border-border/50">{itemNo}</TableCell>
                          <TableCell className="text-xs text-muted-foreground px-3 py-0 border-r border-border/50 truncate max-w-[300px]">{line.Description}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums px-3 py-0 border-r border-border/50 font-medium">{line.Quantity}</TableCell>
                          <TableCell className="text-xs text-center px-3 py-0 border-r border-border/50">{line.Unit_of_Measure || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground px-3 py-0">{line.Posting_Date || "—"}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t border-border bg-muted/20 items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedIndices.size} lines selected
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={selectedIndices.size === 0}>
              <Check className="h-4 w-4 mr-2" />
              Add Selected Lines
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
