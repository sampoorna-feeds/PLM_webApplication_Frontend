"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Search, Check, X } from "lucide-react";
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
import { toast } from "sonner";
import { getItemCharges, assignItemCharge, getPurchasereceiptLines } from "@/lib/api/services/purchase-orders.service";
import { cn } from "@/lib/utils";

interface ItemChargeMultiSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mrnNo: string;
}

export function ItemChargeMultiSelectDialog({
  open,
  onOpenChange,
  mrnNo,
}: ItemChargeMultiSelectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [mrnLines, setMrnLines] = useState<any[]>([]);
  const [charges, setCharges] = useState<any[]>([]);
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());
  const [selectedChargeNos, setSelectedChargeNos] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [linesData, chargesData] = await Promise.all([
        getPurchasereceiptLines(mrnNo),
        getItemCharges()
      ]);
      setMrnLines(linesData);
      setCharges(chargesData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load MRN lines or item charges");
    } finally {
      setLoading(false);
    }
  }, [mrnNo]);

  useEffect(() => {
    if (open) {
      fetchData();
      setSelectedLines(new Set());
      setSelectedChargeNos(new Set());
      setSearchTerm("");
    }
  }, [open, fetchData]);

  const toggleSelectAllLines = () => {
    if (selectedLines.size === mrnLines.length && mrnLines.length > 0) {
      setSelectedLines(new Set());
    } else {
      setSelectedLines(new Set(mrnLines.map((_, i) => i)));
    }
  };

  const toggleSelectLine = (index: number) => {
    const next = new Set(selectedLines);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedLines(next);
  };

  const toggleSelectAllCharges = () => {
    if (selectedChargeNos.size === filteredCharges.length && filteredCharges.length > 0) {
      setSelectedChargeNos(new Set());
    } else {
      setSelectedChargeNos(new Set(filteredCharges.map((c) => c.No)));
    }
  };

  const toggleSelectCharge = (no: string) => {
    const next = new Set(selectedChargeNos);
    if (next.has(no)) next.delete(no);
    else next.add(no);
    setSelectedChargeNos(next);
  };

  const handleAssign = async () => {
    if (selectedLines.size === 0 || selectedChargeNos.size === 0) {
      toast.error("Please select at least one line and one item charge");
      return;
    }
    
    setIsAssigning(true);
    try {
      const chargeNos = Array.from(selectedChargeNos);
      const lineIndices = Array.from(selectedLines);
      
      for (const lineIdx of lineIndices) {
        const line = mrnLines[lineIdx];
        for (const itemChargeNo of chargeNos) {
          await assignItemCharge({
            mrnNo: mrnNo,
            lineNo: line.Line_No,
            itemChargeNo: itemChargeNo,
            amount: 0, // Default to 0, user can update later line by line
            locationCode: line.Location_Code
          });
        }
      }
      toast.success(`Successfully assigned charges to selected MRN lines`);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to assign item charges:", error);
      toast.error("Failed to assign one or more item charges.");
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredCharges = charges.filter(c => 
    c.No.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.Description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>Item Charge Assignment - {mrnNo}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              1. Select MRN Lines
              <span className="text-[10px] font-normal lowercase italic text-muted-foreground/70">
                {selectedLines.size} of {mrnLines.length} selected
              </span>
            </h4>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={mrnLines.length > 0 && selectedLines.size === mrnLines.length}
                        onCheckedChange={toggleSelectAllLines}
                      />
                    </TableHead>
                    <TableHead className="w-24">Line No.</TableHead>
                    <TableHead className="w-40">Item No.</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && mrnLines.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-20 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto"/></TableCell></TableRow>
                  ) : mrnLines.map((line, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/10 cursor-pointer" onClick={() => toggleSelectLine(idx)}>
                      <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selectedLines.has(idx)} onCheckedChange={() => toggleSelectLine(idx)} />
                      </TableCell>
                      <TableCell className="text-xs font-medium">{line.Line_No}</TableCell>
                      <TableCell className="text-xs font-mono">{line.No}</TableCell>
                      <TableCell className="text-xs">{line.Description}</TableCell>
                      <TableCell className="text-xs text-right">{line.Quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                2. Select Item Charges
              </h4>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search charges..."
                  className="pl-8 h-8 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={filteredCharges.length > 0 && selectedChargeNos.size === filteredCharges.length}
                        onCheckedChange={toggleSelectAllCharges}
                      />
                    </TableHead>
                    <TableHead className="w-32">Code</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && charges.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="h-20 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto"/></TableCell></TableRow>
                  ) : filteredCharges.map((charge) => (
                    <TableRow 
                      key={charge.No}
                      className="cursor-pointer hover:bg-muted/10"
                      onClick={() => toggleSelectCharge(charge.No)}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selectedChargeNos.has(charge.No)} onCheckedChange={() => toggleSelectCharge(charge.No)} />
                      </TableCell>
                      <TableCell className="text-xs font-mono">{charge.No}</TableCell>
                      <TableCell className="text-xs">{charge.Description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10">
          <div className="flex items-center justify-between w-full px-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground">
                {selectedLines.size} lines selected
              </span>
              <span className="text-[10px] text-muted-foreground">
                {selectedChargeNos.size} charges selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleAssign} 
                className="bg-green-600 hover:bg-green-700"
                disabled={selectedLines.size === 0 || selectedChargeNos.size === 0 || isAssigning}
              >
                {isAssigning && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                {isAssigning ? "Assigning..." : "Assign to Lines"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
