"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Send, Package, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemSelect } from "@/components/forms/transfer-orders/item-select";
import { LocationSelect } from "@/components/forms/shared/location-select";
import { DimensionSelect } from "@/components/forms/dimension-select";
import { CascadingDimensionSelect } from "@/components/forms/cascading-dimension-select";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  createConsumeInventoryEntry,
  postConsumeInventory,
  getConsumeInventoryEntries,
  type ConsumeInventoryEntry,
} from "@/lib/api/services/consume-inventory.service";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function ConsumeInventoryForm() {
  const { userID } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState<ConsumeInventoryEntry[]>([]);
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
  });

  useEffect(() => {
    if (userID) {
      loadEntries();
    }
  }, [userID]);

  const loadEntries = async () => {
    if (!userID) return;
    setLoading(true);
    try {
      const data = await getConsumeInventoryEntries(userID);
      setEntries(data);
    } catch (error) {
      console.error("Error loading entries:", error);
      toast.error("Failed to load entries");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ConsumeInventoryEntry, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddEntry = async () => {
    if (
      !formState["Item No."] ||
      !formState["Location Code"] ||
      !formState.Quantity
    ) {
      toast.error("Please fill in Item, Location and Quantity");
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...formState, UserID: userID };
      await createConsumeInventoryEntry(payload);
      toast.success("Entry added to pending list");
      setFormState((prev) => ({
        ...prev,
        "Item No.": "",
        Description: "",
        Quantity: 0,
        "Unit of Measure Code": "",
      }));
      loadEntries();
    } catch (error: any) {
      toast.error(error.message || "Failed to add entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async () => {
    if (entries.length === 0) {
      toast.error("No entries to post");
      return;
    }

    if (!confirm("Are you sure you want to post these entries?")) return;

    setSubmitting(true);
    try {
      const result = await postConsumeInventory(userID!);
      toast.success(result || "Posted successfully");
      loadEntries();
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-8">
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
              <Select
                value={formState["Entry Type"]}
                onValueChange={(v) => handleChange("Entry Type", v)}
              >
                <SelectTrigger className="h-10 shadow-sm transition-all focus:ring-1">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Issue">Issue</SelectItem>
                  <SelectItem value="Return">Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Location
              </label>
              <LocationSelect
                value={formState["Location Code"] || ""}
                onChange={(v) => handleChange("Location Code", v)}
                className="h-10"
              />
            </div>
            <div className="space-y-1 lg:col-span-2">
              <label className="text-muted-foreground ml-1 text-[11px] font-bold tracking-wider uppercase">
                Item Selection
              </label>
              <ItemSelect
                value={formState["Item No."] || ""}
                onChange={(v, item) => {
                  handleChange("Item No.", v);
                  if (item) {
                    handleChange("Description", item.Description);
                    handleChange(
                      "Unit of Measure Code",
                      item.Base_Unit_of_Measure,
                    );
                  }
                }}
                className="h-10"
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
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background/40 border-border/50 flex min-h-[500px] flex-1 flex-col overflow-hidden border border-none shadow-2xl backdrop-blur-xl">
        <CardHeader className="bg-muted/20 flex flex-row items-center justify-between border-b px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <Info className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Pending List
              </CardTitle>
              <p className="text-muted-foreground text-xs font-medium">
                {entries.length} items ready for posting
              </p>
            </div>
          </div>
          <Button
            variant="default"
            size="lg"
            onClick={handlePost}
            disabled={submitting || entries.length === 0}
            className="px-8 font-bold"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Send className="mr-2 h-5 w-5" />
            )}
            Post Consumption
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-b-2 hover:bg-transparent">
                <TableHead className="w-[140px] py-4 text-xs font-bold tracking-wider uppercase">
                  Posting Date
                </TableHead>
                <TableHead className="py-4 text-xs font-bold tracking-wider uppercase">
                  Document
                </TableHead>
                <TableHead className="py-4 text-xs font-bold tracking-wider uppercase">
                  Item Details
                </TableHead>
                <TableHead className="py-4 text-xs font-bold tracking-wider uppercase">
                  Location
                </TableHead>
                <TableHead className="py-4 text-right text-xs font-bold tracking-wider uppercase">
                  Quantity
                </TableHead>
                <TableHead className="w-[80px] py-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
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
                  <TableCell colSpan={6} className="h-64 text-center">
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
                    className="group hover:bg-primary/[0.03] border-b transition-colors last:border-none"
                  >
                    <TableCell className="text-sm font-medium">
                      {entry["Posting Date"]}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-background font-mono text-[11px]"
                      >
                        {entry["Document No."] || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground text-sm font-bold">
                          {entry["Item No."]}
                        </span>
                        <span className="text-muted-foreground max-w-[250px] truncate text-xs">
                          {entry.Description}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-primary/5 text-primary border-none text-[11px]"
                      >
                        {entry["Location Code"]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-primary font-mono text-base font-black">
                          {entry.Quantity?.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground text-[10px] font-bold uppercase">
                          {entry["Unit of Measure Code"]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9 opacity-0 transition-colors group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
