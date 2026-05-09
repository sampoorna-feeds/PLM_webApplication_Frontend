"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  Loader2, 
  Package, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  AlertCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  getPostedBardanaLines, 
  deleteBardanaLine, 
  updateBardanaLine,
  generateQCForm,
  type BardanaLine
} from "@/lib/api/services/bardana.service";

interface PostedBardanaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  postedDocNo: string;
  lineNo: number;
  itemNo: string;
  itemDescription: string;
}

export function PostedBardanaDialog({
  isOpen,
  onOpenChange,
  postedDocNo,
  lineNo,
  itemNo,
  itemDescription,
}: PostedBardanaDialogProps) {
  const [lines, setLines] = useState<BardanaLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<BardanaLine>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchLines = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPostedBardanaLines(postedDocNo, lineNo);
      setLines(data);
    } catch (error: any) {
      console.error("Error fetching bardana lines:", error);
      toast.error("Failed to fetch bardana items.");
    } finally {
      setIsLoading(false);
    }
  }, [postedDocNo, lineNo]);

  useEffect(() => {
    if (isOpen) {
      const init = async () => {
        setIsGenerating(true);
        try {
          // Call Generate QC Form API as requested
          await generateQCForm(postedDocNo, lineNo);
          await fetchLines();
        } catch (error: any) {
          console.error("Error initializing bardana:", error);
          toast.error(error.message || "Failed to initialize bardana items.");
          // Still try to fetch lines even if generation fails (they might already exist)
          await fetchLines();
        } finally {
          setIsGenerating(false);
        }
      };
      init();
    }
  }, [isOpen, postedDocNo, lineNo, fetchLines]);

  const handleEdit = (line: BardanaLine) => {
    setEditingId(line.Line_No);
    setEditValues({
      Weight_Per: line.Weight_Per,
      Quantity: line.Quantity,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleSave = async (line: BardanaLine) => {
    if (editingId === null) return;

    setIsSaving(true);
    try {
      const weightPer = Number(editValues.Weight_Per) || 0;
      const quantity = Number(editValues.Quantity) || 0;

      const updateData = {
        Weight_Per: weightPer,
        Quantity: quantity,
      };

      await updateBardanaLine(line, line["@odata.etag"] || "*", updateData);
      toast.success("Bardana item updated.");
      setEditingId(null);
      await fetchLines();
    } catch (error: any) {
      console.error("Error updating bardana:", error);
      toast.error(error.message || "Failed to update bardana item.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (line: BardanaLine) => {
    if (!confirm("Are you sure you want to delete this bardana item?")) return;

    setDeletingId(line.Line_No);
    try {
      await deleteBardanaLine(line, line["@odata.etag"] || "*");
      toast.success("Bardana item deleted.");
      await fetchLines();
    } catch (error: any) {
      console.error("Error deleting bardana:", error);
      toast.error(error.message || "Failed to delete bardana item.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Bardana Items
            </DialogTitle>
            <div className="flex flex-col items-end">
              <Badge variant="outline" className="font-mono text-[10px]">
                {postedDocNo} / Line {lineNo}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium">
                {itemNo} - {itemDescription}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground tracking-tight">
                Generating QC Form & Loading Bardana Items...
              </p>
            </div>
          )}

          {!isGenerating && isLoading && lines.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isGenerating && !isLoading && lines.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
              <p className="text-sm font-semibold text-muted-foreground">No bardana items found.</p>
              <p className="text-xs text-muted-foreground/60">Call Generate QC Form to create them.</p>
            </div>
          )}

          {lines.length > 0 && (
            <div className="rounded-md border border-border/60 shadow-sm overflow-hidden bg-card/30">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider h-9">Item No</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider h-9">Description</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider h-9">UOM</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider h-9 text-right">Weight Per (g)</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider h-9 text-right">No. of Bags</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider h-9 text-right">Total Weight (Kg)</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider h-9 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.Line_No} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs font-mono py-2">{line.Item_No}</TableCell>
                      <TableCell className="text-xs py-2 font-medium">{line.Description}</TableCell>
                      <TableCell className="text-[10px] py-2">{line.UOM}</TableCell>
                      <TableCell className="text-right py-2">
                        {editingId === line.Line_No ? (
                          <Input
                            type="number"
                            className="h-7 text-right text-xs w-24 ml-auto"
                            value={editValues.Weight_Per || ""}
                            onChange={(e) => setEditValues({ ...editValues, Weight_Per: Number(e.target.value) })}
                          />
                        ) : (
                          <span className="font-mono text-xs">{line.Weight_Per}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        {editingId === line.Line_No ? (
                          <Input
                            type="number"
                            className="h-7 text-right text-xs w-20 ml-auto"
                            value={editValues.Quantity || ""}
                            onChange={(e) => setEditValues({ ...editValues, Quantity: Number(e.target.value) })}
                          />
                        ) : (
                          <span className="font-mono text-xs">{line.Quantity}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2 font-bold text-xs">
                        {editingId === line.Line_No ? (
                          <span className="opacity-50 font-mono">
                            {((Number(editValues.Weight_Per) || 0) * (Number(editValues.Quantity) || 0) / 1000).toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-mono">{Number(line.Total_Weight).toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center justify-center gap-1">
                          {editingId === line.Line_No ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleSave(line)}
                                disabled={isSaving}
                              >
                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground"
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => handleEdit(line)}
                                disabled={!!editingId || deletingId !== null}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDelete(line)}
                                disabled={!!editingId || deletingId === line.Line_No}
                              >
                                {deletingId === line.Line_No ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs font-bold uppercase tracking-wider">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
