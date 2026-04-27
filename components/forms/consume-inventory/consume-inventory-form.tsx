"use client";

import { CascadingDimensionSelect } from "@/components/forms/cascading-dimension-select";
import { DimensionSelect } from "@/components/forms/dimension-select";
import { LocationSelect } from "@/components/forms/shared/location-select";
import { ItemSelect } from "@/components/forms/transfer-orders/item-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  bulkInsertConsumeInventoryEntries,
  postConsumeInventory,
  type ConsumeInventoryEntry,
} from "@/lib/api/services/consume-inventory.service";
import {
  getItemLedgerEntries,
  type ItemLedgerEntry,
} from "@/lib/api/services/report-ledger.service";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  Edit2,
  Info,
  Loader2,
  MoreVertical,
  Package,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LedgerEntryModal } from "./ledger-entry-modal";

export function ConsumeInventoryForm() {
  const { userID } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState<ConsumeInventoryEntry[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isConfirmPostOpen, setIsConfirmPostOpen] = useState(false);
  const [formState, setFormState] = useState<Partial<ConsumeInventoryEntry>>({
    "Posting Date": new Date().toISOString().split("T")[0],
    "Entry Type": "Issue",
    "Item No.": "",
    Description: "",
    "Location Code": "",
    Quantity: 0,
    "Unit of Measure Code": "",
    "Lob Code": "",
    "Branch Code": "",
    "Employee Code": "",
    "Assignment Code": "",
    "Applies-to Entry": undefined,
    "Applies-from Entry": undefined,
  });

  const [applyToEntries, setApplyToEntries] = useState<ItemLedgerEntry[]>([]);
  const [applyFromEntries, setApplyFromEntries] = useState<ItemLedgerEntry[]>(
    [],
  );
  const [loadingApplyTo, setLoadingApplyTo] = useState(false);
  const [loadingApplyFrom, setLoadingApplyFrom] = useState(false);
  const [isApplyToModalOpen, setIsApplyToModalOpen] = useState(false);
  const [isApplyFromModalOpen, setIsApplyFromModalOpen] = useState(false);

  useEffect(() => {
    if (userID) {
      loadEntries();
    }
  }, [userID]);

  useEffect(() => {
    const fetchApplyToEntries = async () => {
      const itemNo = formState["Item No."];
      if (!itemNo) {
        setApplyToEntries([]);
        return;
      }
      setLoadingApplyTo(true);
      try {
        const { entries } = await getItemLedgerEntries({
          $filter: `Item_No eq '${itemNo.replace(/'/g, "''")}' and Open eq true`,
          $top: 100,
        });
        setApplyToEntries(entries);
      } catch (err) {
        console.error("Error fetching apply-to entries:", err);
      } finally {
        setLoadingApplyTo(false);
      }
    };

    fetchApplyToEntries();
  }, [formState["Item No."]]);

  useEffect(() => {
    const fetchApplyFromEntries = async () => {
      const itemNo = formState["Item No."];
      if (!itemNo) {
        setApplyFromEntries([]);
        return;
      }
      setLoadingApplyFrom(true);
      try {
        const { entries } = await getItemLedgerEntries({
          $filter: `Item_No eq '${itemNo.replace(/'/g, "''")}' and Positive eq false and Consumption eq true`,
          $top: 100,
        });
        setApplyFromEntries(entries);
      } catch (err) {
        console.error("Error fetching apply-from entries:", err);
      } finally {
        setLoadingApplyFrom(false);
      }
    };

    fetchApplyFromEntries();
  }, [formState["Item No."]]);

  const loadEntries = () => {
    if (!userID) return;
    const stored = localStorage.getItem(
      `pending_consumption_entries_${userID}`,
    );
    if (stored) {
      try {
        setEntries(JSON.parse(stored));
      } catch (err) {
        console.error("Error loading stored entries:", err);
        setEntries([]);
      }
    } else {
      setEntries([]);
    }
  };

  const handleChange = (field: keyof ConsumeInventoryEntry, value: any) => {
    setFormState((prev) => {
      const newState = { ...prev, [field]: value };

      // Reset dependent fields
      if (field === "Lob Code") {
        newState["Branch Code"] = "";
        newState["Location Code"] = "";
      } else if (field === "Branch Code") {
        newState["Location Code"] = "";
      }

      return newState;
    });
  };

  const handleAddEntry = () => {
    if (
      !formState["Item No."] ||
      !formState["Location Code"] ||
      !formState.Quantity
    ) {
      toast.error("Please fill in Item, Location and Quantity");
      return;
    }

    const newEntry = { ...formState, UserID: userID } as ConsumeInventoryEntry;
    const updatedEntries = [...entries, newEntry];

    setEntries(updatedEntries);
    localStorage.setItem(
      `pending_consumption_entries_${userID}`,
      JSON.stringify(updatedEntries),
    );

    toast.success("Entry added to pending list");
    setFormState((prev) => ({
      ...prev,
      "Item No.": "",
      Description: "",
      Quantity: 0,
      "Unit of Measure Code": "",
      "Applies-to Entry": undefined,
      "Applies-from Entry": undefined,
    }));
  };

  const handleDeleteEntry = (index: number) => {
    const updatedEntries = entries.filter((_, i) => i !== index);
    setEntries(updatedEntries);
    setSelectedIndices((prev) =>
      prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)),
    );
    localStorage.setItem(
      `pending_consumption_entries_${userID}`,
      JSON.stringify(updatedEntries),
    );
    toast.success("Entry removed from list");
  };

  const handleEditEntry = (entry: ConsumeInventoryEntry, index: number) => {
    setFormState({ ...entry });
    handleDeleteEntry(index);
    toast.info("Entry loaded into form for editing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSelectAll = () => {
    if (selectedIndices.length === entries.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(entries.map((_, i) => i));
    }
  };

  const toggleSelectRow = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const handlePost = () => {
    if (selectedIndices.length === 0) {
      toast.error("Please select at least one entry to post");
      return;
    }
    setIsConfirmPostOpen(true);
  };

  const executePost = async () => {
    setIsConfirmPostOpen(false);
    setSubmitting(true);
    try {
      const selectedEntries = selectedIndices.map((i) => entries[i]);
      // Bulk insert selected entries first
      await bulkInsertConsumeInventoryEntries(selectedEntries);

      // Then trigger the post API
      const result = await postConsumeInventory(userID!);
      toast.success(result || "Posted successfully");

      // Remove posted entries from state and local storage
      const remainingEntries = entries.filter(
        (_, i) => !selectedIndices.includes(i),
      );
      setEntries(remainingEntries);
      setSelectedIndices([]);
      localStorage.setItem(
        `pending_consumption_entries_${userID}`,
        JSON.stringify(remainingEntries),
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="from-background via-background to-primary/5 border-primary/10 overflow-hidden border border-none bg-gradient-to-br shadow-2xl">
        <div className="from-primary/20 via-primary to-primary/20 absolute top-0 left-0 h-1 w-full bg-gradient-to-r" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Package className="text-primary h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  New Consumption Entry
                </CardTitle>
                <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                  Add items to the pending list for posting
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {submitting && (
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary animate-pulse border-none"
                >
                  Processing...
                </Badge>
              )}
              <Button
                onClick={handleAddEntry}
                disabled={submitting}
                className="font-bold"
                size="sm"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add to List
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Posting Date
              </label>
              <DateInput
                value={formState["Posting Date"]}
                onChange={(v) => handleChange("Posting Date", v)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Entry Type
              </label>
              <div className="group relative">
                <Select
                  value={formState["Entry Type"]}
                  onValueChange={(v) => handleChange("Entry Type", v)}
                >
                  <SelectTrigger className="h-10 w-full pr-8 shadow-sm transition-all focus:ring-1">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Issue">Issue</SelectItem>
                    <SelectItem value="Return">Return</SelectItem>
                  </SelectContent>
                </Select>
                {formState["Entry Type"] && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleChange("Entry Type", "");
                    }}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-7 -translate-y-1/2 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                LOB
              </label>
              <CascadingDimensionSelect
                dimensionType="LOB"
                value={formState["Lob Code"] || ""}
                onChange={(v) => handleChange("Lob Code", v)}
                userId={userID ?? undefined}
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Branch
              </label>
              <CascadingDimensionSelect
                dimensionType="BRANCH"
                value={formState["Branch Code"] || ""}
                onChange={(v) => handleChange("Branch Code", v)}
                lobValue={formState["Lob Code"]}
                userId={userID ?? undefined}
                className="h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Location
              </label>
              <LocationSelect
                value={formState["Location Code"] || ""}
                onChange={(v) => handleChange("Location Code", v)}
                className="h-10"
                branchCode={formState["Branch Code"]}
                disabled={!formState["Lob Code"] || !formState["Branch Code"]}
                placeholder={
                  !formState["Branch Code"]
                    ? "Select Branch First"
                    : "Select Location"
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                UOM
              </label>
              <Input
                className="bg-muted/50 h-10 border-dashed font-medium"
                value={formState["Unit of Measure Code"]}
                disabled
                placeholder="Auto-filled"
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Item Selection
              </label>
              <ItemSelect
                value={formState["Item No."] || ""}
                onChange={(v, item) => {
                  setFormState((prev) => ({
                    ...prev,
                    "Item No.": v,
                    Description: item?.Description || "",
                    "Unit of Measure Code": item?.Base_Unit_of_Measure || "",
                    "Applies-to Entry": undefined,
                    "Applies-from Entry": undefined,
                  }));
                }}
                className="h-10"
                locationCode={formState["Location Code"]}
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Quantity
              </label>
              <Input
                type="number"
                className="text-primary h-10 font-mono text-lg font-bold shadow-sm focus:ring-1"
                value={formState.Quantity}
                onChange={(e) =>
                  handleChange("Quantity", parseFloat(e.target.value) || 0)
                }
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Employee
              </label>
              <DimensionSelect
                dimensionType="EMPLOYEE"
                value={formState["Employee Code"] || ""}
                onChange={(v) => handleChange("Employee Code", v)}
                className="h-10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Assignment
              </label>
              <DimensionSelect
                dimensionType="ASSIGNMENT"
                value={formState["Assignment Code"] || ""}
                onChange={(v) => handleChange("Assignment Code", v)}
                className="h-10"
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider text-blue-400 uppercase">
                Apply to Entry
              </label>
              <div className="group relative">
                <Input
                  className="bg-muted/30 h-10 cursor-pointer border-dashed pr-10 font-medium"
                  value={formState["Applies-to Entry"] || ""}
                  placeholder={
                    formState["Item No."]
                      ? "Click to select"
                      : "Select Item first"
                  }
                  readOnly
                  onClick={() =>
                    formState["Item No."] && setIsApplyToModalOpen(true)
                  }
                  disabled={!formState["Item No."]}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary absolute top-0 right-0 h-10 w-10"
                  onClick={() =>
                    formState["Item No."] && setIsApplyToModalOpen(true)
                  }
                  disabled={!formState["Item No."]}
                >
                  <Search className="h-4 w-4" />
                </Button>
                {formState["Applies-to Entry"] && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChange("Applies-to Entry", undefined);
                    }}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-9 -translate-y-1/2 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider text-green-400 uppercase">
                Apply From Entry
              </label>
              <div className="group relative">
                <Input
                  className="bg-muted/30 h-10 cursor-pointer border-dashed pr-10 font-medium"
                  value={formState["Applies-from Entry"] || ""}
                  placeholder={
                    formState["Item No."]
                      ? "Click to select"
                      : "Select Item first"
                  }
                  readOnly
                  onClick={() =>
                    formState["Item No."] && setIsApplyFromModalOpen(true)
                  }
                  disabled={!formState["Item No."]}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary absolute top-0 right-0 h-10 w-10"
                  onClick={() =>
                    formState["Item No."] && setIsApplyFromModalOpen(true)
                  }
                  disabled={!formState["Item No."]}
                >
                  <Search className="h-4 w-4" />
                </Button>
                {formState["Applies-from Entry"] && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChange("Applies-from Entry", undefined);
                    }}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-9 -translate-y-1/2 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <LedgerEntryModal
            isOpen={isApplyToModalOpen}
            onClose={() => setIsApplyToModalOpen(false)}
            entries={applyToEntries}
            onSelect={(entry) =>
              handleChange("Applies-to Entry", entry.Entry_No)
            }
            title={`Select Apply-to Entry for ${formState["Item No."]}`}
            isLoading={loadingApplyTo}
          />

          <LedgerEntryModal
            isOpen={isApplyFromModalOpen}
            onClose={() => setIsApplyFromModalOpen(false)}
            entries={applyFromEntries}
            onSelect={(entry) =>
              handleChange("Applies-from Entry", entry.Entry_No)
            }
            title={`Select Apply-from Entry for ${formState["Item No."]}`}
            isLoading={loadingApplyFrom}
          />
        </CardContent>
      </Card>

      <Card className="bg-background/40 border-border/50 flex min-h-[500px] flex-1 flex-col overflow-hidden border border-none shadow-2xl backdrop-blur-xl">
        <CardHeader className="bg-muted/20 flex flex-row items-center justify-between border-b px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-2">
              <Info className="text-primary h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Pending List
              </CardTitle>
              <p className="text-muted-foreground text-xs font-medium">
                {selectedIndices.length} of {entries.length} items selected for
                posting
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedIndices.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIndices([])}
                className="text-xs font-bold"
              >
                Clear Selection
              </Button>
            )}
            <Button
              variant="default"
              size="lg"
              onClick={handlePost}
              disabled={submitting || selectedIndices.length === 0}
              className="px-8 font-bold"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Send className="mr-2 h-5 w-5" />
              )}
              Post Consumption ({selectedIndices.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-x-auto p-0">
          <Table className="min-w-[1500px]">
            <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-b-2 hover:bg-transparent">
                <TableHead className="w-[50px] py-4 text-center">
                  <Checkbox
                    checked={
                      entries.length > 0 &&
                      selectedIndices.length === entries.length
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="py-4 text-xs font-bold tracking-wider uppercase">
                  Posting Date
                </TableHead>
                <TableHead className="py-4 text-xs font-bold tracking-wider uppercase">
                  Type
                </TableHead>
                <TableHead className="py-4 text-xs font-bold tracking-wider uppercase">
                  LOB
                </TableHead>
                <TableHead className="py-4 text-xs font-bold tracking-wider uppercase">
                  Branch
                </TableHead>
                <TableHead className="py-4 text-xs font-bold tracking-wider uppercase">
                  Location
                </TableHead>
                <TableHead className="py-4 text-xs font-bold tracking-wider uppercase">
                  UOM
                </TableHead>
                <TableHead className="py-4 text-xs font-bold tracking-wider uppercase">
                  Item No.
                </TableHead>
                <TableHead className="py-4 text-right text-xs font-bold tracking-wider uppercase">
                  Quantity
                </TableHead>
                <TableHead className="py-4 text-xs font-bold tracking-wider uppercase">
                  Employee
                </TableHead>
                <TableHead className="py-4 text-xs font-bold tracking-wider uppercase">
                  Assignment
                </TableHead>
                <TableHead className="py-4 text-xs font-bold tracking-wider uppercase">
                  Applies-to
                </TableHead>
                <TableHead className="py-4 text-xs font-bold tracking-wider uppercase">
                  Applies-from
                </TableHead>
                <TableHead className="w-[60px] py-4 text-center uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={14} className="h-64 text-center">
                    <div className="text-muted-foreground flex flex-col items-center gap-3">
                      <Loader2 className="text-primary/40 h-10 w-10 animate-spin" />
                      <p className="text-sm font-medium">
                        Fetching pending entries...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="h-64 text-center">
                    <div className="text-muted-foreground/50 flex flex-col items-center gap-4">
                      <Package className="h-16 w-16 opacity-20" />
                      <p className="text-base font-medium italic">
                        No entries in the pending list
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, index) => (
                  <TableRow
                    key={index}
                    className={`group border-b transition-colors last:border-none ${
                      selectedIndices.includes(index)
                        ? "bg-primary/[0.04]"
                        : "hover:bg-primary/[0.02]"
                    }`}
                  >
                    <TableCell className="text-center">
                      <Checkbox
                        checked={selectedIndices.includes(index)}
                        onCheckedChange={() => toggleSelectRow(index)}
                        aria-label={`Select row ${index + 1}`}
                      />
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {entry["Posting Date"]}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry["Entry Type"] === "Issue"
                            ? "destructive"
                            : "outline"
                        }
                        className="text-[10px] uppercase"
                      >
                        {entry["Entry Type"]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-bold">
                      {entry["Lob Code"]}
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry["Branch Code"]}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-primary/5 text-primary border-none text-[10px]"
                      >
                        {entry["Location Code"]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[10px] font-bold">
                      {entry["Unit of Measure Code"]}
                    </TableCell>
                    <TableCell className="text-sm font-bold">
                      {entry["Item No."]}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-primary font-mono text-base font-black">
                        {entry.Quantity?.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {entry["Employee Code"] || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {entry["Assignment Code"] || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-blue-400">
                      {entry["Applies-to Entry"] || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-green-400">
                      {entry["Applies-from Entry"] || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem
                            onClick={() => handleEditEntry(entry, index)}
                            className="cursor-pointer"
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteEntry(index)}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isConfirmPostOpen} onOpenChange={setIsConfirmPostOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Send className="text-primary h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-bold">
              Confirm Posting
            </DialogTitle>
            <DialogDescription className="py-2 text-sm leading-relaxed">
              Are you sure you want to post the{" "}
              <span className="text-foreground font-bold">
                {selectedIndices.length} selected items
              </span>{" "}
              to the inventory? This action will update the inventory ledgers
              and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsConfirmPostOpen(false)}
              className="font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={executePost}
              className="px-8 font-bold"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Confirm & Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
