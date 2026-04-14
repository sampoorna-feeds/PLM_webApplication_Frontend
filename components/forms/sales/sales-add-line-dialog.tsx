"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/forms/shared/searchable-select";
import {
  getItems,
  searchItems,
  getItemsPage,
  searchItemsByField,
  getItemUnitOfMeasures,
  type Item,
  type ItemUnitOfMeasure,
} from "@/lib/api/services/item.service";
import {
  getGLAccounts,
  searchGLAccounts,
  getGLAccountsPage,
  searchGLAccountsByField,
  type GLPostingAccount,
} from "@/lib/api/services/gl-account.service";
import type { SalesDocumentLineItem } from "@/lib/api/services/sales-order.service";
import {
  ApiErrorDialog,
  extractApiError,
  type ApiErrorState,
} from "@/components/forms/production-orders/api-error-dialog";

type LineType = "Item" | "G/L Account";

interface SalesAddLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentNo: string;
  locationCode: string;
  onSave: () => void;
  addSingleLine: (
    documentNo: string,
    line: SalesDocumentLineItem,
    locationCode: string,
  ) => Promise<{ Line_No: number; [key: string]: unknown }>;
}

export function SalesAddLineDialog({
  open,
  onOpenChange,
  documentNo,
  locationCode,
  onSave,
  addSingleLine,
}: SalesAddLineDialogProps) {
  const [lineType, setLineType] = useState<LineType>("Item");
  const [no, setNo] = useState("");
  const [description, setDescription] = useState("");
  const [uom, setUom] = useState("");
  const [quantity, setQuantity] = useState<string>("");
  const [uomOptions, setUomOptions] = useState<ItemUnitOfMeasure[]>([]);
  const [isLoadingUom, setIsLoadingUom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<ApiErrorState | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setLineType("Item");
      setNo("");
      setDescription("");
      setUom("");
      setQuantity("");
      setUomOptions([]);
    }
  }, [open]);

  // Load UOM options when item is selected
  useEffect(() => {
    if (lineType !== "Item" || !no) {
      setUomOptions([]);
      setUom("");
      return;
    }
    let mounted = true;
    setIsLoadingUom(true);
    getItemUnitOfMeasures(no)
      .then((uoms) => {
        if (!mounted) return;
        setUomOptions(uoms);
        if (uoms.length === 1) setUom(uoms[0].Code);
        else setUom("");
      })
      .catch(() => {
        if (!mounted) return;
        setUomOptions([]);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoadingUom(false);
      });
    return () => {
      mounted = false;
    };
  }, [lineType, no]);

  const handleItemChange = (value: string, item?: Item) => {
    setNo(value);
    setDescription(item?.Description || "");
    setUom("");
  };

  const handleGLChange = (value: string, gl?: GLPostingAccount) => {
    setNo(value);
    setDescription(gl?.Name || "");
    setUom("");
  };

  const handleSave = async () => {
    if (!no.trim()) {
      toast.error("Please select an item or GL account");
      return;
    }
    const qty = parseFloat(quantity) || 0;
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (!documentNo) {
      toast.error("Document number is missing");
      return;
    }

    setIsSaving(true);
    try {
      await addSingleLine(
        documentNo,
        { type: lineType, no: no.trim(), uom: uom || undefined, quantity: qty },
        locationCode,
      );
      toast.success("Line added");
      onSave();
      onOpenChange(false);
    } catch (error) {
      const { message, code } = extractApiError(error);
      setApiError({ title: "Add Line Failed", message, code });
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = !!no && parseFloat(quantity) > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-8 sm:max-w-150">
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            {/* Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-sm">Type</Label>
              <div className="col-span-3">
                <Select
                  value={lineType}
                  onValueChange={(v) => {
                    setLineType(v as LineType);
                    setNo("");
                    setDescription("");
                    setUom("");
                    setUomOptions([]);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Item">Item</SelectItem>
                    <SelectItem value="G/L Account">G/L Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* No (Item or GL Account searchable select) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-sm">
                {lineType === "Item" ? "Item No." : "G/L Account"}
              </Label>
              <div className="col-span-3">
                {lineType === "Item" ? (
                  <SearchableSelect<Item>
                    value={no}
                    onChange={handleItemChange}
                    placeholder="Search item…"
                    loadInitial={() => getItems(20, locationCode || undefined)}
                    searchItems={(q) => searchItems(q, locationCode || undefined)}
                    loadMore={(skip, search) =>
                      getItemsPage(
                        skip,
                        search || undefined,
                        30,
                        locationCode || undefined,
                      )
                    }
                    supportsDualSearch
                    searchByField={(q, field) =>
                      searchItemsByField(q, field, locationCode || undefined)
                    }
                    getDisplayValue={(item) =>
                      `${item.No} — ${item.Description}`
                    }
                    getItemValue={(item) => item.No}
                  />
                ) : (
                  <SearchableSelect<GLPostingAccount>
                    value={no}
                    onChange={handleGLChange}
                    placeholder="Search GL account…"
                    loadInitial={() => getGLAccounts(20)}
                    searchItems={(q) => searchGLAccounts(q)}
                    loadMore={(skip, search) =>
                      getGLAccountsPage(skip, search || undefined, 30)
                    }
                    supportsDualSearch
                    searchByField={(q, field) =>
                      searchGLAccountsByField(q, field)
                    }
                    getDisplayValue={(gl) => `${gl.No} — ${gl.Name}`}
                    getItemValue={(gl) => gl.No}
                  />
                )}
              </div>
            </div>

            {/* Description (auto-filled, read-only) */}
            {description && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-muted-foreground text-right text-sm">
                  Description
                </Label>
                <div className="col-span-3 text-sm font-medium">
                  {description}
                </div>
              </div>
            )}

            {/* UOM (only for Items) */}
            {lineType === "Item" && no && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-sm">UOM</Label>
                <div className="col-span-3">
                  {isLoadingUom ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : uomOptions.length > 0 ? (
                    <Select value={uom} onValueChange={setUom}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select UOM" />
                      </SelectTrigger>
                      <SelectContent>
                        {uomOptions.map((u) => (
                          <SelectItem key={u.Code} value={u.Code}>
                            {u.Code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={uom}
                      onChange={(e) => setUom(e.target.value)}
                      placeholder="Enter UOM (optional)"
                      className="h-9"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-sm">Quantity</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val))
                    setQuantity(val);
                }}
                placeholder="Enter quantity"
                className="col-span-3 h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !canSave}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Line
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApiErrorDialog error={apiError} onClose={() => setApiError(null)} />
    </>
  );
}
