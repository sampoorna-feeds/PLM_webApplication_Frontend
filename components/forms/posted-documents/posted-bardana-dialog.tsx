"use client";

import { SearchableSelect } from "@/components/forms/shared/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addPostedBardanaLine,
  deleteBardanaLine,
  getPostedBardanaLines,
  updateBardanaLine,
  type BardanaLine,
} from "@/lib/api/services/bardana.service";
import {
  getBardanaItems,
  getBardanaItemsPage,
  searchBardanaItems,
  getItemByNo,
  type Item,
} from "@/lib/api/services/item.service";
import {
  AlertCircle,
  Edit2,
  Loader2,
  Package,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<BardanaLine>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Add Item State

  const [isAdding, setIsAdding] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [newQuantity, setNewQuantity] = useState<string>("");
  const [newWeightPer, setNewWeightPer] = useState<string>("");
  const [isAddingSubmit, setIsAddingSubmit] = useState(false);

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
      fetchLines();
    }
  }, [isOpen, fetchLines]);


  const handleEdit = (line: BardanaLine) => {
    setEditingId(line.Line_No);
    setEditValues({
      Item_No: line.Item_No,
      Description: line.Description,
      UOM: line.UOM,
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
        Item_No: editValues.Item_No,
        Description: editValues.Description,
        UOM: editValues.UOM,
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

  const handleAddItem = async () => {
    if (!selectedItem) {
      toast.error("Please select a bardana item.");
      return;
    }

    const qty = parseFloat(newQuantity);
    const weight = parseFloat(newWeightPer);

    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    if (isNaN(weight) || weight < 0) {
      toast.error("Please enter a valid weight.");
      return;
    }

    setIsAddingSubmit(true);
    try {
      // If we have lines, use their Document_Type and Document_No
      // Otherwise fallback to "Order" and postedDocNo (this might need adjustment depending on BC logic)
      const docType = lines.length > 0 ? lines[0].Document_Type : "Order";
      const docNo = lines.length > 0 ? lines[0].Document_No : postedDocNo;
      const uom =
        selectedItem.Sales_Unit_of_Measure ||
        selectedItem.Base_Unit_of_Measure ||
        "PCS";

      await addPostedBardanaLine(
        docType,
        docNo,
        lineNo,
        postedDocNo,
        selectedItem.No,
        selectedItem.Description,
        uom,
        qty,
        weight,
      );


      toast.success("Bardana item added successfully.");
      setIsAdding(false);
      setSelectedItem(null);
      setNewQuantity("");
      setNewWeightPer("");
      await fetchLines();
    } catch (error: any) {
      console.error("Error adding bardana:", error);
      toast.error(error.message || "Failed to add bardana item.");
    } finally {
      setIsAddingSubmit(false);
    }
  };

  const handleItemSelect = async (itemNo: string, item?: Item) => {
    if (item) {
      setSelectedItem(item);
      
      // If weight is missing, fetch full item details
      let weight = item.RM_Bardana_Wt;
      if (weight === undefined || weight === 0) {
        try {
          const fullItem = await getItemByNo(item.No);
          if (fullItem?.RM_Bardana_Wt) {
            weight = fullItem.RM_Bardana_Wt;
          }
        } catch (e) {
          console.error("Error fetching item weight:", e);
        }
      }
      
      setNewWeightPer(Number(weight || 0).toString());
    } else {
      setSelectedItem(null);
      setNewWeightPer("");
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] flex-col sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <Package className="text-primary h-5 w-5" />
              Bardana Items
            </DialogTitle>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {!isAdding && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-[10px] font-bold tracking-wider uppercase"
                    onClick={() => setIsAdding(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Add Item
                  </Button>
                )}
                <Badge variant="outline" className="font-mono text-[10px]">
                  {postedDocNo} / Line {lineNo}
                </Badge>
              </div>

              <span className="text-muted-foreground text-[10px] font-medium">
                {itemNo} - {itemDescription}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {isLoading && lines.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          )}

          {!isLoading && lines.length === 0 && !isAdding && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="text-muted-foreground mb-3 h-10 w-10 opacity-20" />
              <p className="text-muted-foreground text-sm font-semibold">
                No bardana items found.
              </p>
            </div>
          )}


          {isAdding && (
            <div className="border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 mb-4 rounded-md border p-4 shadow-sm duration-200">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-primary text-[10px] font-bold tracking-wider uppercase">
                  Add New Bardana Item
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsAdding(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <FieldTitle className="text-[10px] uppercase">
                    Bardana Item
                  </FieldTitle>
                  <SearchableSelect<Item>
                    value={selectedItem?.No || ""}
                    onChange={handleItemSelect}
                    placeholder="Search item…"
                    loadInitial={() => getBardanaItems(20)}
                    searchItems={searchBardanaItems}
                    loadMore={(skip, search) =>
                      getBardanaItemsPage(skip, search, 20)
                    }
                    getDisplayValue={(item) =>
                      `${item.No} - ${item.Description}`
                    }
                    getItemValue={(item) => item.No}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <FieldTitle className="text-[10px] uppercase">
                    Weight (g)
                  </FieldTitle>
                  <Input
                    type="number"
                    value={newWeightPer}
                    onChange={(e) => setNewWeightPer(e.target.value)}
                    placeholder="Weight per item"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <FieldTitle className="text-[10px] uppercase">
                    Quantity (Bags)
                  </FieldTitle>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      placeholder="No. of bags"
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      className="h-8 px-4 text-xs font-bold tracking-wider uppercase"
                      onClick={handleAddItem}
                      disabled={isAddingSubmit}
                    >
                      {isAddingSubmit ? (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="mr-1.5 h-3 w-3" />
                      )}
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {lines.length > 0 && (
            <div className="border-border/60 bg-card/30 overflow-hidden rounded-md border shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="h-9 w-[120px] text-[10px] font-bold tracking-wider uppercase">
                      Item No
                    </TableHead>
                    <TableHead className="h-9 text-[10px] font-bold tracking-wider uppercase">
                      Description
                    </TableHead>
                    <TableHead className="h-9 w-[60px] text-[10px] font-bold tracking-wider uppercase">
                      UOM
                    </TableHead>
                    <TableHead className="h-9 w-[100px] text-right text-[10px] font-bold tracking-wider uppercase">
                      Weight (g)
                    </TableHead>
                    <TableHead className="h-9 w-[100px] text-right text-[10px] font-bold tracking-wider uppercase">
                      Bags
                    </TableHead>
                    <TableHead className="h-9 w-[120px] text-right text-[10px] font-bold tracking-wider uppercase">
                      Total (Kg)
                    </TableHead>
                    <TableHead className="h-9 w-[80px] text-center text-[10px] font-bold tracking-wider uppercase">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow
                      key={line.Line_No}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="truncate py-2 font-mono text-xs">
                        {editingId === line.Line_No ? (
                          <div className="w-[140px]">
                            <SearchableSelect<Item>
                              value={editValues.Item_No || ""}
                              onChange={async (itemNo, item) => {
                                if (item) {
                                  let weight = item.RM_Bardana_Wt;
                                  
                                  // Fallback: fetch full item if weight is missing or zero
                                  if (weight === undefined || weight === 0) {
                                    try {
                                      const fullItem = await getItemByNo(item.No);
                                      if (fullItem?.RM_Bardana_Wt) {
                                        weight = fullItem.RM_Bardana_Wt;
                                      }
                                    } catch (e) {
                                      console.error("Error fetching item weight:", e);
                                    }
                                  }

                                  setEditValues({
                                    ...editValues,
                                    Item_No: item.No,
                                    Description: item.Description,
                                    UOM: item.Sales_Unit_of_Measure || item.Base_Unit_of_Measure || "PCS",
                                    Weight_Per: Number(weight || 0)
                                  });
                                }
                              }}
                              placeholder="Item…"
                              loadInitial={() => getBardanaItems(20)}
                              searchItems={searchBardanaItems}
                              loadMore={(skip, search) => getBardanaItemsPage(skip, search, 20)}
                              getDisplayValue={(item) => item.No}
                              getItemValue={(item) => item.No}
                              className="h-7 text-[10px]"
                            />
                          </div>
                        ) : (
                          line.Item_No
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-xs font-medium">
                        {editingId === line.Line_No ? (
                          <Input
                            className="h-7 text-xs"
                            value={editValues.Description || ""}
                            onChange={(e) => setEditValues({ ...editValues, Description: e.target.value })}
                          />
                        ) : (
                          line.Description
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-[10px]">
                        {editingId === line.Line_No ? (
                          <Input
                            className="h-7 w-12 text-[10px]"
                            value={editValues.UOM || ""}
                            onChange={(e) => setEditValues({ ...editValues, UOM: e.target.value })}
                          />
                        ) : (
                          line.UOM
                        )}
                      </TableCell>

                      <TableCell className="py-2 text-right">
                        <span className="font-mono text-xs opacity-50">
                          {editingId === line.Line_No ? editValues.Weight_Per : line.Weight_Per}
                        </span>

                      </TableCell>
                      <TableCell className="py-2 text-right">
                        {editingId === line.Line_No ? (
                          <Input
                            type="number"
                            className="h-7 w-full text-right text-xs"
                            value={editValues.Quantity || ""}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                Quantity: Number(e.target.value),
                              })
                            }
                          />
                        ) : (
                          <span className="font-mono text-xs">
                            {line.Quantity}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-right text-xs font-bold">
                        {editingId === line.Line_No ? (
                          <span className="font-mono opacity-50">
                            {(
                              ((Number(editValues.Weight_Per) || 0) *
                                (Number(editValues.Quantity) || 0)) /
                              1000
                            ).toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-mono">
                            {Number(line.Total_Weight).toFixed(2)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center justify-center gap-1">
                          {editingId === line.Line_No ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                                onClick={() => handleSave(line)}
                                disabled={isSaving}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground h-7 w-7 p-0"
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
                                className="text-muted-foreground h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                                onClick={() => handleEdit(line)}
                                disabled={!!editingId || deletingId !== null}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                                onClick={() => handleDelete(line)}
                                disabled={
                                  !!editingId || deletingId === line.Line_No
                                }
                              >
                                {deletingId === line.Line_No ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs font-bold tracking-wider uppercase"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
